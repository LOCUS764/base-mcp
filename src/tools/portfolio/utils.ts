import type { EvmWalletProvider } from '@coinbase/agentkit';
import { erc20Abi, formatUnits } from 'viem';
import type { Portfolio, Position, PortfolioAnalytics } from './types.js';

/**
 * Parse and validate portfolio data
 */
export function parsePortfolio(rawData: unknown): Portfolio | null {
  try {
    const data = rawData as Portfolio;
    
    if (!data.walletAddress || !data.positions || !Array.isArray(data.positions)) {
      return null;
    }

    // Validate each position
    const validPositions = data.positions.filter(
      (pos) =>
        pos.symbol &&
        pos.amount &&
        pos.valueUsd &&
        typeof pos.percentOfPortfolio === 'number',
    );

    if (validPositions.length === 0) {
      return null;
    }

    return {
      timestamp: data.timestamp || new Date().toISOString(),
      walletAddress: data.walletAddress,
      positions: validPositions,
      totalValueUsd: data.totalValueUsd,
      chainId: data.chainId || 8453, // Default to Base mainnet
    };
  } catch (error) {
    console.error('Error parsing portfolio:', error);
    return null;
  }
}

/**
 * Get portfolio for a wallet address
 */
export async function getWalletPortfolio(
  walletProvider: EvmWalletProvider,
  walletAddress?: string,
): Promise<Portfolio> {
  const address = walletAddress || walletProvider.getAddress();
  
  if (!address) {
    throw new Error('No wallet address provided');
  }

  const chainId = Number(walletProvider.getNetwork().chainId);

  // Get native token balance (ETH on Base)
  const nativeBalance = await walletProvider.getBalance();
  
  const positions: Position[] = [];
  
  // Add native token (ETH) position
  if (nativeBalance > 0n) {
    const ethAmount = formatUnits(nativeBalance, 18);
    // Simplified: would need price oracle in production
    const ethPriceUsd = 2000; // Placeholder
    const valueUsd = (parseFloat(ethAmount) * ethPriceUsd).toFixed(2);
    
    positions.push({
      symbol: 'ETH',
      amount: ethAmount,
      valueUsd,
      decimals: 18,
      percentOfPortfolio: 0, // Will calculate below
      priceUsd: ethPriceUsd.toString(),
    });
  }

  // Common Base tokens to check
  const commonTokens = [
    { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    { symbol: 'USDbC', address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 },
    { symbol: 'DAI', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18 },
  ];

  for (const token of commonTokens) {
    try {
      const balance = await walletProvider.readContract({
        address: token.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      });

      if (balance && typeof balance === 'bigint' && balance > 0n) {
        const amount = formatUnits(balance, token.decimals);
        const valueUsd = amount; // For stablecoins, 1:1 USD

        positions.push({
          symbol: token.symbol,
          contractAddress: token.address,
          amount,
          valueUsd,
          decimals: token.decimals,
          percentOfPortfolio: 0,
          priceUsd: '1.00',
        });
      }
    } catch (error) {
      // Token might not exist or error reading, skip
      console.error(`Error reading ${token.symbol} balance:`, error);
    }
  }

  // Calculate total value and percentages
  const totalValueUsd = positions.reduce(
    (sum, pos) => sum + parseFloat(pos.valueUsd),
    0,
  );

  positions.forEach((pos) => {
    pos.percentOfPortfolio =
      (parseFloat(pos.valueUsd) / totalValueUsd) * 100;
  });

  return {
    timestamp: new Date().toISOString(),
    walletAddress: address,
    positions,
    totalValueUsd: totalValueUsd.toFixed(2),
    chainId,
  };
}

/**
 * Analyze portfolio and provide insights
 */
export function analyzePortfolio(portfolio: Portfolio): PortfolioAnalytics {
  if (!portfolio.positions || portfolio.positions.length === 0) {
    throw new Error('Portfolio has no positions to analyze');
  }

  // Find largest position
  const largestPosition = portfolio.positions.reduce((max, pos) =>
    parseFloat(pos.valueUsd) > parseFloat(max.valueUsd) ? pos : max,
  );

  // Calculate diversification score (0-100, higher is more diversified)
  // Based on inverse of Herfindahl index
  const herfindahlIndex = portfolio.positions.reduce(
    (sum, pos) => sum + Math.pow(pos.percentOfPortfolio / 100, 2),
    0,
  );
  const diversificationScore = Math.round((1 - herfindahlIndex) * 100);

  return {
    totalValueUsd: portfolio.totalValueUsd,
    assetCount: portfolio.positions.length,
    largestPosition,
    diversificationScore,
    lastUpdated: portfolio.timestamp,
  };
}
