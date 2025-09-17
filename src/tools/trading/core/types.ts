// Core trading system types and interfaces

export interface TradingSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  reason: string;
  priceTarget?: number;
  stopLoss?: number;
  timestamp: number;
  source: string; // Which agent/strategy generated this signal
}

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  change24h: number;
  timestamp: number;
  high24h: number;
  low24h: number;
  marketCap?: number;
}

export interface TradingPosition {
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  entryTimestamp: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface TradingOrder {
  id: string;
  symbol: string;
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'FAILED';
  timestamp: number;
  fillPrice?: number;
  executionTimestamp?: number;
}

export interface ReinforcementData {
  action: string;
  outcome: 'POSITIVE' | 'NEGATIVE';
  reward: number;
  context: Record<string, unknown>;
  timestamp: number;
}

export interface PatternData {
  pattern: string;
  confidence: number;
  timeframe: string;
  symbol: string;
  prediction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timestamp: number;
}

export interface TradingConfig extends Record<string, unknown> {
  maxPositionSize: number;
  riskPerTrade: number; // percentage
  stopLossPercentage: number;
  takeProfitPercentage: number;
  maxOpenPositions: number;
  tradingFrequency: number; // seconds between cycles
  enablePatternRecognition: boolean;
  enableReinforcementLearning: boolean;
  enablePredictiveAnalysis: boolean;
}

export interface AgentState {
  id: string;
  type: string;
  isActive: boolean;
  lastUpdate: number;
  performanceMetrics: {
    totalTrades: number;
    profitableTrades: number;
    totalPnL: number;
    winRate: number;
    averageReturn: number;
  };
  config: TradingConfig;
}

export interface TradingSystemState {
  isRunning: boolean;
  agents: Record<string, AgentState>;
  positions: TradingPosition[];
  orders: TradingOrder[];
  totalPnL: number;
  totalTrades: number;
  startTime: number;
  lastUpdate: number;
}