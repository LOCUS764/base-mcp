// Base trading agent class with common functionality

import type { EvmWalletProvider } from '@coinbase/agentkit';
import type { 
  TradingSignal, 
  AgentState, 
  TradingConfig, 
  MarketData,
  TradingOrder 
} from '../core/types.js';
import { MarketDataService } from '../core/market-data.js';
import { TradeExecutor } from '../core/trade-executor.js';
import { ReinforcementLearningEngine } from '../ml/reinforcement-learning.js';

export abstract class BaseTradingAgent {
  protected state: AgentState;
  protected config: TradingConfig;
  protected marketDataService: MarketDataService;
  protected tradeExecutor: TradeExecutor;
  protected rlEngine: ReinforcementLearningEngine;
  protected isRunning = false;
  protected intervalId?: NodeJS.Timeout;

  constructor(
    protected agentId: string,
    protected agentType: string,
    protected walletProvider: EvmWalletProvider,
    config: Partial<TradingConfig> = {}
  ) {
    this.config = {
      maxPositionSize: 1000, // $1000 max position
      riskPerTrade: 0.02, // 2% risk per trade
      stopLossPercentage: 0.05, // 5% stop loss
      takeProfitPercentage: 0.10, // 10% take profit
      maxOpenPositions: 5,
      tradingFrequency: 30, // 30 seconds
      enablePatternRecognition: true,
      enableReinforcementLearning: true,
      enablePredictiveAnalysis: true,
      ...config,
    };

    this.state = {
      id: agentId,
      type: agentType,
      isActive: false,
      lastUpdate: Date.now(),
      performanceMetrics: {
        totalTrades: 0,
        profitableTrades: 0,
        totalPnL: 0,
        winRate: 0,
        averageReturn: 0,
      },
      config: this.config,
    };

    this.marketDataService = new MarketDataService();
    this.tradeExecutor = new TradeExecutor(walletProvider, this.marketDataService);
    this.rlEngine = new ReinforcementLearningEngine();

    console.log(`${this.agentType} agent ${this.agentId} initialized`);
  }

  // Abstract methods that must be implemented by specific agents
  abstract generateSignals(): Promise<TradingSignal[]>;
  abstract getWatchedSymbols(): string[];

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`Agent ${this.agentId} is already running`);
      return;
    }

    this.isRunning = true;
    this.state.isActive = true;
    this.state.lastUpdate = Date.now();

    console.log(`Starting ${this.agentType} agent ${this.agentId}`);

    // Start the main trading loop
    this.intervalId = setInterval(async () => {
      try {
        await this.tradingCycle();
      } catch (error) {
        console.error(`Trading cycle error in agent ${this.agentId}:`, error);
        await this.handleError(error);
      }
    }, this.config.tradingFrequency * 1000);

    // Initial trading cycle
    await this.tradingCycle();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log(`Stopping ${this.agentType} agent ${this.agentId}`);
    
    this.isRunning = false;
    this.state.isActive = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Save RL model before stopping
    this.rlEngine.saveModel();
  }

  private async tradingCycle(): Promise<void> {
    try {
      // Generate trading signals
      const signals = await this.generateSignals();
      
      if (signals.length === 0) {
        return;
      }

      // Process each signal
      for (const signal of signals) {
        await this.processSignal(signal);
      }

      // Update agent state
      this.updateState();

    } catch (error) {
      console.error(`Trading cycle error in ${this.agentId}:`, error);
      throw error;
    }
  }

  protected async processSignal(signal: TradingSignal): Promise<void> {
    try {
      // Apply reinforcement learning optimization if enabled
      let optimizedSignal = signal;
      if (this.config.enableReinforcementLearning) {
        optimizedSignal = this.rlEngine.optimizeSignal(signal);
      }

      // Check if we should execute this signal
      if (!this.shouldExecuteSignal(optimizedSignal)) {
        console.log(`Skipping signal for ${optimizedSignal.symbol}: ${optimizedSignal.reason}`);
        return;
      }

      // Calculate position size
      const positionSize = this.calculatePositionSize(optimizedSignal);
      
      if (positionSize <= 0) {
        console.log(`Position size too small for ${optimizedSignal.symbol}`);
        return;
      }

      // Execute the signal
      const order = await this.tradeExecutor.executeSignal(optimizedSignal, positionSize);
      
      console.log(`Agent ${this.agentId} executed order:`, {
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        price: order.price,
        status: order.status,
      });

      // Track performance if order was filled
      if (order.status === 'FILLED') {
        this.updatePerformanceMetrics(order);
      }

      // Schedule outcome tracking for reinforcement learning
      if (order.status === 'FILLED' && this.config.enableReinforcementLearning) {
        this.scheduleOutcomeTracking(optimizedSignal, order);
      }

    } catch (error) {
      console.error(`Error processing signal for ${signal.symbol}:`, error);
    }
  }

  protected shouldExecuteSignal(signal: TradingSignal): boolean {
    // Check confidence threshold
    if (signal.confidence < 60) {
      return false;
    }

    // Check if we have too many open positions
    const currentPositions = this.tradeExecutor.getPendingOrders().length;
    if (currentPositions >= this.config.maxOpenPositions) {
      return false;
    }

    // Check for recent signals on the same symbol to avoid over-trading
    // (This would be implemented with a signal history tracking system)

    return true;
  }

  protected calculatePositionSize(signal: TradingSignal): number {
    // Calculate position size based on risk management rules
    const baseSize = this.config.maxPositionSize;
    const riskAdjustment = this.config.riskPerTrade;
    const confidenceAdjustment = signal.confidence / 100;

    // Adjust size based on confidence and recent performance
    let adjustedSize = baseSize * riskAdjustment * confidenceAdjustment;

    // Apply performance-based adjustments
    const winRate = this.state.performanceMetrics.winRate;
    if (winRate > 0.7) {
      adjustedSize *= 1.2; // Increase size for good performance
    } else if (winRate < 0.4) {
      adjustedSize *= 0.7; // Decrease size for poor performance
    }

    return Math.max(10, Math.min(adjustedSize, this.config.maxPositionSize)); // Min $10, max config limit
  }

  protected updatePerformanceMetrics(order: TradingOrder): void {
    this.state.performanceMetrics.totalTrades += 1;
    
    // This would need to be updated when we know the actual outcome
    // For now, we'll update it in the outcome tracking
  }

  protected scheduleOutcomeTracking(signal: TradingSignal, order: TradingOrder): void {
    // Schedule outcome tracking after some time to see the result
    setTimeout(async () => {
      try {
        const outcome = await this.calculateTradeOutcome(order);
        this.rlEngine.recordTradeOutcome(signal, order, outcome);
        
        // Update performance metrics
        if (outcome > 0) {
          this.state.performanceMetrics.profitableTrades += 1;
        }
        this.state.performanceMetrics.totalPnL += outcome;
        this.state.performanceMetrics.winRate = 
          this.state.performanceMetrics.profitableTrades / this.state.performanceMetrics.totalTrades;
        this.state.performanceMetrics.averageReturn = 
          this.state.performanceMetrics.totalPnL / this.state.performanceMetrics.totalTrades;

      } catch (error) {
        console.error('Error tracking trade outcome:', error);
      }
    }, 5 * 60 * 1000); // Track outcome after 5 minutes
  }

  protected async calculateTradeOutcome(order: TradingOrder): Promise<number> {
    // Get current market price and calculate P&L
    const marketData = await this.marketDataService.getMarketData(order.symbol);
    if (!marketData || !order.fillPrice) {
      return 0;
    }

    const currentPrice = marketData.price;
    const entryPrice = order.fillPrice;

    if (order.side === 'BUY') {
      return (currentPrice - entryPrice) / entryPrice;
    } else {
      return (entryPrice - currentPrice) / entryPrice;
    }
  }

  protected updateState(): void {
    this.state.lastUpdate = Date.now();
  }

  protected async handleError(error: any): Promise<void> {
    console.error(`Agent ${this.agentId} encountered error:`, error);
    
    // Implement self-healing mechanisms
    if (error.message.includes('network') || error.message.includes('timeout')) {
      console.log(`Network error detected, reducing trading frequency temporarily`);
      this.config.tradingFrequency *= 1.5; // Slow down trading
    }
    
    if (error.message.includes('insufficient')) {
      console.log(`Insufficient funds detected, reducing position sizes`);
      this.config.maxPositionSize *= 0.8; // Reduce position sizes
    }

    // If too many errors, temporarily stop the agent
    // (Would implement error counting and circuit breaker logic)
  }

  // Public interface methods
  getState(): AgentState {
    return { ...this.state };
  }

  updateConfig(newConfig: Partial<TradingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.state.config = this.config;
    console.log(`Agent ${this.agentId} config updated`);
  }

  async getMarketData(symbol: string): Promise<MarketData | null> {
    return await this.marketDataService.getMarketData(symbol);
  }

  getPerformanceReport(): {
    agent: string;
    performance: AgentState['performanceMetrics'];
    rlMetrics: any;
  } {
    return {
      agent: this.agentId,
      performance: this.state.performanceMetrics,
      rlMetrics: this.rlEngine.getPerformanceMetrics(),
    };
  }
}