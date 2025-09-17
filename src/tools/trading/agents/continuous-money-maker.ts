// Continuous Money Maker agent - focuses on compound gains and consistency

import type { EvmWalletProvider } from '@coinbase/agentkit';
import type { TradingSignal, TradingConfig } from '../core/types.js';
import { BaseTradingAgent } from './base-agent.js';

export class ContinuousMoneyMakerAgent extends BaseTradingAgent {
  private readonly STABLE_PAIRS = ['ETH', 'BTC', 'USDC'];
  private readonly GROWTH_PAIRS = ['ADA', 'LTC', 'UNI', 'AAVE', 'LINK'];
  private compoundingBalance = 1000; // Starting balance for compounding
  private dailyTargetReturn = 0.02; // 2% daily target
  private consecutiveProfits = 0;
  private lastProfitableTradeTime = 0;

  constructor(
    walletProvider: EvmWalletProvider,
    config: Partial<TradingConfig> = {}
  ) {
    const moneyMakerConfig: Partial<TradingConfig> = {
      tradingFrequency: 45, // Every 45 seconds for steady approach
      riskPerTrade: 0.015, // 1.5% risk per trade
      maxPositionSize: 800, // Conservative position sizing
      stopLossPercentage: 0.025, // 2.5% stop loss
      takeProfitPercentage: 0.04, // 4% take profit for consistency
      maxOpenPositions: 3, // Conservative position count
      ...config,
    };

    super('continuous-money-maker-001', 'ContinuousMoneyMaker', walletProvider, moneyMakerConfig);
  }

  async generateSignals(): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    try {
      // Adjust strategy based on recent performance
      this.adaptStrategy();

      // Generate different types of signals based on market conditions
      const consistencySignals = await this.generateConsistencySignals();
      const compoundingSignals = await this.generateCompoundingSignals();
      const safetySignals = await this.generateSafetySignals();

      signals.push(...consistencySignals, ...compoundingSignals, ...safetySignals);

      // Apply money management rules
      const managedSignals = this.applyMoneyManagement(signals);

      console.log(`Continuous Money Maker generated ${managedSignals.length} signals focused on compound gains`);
      
      return managedSignals;

    } catch (error) {
      console.error('Error generating continuous money maker signals:', error);
      return [];
    }
  }

  private adaptStrategy(): void {
    const winRate = this.state.performanceMetrics.winRate;
    const avgReturn = this.state.performanceMetrics.averageReturn;

    // If performing well, slightly increase aggression
    if (winRate > 0.75 && avgReturn > 0.02) {
      this.config.riskPerTrade = Math.min(0.025, this.config.riskPerTrade * 1.1);
      this.config.tradingFrequency = Math.max(30, this.config.tradingFrequency * 0.95);
    }
    
    // If performing poorly, become more conservative
    if (winRate < 0.6 || avgReturn < 0.005) {
      this.config.riskPerTrade = Math.max(0.01, this.config.riskPerTrade * 0.9);
      this.config.tradingFrequency = Math.min(90, this.config.tradingFrequency * 1.1);
    }
  }

  private async generateConsistencySignals(): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    // Focus on stable, high-volume pairs for consistent returns
    for (const symbol of this.STABLE_PAIRS) {
      try {
        const marketData = await this.getMarketData(symbol);
        if (!marketData) continue;

        // Look for low-risk, consistent opportunities
        const volatility = Math.abs(marketData.change24h);
        
        // Prefer moderate movements (2-6%) over extreme volatility
        if (volatility >= 2 && volatility <= 6) {
          const trend = marketData.change24h > 0 ? 'BUY' : 'SELL';
          
          // Calculate confidence based on volume and stability
          const volumeConfidence = Math.min(20, marketData.volume / 1000000); // Volume in millions
          const stabilityConfidence = Math.max(50, 70 - volatility * 3); // Less volatile = more confident
          const confidence = Math.min(85, volumeConfidence + stabilityConfidence);

          if (confidence >= 65) {
            signals.push({
              symbol,
              action: trend,
              confidence,
              reason: `Consistent opportunity: ${volatility.toFixed(2)}% movement with strong volume`,
              priceTarget: marketData.price * (1 + (trend === 'BUY' ? 0.03 : -0.03)),
              stopLoss: marketData.price * (1 + (trend === 'BUY' ? -0.02 : 0.02)),
              timestamp: Date.now(),
              source: 'ContinuousMoneyMaker-Consistency',
            });
          }
        }

        // Mean reversion opportunities on stable pairs
        if (volatility > 8) { // High volatility on stable pairs
          const action = marketData.change24h > 0 ? 'SELL' : 'BUY'; // Counter-trend
          
          signals.push({
            symbol,
            action,
            confidence: 70,
            reason: `Mean reversion on stable pair: ${volatility.toFixed(2)}% deviation`,
            priceTarget: marketData.price * (1 + (action === 'BUY' ? 0.025 : -0.025)),
            stopLoss: marketData.price * (1 + (action === 'BUY' ? -0.015 : 0.015)),
            timestamp: Date.now(),
            source: 'ContinuousMoneyMaker-MeanReversion',
          });
        }

      } catch (error) {
        console.error(`Consistency analysis error for ${symbol}:`, error);
      }
    }

    return signals;
  }

  private async generateCompoundingSignals(): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    // Focus on growth pairs for compounding opportunities
    for (const symbol of this.GROWTH_PAIRS) {
      try {
        const marketData = await this.getMarketData(symbol);
        if (!marketData) continue;

        // Look for compounding opportunities with higher growth potential
        const change24h = marketData.change24h;
        
        // Strong uptrend for compounding
        if (change24h > 5 && change24h < 20) {
          const confidence = Math.min(85, 60 + change24h);
          
          signals.push({
            symbol,
            action: 'BUY',
            confidence,
            reason: `Compounding opportunity: ${change24h.toFixed(2)}% growth with momentum`,
            priceTarget: marketData.price * 1.06, // 6% target for compounding
            stopLoss: marketData.price * 0.975, // 2.5% stop loss
            timestamp: Date.now(),
            source: 'ContinuousMoneyMaker-Compounding',
          });
        }

        // Oversold conditions on growth assets
        if (change24h < -10 && change24h > -25) {
          const confidence = Math.min(80, 50 + Math.abs(change24h));
          
          signals.push({
            symbol,
            action: 'BUY',
            confidence,
            reason: `Oversold compounding opportunity: ${change24h.toFixed(2)}% dip`,
            priceTarget: marketData.price * 1.08, // 8% target for recovery
            stopLoss: marketData.price * 0.95, // 5% stop loss
            timestamp: Date.now(),
            source: 'ContinuousMoneyMaker-Oversold',
          });
        }

      } catch (error) {
        console.error(`Compounding analysis error for ${symbol}:`, error);
      }
    }

    return signals;
  }

  private async generateSafetySignals(): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    // Generate safe-haven signals during market stress
    try {
      // Check overall market sentiment
      const btcData = await this.getMarketData('BTC');
      const ethData = await this.getMarketData('ETH');
      
      if (btcData && ethData) {
        const marketStress = (Math.abs(btcData.change24h) + Math.abs(ethData.change24h)) / 2;
        
        // High market stress - move to safety
        if (marketStress > 10) {
          signals.push({
            symbol: 'USDC',
            action: 'BUY',
            confidence: 80,
            reason: `Market stress detected: ${marketStress.toFixed(2)}% avg volatility - moving to safety`,
            timestamp: Date.now(),
            source: 'ContinuousMoneyMaker-Safety',
          });
        }
        
        // Market recovery - move back to growth
        if (marketStress < 3 && btcData.change24h > 0 && ethData.change24h > 0) {
          signals.push({
            symbol: 'ETH',
            action: 'BUY',
            confidence: 75,
            reason: `Market recovery detected - moving back to growth assets`,
            priceTarget: ethData.price * 1.04,
            stopLoss: ethData.price * 0.98,
            timestamp: Date.now(),
            source: 'ContinuousMoneyMaker-Recovery',
          });
        }
      }

    } catch (error) {
      console.error('Safety signal generation error:', error);
    }

    return signals;
  }

  private applyMoneyManagement(signals: TradingSignal[]): TradingSignal[] {
    // Apply advanced money management rules
    const managedSignals = signals.filter(signal => {
      // Skip if we've had too many recent trades
      if (this.state.performanceMetrics.totalTrades > 0) {
        const timeSinceLastTrade = Date.now() - this.lastProfitableTradeTime;
        if (timeSinceLastTrade < 300000) { // 5 minutes minimum between trades
          return false;
        }
      }

      // Skip low probability trades if we're in a losing streak
      if (this.consecutiveProfits < 0 && signal.confidence < 75) {
        return false;
      }

      return true;
    });

    // Prioritize signals by expected value (confidence * potential return)
    return managedSignals
      .map(signal => {
        const potentialReturn = signal.priceTarget 
          ? Math.abs((signal.priceTarget - (signal as any).currentPrice) / (signal as any).currentPrice)
          : 0.03; // Default 3% expected return
        
        return {
          ...signal,
          expectedValue: (signal.confidence / 100) * potentialReturn,
        };
      })
      .sort((a, b) => (b as any).expectedValue - (a as any).expectedValue)
      .slice(0, 3); // Top 3 signals for focused trading
  }

  getWatchedSymbols(): string[] {
    return [...this.STABLE_PAIRS, ...this.GROWTH_PAIRS];
  }

  // Override position sizing for compounding
  protected calculatePositionSize(signal: TradingSignal): number {
    const baseSize = super.calculatePositionSize(signal);
    
    // Adjust size based on compounding balance
    const compoundingMultiplier = Math.min(2, this.compoundingBalance / 1000);
    
    // Increase size for high-confidence compounding opportunities
    if (signal.source?.includes('Compounding') && signal.confidence >= 80) {
      return Math.min(baseSize * 1.3 * compoundingMultiplier, this.config.maxPositionSize);
    }
    
    // Conservative sizing for safety signals
    if (signal.source?.includes('Safety')) {
      return baseSize * 0.7;
    }
    
    return baseSize * compoundingMultiplier;
  }

  // Track compounding performance
  protected async calculateTradeOutcome(order: any): Promise<number> {
    const outcome = await super.calculateTradeOutcome(order);
    
    if (outcome > 0) {
      this.consecutiveProfits += 1;
      this.lastProfitableTradeTime = Date.now();
      this.compoundingBalance *= (1 + outcome);
      
      // Positive reinforcement for profitable patterns
      if (this.config.enableReinforcementLearning) {
        this.rlEngine.reinforceSuccessfulPattern(
          'CONTINUOUS_PROFIT',
          order.symbol,
          outcome
        );
      }
    } else {
      this.consecutiveProfits = Math.max(-3, this.consecutiveProfits - 1);
      this.compoundingBalance *= (1 + outcome);
    }
    
    console.log(`Compounding balance: $${this.compoundingBalance.toFixed(2)}, Consecutive profits: ${this.consecutiveProfits}`);
    
    return outcome;
  }

  // Public method to get compounding status
  getCompoundingStatus(): {
    balance: number;
    consecutiveProfits: number;
    dailyProgress: number;
    targetReturn: number;
  } {
    const dailyProgress = (this.compoundingBalance - 1000) / 1000; // Progress from starting balance
    
    return {
      balance: this.compoundingBalance,
      consecutiveProfits: this.consecutiveProfits,
      dailyProgress,
      targetReturn: this.dailyTargetReturn,
    };
  }
}