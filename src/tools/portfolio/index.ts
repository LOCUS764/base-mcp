import {
  ActionProvider,
  CreateAction,
  EvmWalletProvider,
  type Network,
} from '@coinbase/agentkit';
import { base } from 'viem/chains';
import type { z } from 'zod';
import { AnalyzePortfolioSchema, GetPortfolioSchema } from './schemas.js';
import { analyzePortfolio, getWalletPortfolio } from './utils.js';

/**
 * Portfolio Action Provider
 * Provides tools for portfolio monitoring, analysis, and tracking
 */
export class BaseMcpPortfolioActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super('baseMcpPortfolio', []);
  }

  @CreateAction({
    name: 'get_portfolio',
    description:
      'Get the current portfolio for a wallet address, including all token balances and their values',
    schema: GetPortfolioSchema,
  })
  async getPortfolio(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetPortfolioSchema>,
  ) {
    const portfolio = await getWalletPortfolio(
      walletProvider,
      args.walletAddress,
    );

    return JSON.stringify(portfolio, null, 2);
  }

  @CreateAction({
    name: 'analyze_portfolio',
    description:
      'Analyze a portfolio and provide insights including diversification score, largest positions, and total value',
    schema: AnalyzePortfolioSchema,
  })
  async analyzePortfolio(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof AnalyzePortfolioSchema>,
  ) {
    const portfolio = await getWalletPortfolio(
      walletProvider,
      args.walletAddress,
    );

    const analytics = analyzePortfolio(portfolio);

    return JSON.stringify(analytics, null, 2);
  }

  supportsNetwork(network: Network): boolean {
    return network.chainId === String(base.id);
  }
}

export const baseMcpPortfolioActionProvider = () =>
  new BaseMcpPortfolioActionProvider();
