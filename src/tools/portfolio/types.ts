/**
 * Portfolio monitoring types
 */

export type Asset = {
  symbol: string;
  contractAddress?: string;
  amount: string;
  valueUsd: string;
  decimals?: number;
};

export type Position = Asset & {
  percentOfPortfolio: number;
  priceUsd?: string;
};

export type Portfolio = {
  timestamp: string;
  walletAddress: string;
  positions: Position[];
  totalValueUsd: string;
  chainId: number;
};

export type PortfolioSnapshot = Portfolio & {
  id: string;
  createdAt: Date;
};

export type PortfolioAnalytics = {
  totalValueUsd: string;
  assetCount: number;
  largestPosition: Position;
  diversificationScore: number;
  lastUpdated: string;
};
