import { ActionProvider, CreateAction, EvmWalletProvider, type Network } from '@coinbase/agentkit';
import { base } from 'viem/chains';
import { erc20Abi, parseUnits } from 'viem';
import type { z } from 'zod';
import { z as zod } from 'zod';
import { constructBaseScanUrl } from '../utils/index.js';
import { chainIdToChain } from '../../chains.js';

const SwapSchema = zod.object({
  sellToken: zod
    .string()
    .describe(
      'Token to sell. Use ETH for native or a 0x-prefixed token address on Base (e.g., USDC address).',
    ),
  buyToken: zod
    .string()
    .describe(
      'Token to buy. Use ETH for native or a 0x-prefixed token address on Base.',
    ),
  sellAmount: zod
    .string()
    .describe(
      'Human-readable amount of sellToken to sell (e.g., 0.01). Will be converted to atomic units using token decimals.',
    ),
  slippageBps: zod
    .number()
    .int()
    .min(1)
    .max(5000)
    .default(100)
    .describe('Slippage in basis points. Default 100 = 1.00%'),
});

export class BaseMcpSwapActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super('baseMcpSwap', []);
  }

  @CreateAction({
    name: 'swap_tokens',
    description:
      'Swap tokens on Base using the 0x Swap API. Handles ERC20 approvals automatically as needed.',
    schema: SwapSchema,
  })
  async swapTokens(walletProvider: EvmWalletProvider, args: z.infer<typeof SwapSchema>) {
    const network = walletProvider.getNetwork();
    const chainId = Number(network.chainId);
    const chain = chainIdToChain(chainId);

    if (!chain || chain.id !== base.id) {
      throw new Error('swap_tokens is only supported on Base Mainnet (chainId 8453)');
    }

    const takerAddress = walletProvider.getAddress() as `0x${string}`;

    // Resolve sell amount in atomic units
    let decimals = 18; // ETH default
    const isEthSell = args.sellToken.toUpperCase() === 'ETH';
    if (!isEthSell) {
      // Read decimals from token contract
      const tokenAddress = args.sellToken as `0x${string}`;
      decimals = Number(
        await walletProvider.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'decimals',
        }),
      );
    }

    const sellAmountAtomic = parseUnits(args.sellAmount, decimals);

    // Build 0x Base API quote
    const slippagePct = (args.slippageBps ?? 100) / 10_000; // e.g., 0.01 for 1%
    const params = new URLSearchParams({
      sellToken: args.sellToken,
      buyToken: args.buyToken,
      sellAmount: sellAmountAtomic.toString(),
      takerAddress,
      slippagePercentage: String(slippagePct),
    });

    const url = `https://base.api.0x.org/swap/v1/quote?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`0x quote error: ${res.status} ${res.statusText} - ${text}`);
    }

    const quote = (await res.json()) as {
      to: `0x${string}`;
      data: `0x${string}`;
      value?: string;
      allowanceTarget?: `0x${string}`;
      buyAmount?: string;
      sellAmount?: string;
      estimatedGas?: string;
    };

    // If selling ERC20, ensure approval to allowanceTarget
    if (!isEthSell) {
      const tokenAddress = args.sellToken as `0x${string}`;
      const allowanceTarget = quote.allowanceTarget as `0x${string}` | undefined;
      if (!allowanceTarget) {
        throw new Error('0x quote missing allowanceTarget for ERC20 sell');
      }

      const currentAllowance = (await walletProvider.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [takerAddress, allowanceTarget],
      })) as bigint;

      if (currentAllowance < sellAmountAtomic) {
        // Approve exact amount to minimize risk
        await walletProvider.sendTransaction({
          to: tokenAddress,
          data: (await (async () => {
            // encode approve(token, amount)
            // We avoid importing encodeFunctionData again; construct via viem by calling
            // sendTransaction with ERC20 approve selector and args
            const selector = '0x095ea7b3'; // approve(address,uint256)
            const paddedSpender = allowanceTarget.replace('0x', '').padStart(64, '0');
            const paddedAmount = sellAmountAtomic.toString(16).padStart(64, '0');
            return `${selector}${paddedSpender}${paddedAmount}` as `0x${string}`;
          })()),
          value: 0n,
        });
      }
    }

    // Execute the swap
    const txHash = await walletProvider.sendTransaction({
      to: quote.to,
      data: quote.data,
      value: BigInt(quote.value ?? '0'),
    });

    const link = constructBaseScanUrl(chain, txHash);

    const summary = {
      hash: txHash,
      url: link,
      sellToken: args.sellToken,
      buyToken: args.buyToken,
      sellAmount: args.sellAmount,
      slippageBps: args.slippageBps ?? 100,
    };

    return JSON.stringify(summary);
  }

  supportsNetwork(network: Network): boolean {
    return network.chainId === String(base.id);
  }
}

export const baseMcpSwapActionProvider = () => new BaseMcpSwapActionProvider();
