import { z } from 'zod';

export const GetPortfolioSchema = z.object({
  walletAddress: z
    .string()
    .describe('The wallet address to get portfolio for (optional, defaults to current wallet)'),
});

export const AnalyzePortfolioSchema = z.object({
  walletAddress: z
    .string()
    .describe('The wallet address to analyze (optional, defaults to current wallet)'),
});
