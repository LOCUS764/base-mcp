// Aggressive Oracle trading agent - high-frequency, high-confidence trading

import type { EvmWalletProvider } from '@coinbase/agentkit';
import type { TradingSignal, TradingConfig } from '../core/types.js';
import { BaseTradingAgent } from './base-agent.js';
import { PatternRecognitionEngine } from '../ml/pattern-recognition.js';
import { PricePredictionEngine } from '../ml/price-prediction.js';

export class AggressiveOracleAgent extends BaseTradingAgent {
  private patternEngine: PatternRecognitionEngine;
  private predictionEngine: PricePredictionEngine;
  private readonly WATCHED_SYMBOLS = ['ETH', 'BTC', 'USDC', 'ADA', 'LTC', 'BCH'];

  constructor(
    walletProvider: EvmWalletProvider,
    config: Partial<TradingConfig> = {}
  ) {
    const aggressiveConfig: Partial<TradingConfig> = {
      tradingFrequency: 15, // Every 15 seconds
      riskPerTrade: 0.03, // 3% risk per trade
      maxPositionSize: 2000, // $2000 max position
      stopLossPercentage: 0.03, // 3% stop loss (tighter)
      takeProfitPercentage: 0.08, // 8% take profit
      ...config,
    };

    super('aggressive-oracle-001', 'AggressiveOracle', walletProvider, aggressiveConfig);
    
    this.patternEngine = new PatternRecognitionEngine();
    this.predictionEngine = new PricePredictionEngine();
    
    // Start feeding market data to ML engines
    this.initializeDataFeeds();
  }

  private async initializeDataFeeds(): Promise<void> {
    // Feed historical data to ML engines
    setInterval(async () => {
      for (const symbol of this.WATCHED_SYMBOLS) {
        try {
          const marketData = await this.getMarketData(symbol);
          if (marketData) {
            this.patternEngine.addMarketData(marketData);
            this.predictionEngine.addMarketData(marketData);
          }
        } catch (error) {
          console.error(`Error feeding data for ${symbol}:`, error);
        }
      }
    }, 10000); // Update every 10 seconds
  }

  async generateSignals(): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    try {
      // Get high-volume trading opportunities
      const topPairs = await this.marketDataService.getTopVolumePairs(15);
      const highVolumeSymbols = topPairs
        .filter(pair => pair.volume > 1000000) // Min $1M volume
        .map(pair => pair.symbol)
        .slice(0, 10); // Top 10

      // Combine watched symbols with high-volume symbols
      const targetSymbols = [...new Set([...this.WATCHED_SYMBOLS, ...highVolumeSymbols])];

      // Generate signals from multiple sources
      const patternSignals = await this.generatePatternSignals(targetSymbols);
      const predictiveSignals = await this.generatePredictiveSignals(targetSymbols);
      const momentumSignals = await this.generateMomentumSignals(targetSymbols);
      const arbitrageSignals = await this.generateArbitrageSignals(targetSymbols);

      signals.push(...patternSignals, ...predictiveSignals, ...momentumSignals, ...arbitrageSignals);

      // Filter and rank signals by confidence and potential
      const filteredSignals = this.filterAndRankSignals(signals);

      console.log(`Aggressive Oracle generated ${filteredSignals.length} signals from ${signals.length} candidates`);
      
      return filteredSignals;

    } catch (error) {
      console.error('Error generating aggressive oracle signals:', error);
      return [];
    }
  }

  private async generatePatternSignals(symbols: string[]): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    for (const symbol of symbols) {
      try {
        const patterns = this.patternEngine.analyzePatterns(symbol);
        const patternSignals = this.patternEngine.generateTradingSignalsFromPatterns(patterns);
        
        // Boost confidence for aggressive trading
        const boostedSignals = patternSignals.map(signal => ({
          ...signal,
          confidence: Math.min(95, signal.confidence + 10), // Boost confidence by 10%
          reason: `[AGGRESSIVE] ${signal.reason}`,
          source: 'AggressiveOracle-Patterns',
        }));

        signals.push(...boostedSignals);
      } catch (error) {
        console.error(`Pattern analysis error for ${symbol}:`, error);
      }
    }

    return signals;
  }

  private async generatePredictiveSignals(symbols: string[]): Promise<TradingSignal[]> {
    try {
      const predictiveSignals = await this.predictionEngine.generatePredictiveSignals(symbols);
      
      // Apply aggressive filters - only take high-confidence predictions
      return predictiveSignals
        .filter(signal => signal.confidence >= 75)
        .map(signal => ({
          ...signal,
          confidence: Math.min(95, signal.confidence + 5), // Small boost for aggressive trading
          reason: `[AGGRESSIVE] ${signal.reason}`,
          source: 'AggressiveOracle-Prediction',
        }));
    } catch (error) {
      console.error('Predictive signal generation error:', error);
      return [];
    }
  }

  private async generateMomentumSignals(symbols: string[]): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    for (const symbol of symbols) {
      try {
        const marketData = await this.getMarketData(symbol);
        if (!marketData) continue;

        // Strong momentum detection
        const change24h = marketData.change24h;
        const volume = marketData.volume;
        const avgVolume = volume; // Would need historical average

        // High momentum conditions
        if (Math.abs(change24h) > 8 && volume > avgVolume * 1.5) {
          const action = change24h > 0 ? 'BUY' : 'SELL';
          const confidence = Math.min(95, Math.abs(change24h) * 5 + 70);

          signals.push({
            symbol,
            action,
            confidence,
            reason: `[AGGRESSIVE] Strong momentum: ${change24h.toFixed(2)}% with high volume`,
            timestamp: Date.now(),
            source: 'AggressiveOracle-Momentum',
          });
        }

        // Breakout momentum
        if (Math.abs(change24h) > 15) { // Major breakout
          const action = change24h > 0 ? 'BUY' : 'SELL';
          
          signals.push({
            symbol,
            action,
            confidence: 90,
            reason: `[AGGRESSIVE] Major breakout: ${change24h.toFixed(2)}%`,
            priceTarget: marketData.price * (1 + (change24h > 0 ? 0.1 : -0.1)),
            stopLoss: marketData.price * (1 + (change24h > 0 ? -0.05 : 0.05)),
            timestamp: Date.now(),
            source: 'AggressiveOracle-Breakout',
          });
        }

      } catch (error) {
        console.error(`Momentum analysis error for ${symbol}:`, error);
      }
    }

    return signals;
  }

  private async generateArbitrageSignals(symbols: string[]): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    // Look for quick arbitrage opportunities
    // This is a simplified version - real arbitrage would need multiple exchange data
    
    for (const symbol of symbols) {
      try {
        const marketData = await this.getMarketData(symbol);
        if (!marketData) continue;

        // Check for unusual price gaps or rapid price changes that might indicate opportunities
        const volatility = Math.abs(marketData.change24h);
        
        if (volatility > 5 && volatility < 20) { // Sweet spot for quick trades
          // Look for mean reversion opportunities
          const action = marketData.change24h > 0 ? 'SELL' : 'BUY'; // Counter-trend
          
          signals.push({
            symbol,
            action,
            confidence: 75,
            reason: `[AGGRESSIVE] Mean reversion opportunity: ${marketData.change24h.toFixed(2)}%`,
            priceTarget: marketData.price * (1 + (action === 'BUY' ? 0.03 : -0.03)),
            stopLoss: marketData.price * (1 + (action === 'BUY' ? -0.02 : 0.02)),
            timestamp: Date.now(),
            source: 'AggressiveOracle-Arbitrage',
          });
        }

      } catch (error) {
        console.error(`Arbitrage analysis error for ${symbol}:`, error);
      }
    }

    return signals;
  }

  private filterAndRankSignals(signals: TradingSignal[]): TradingSignal[] {
    // Remove duplicate signals for the same symbol
    const signalMap = new Map<string, TradingSignal>();
    
    signals.forEach(signal => {
      const existing = signalMap.get(signal.symbol);
      if (!existing || signal.confidence > existing.confidence) {
        signalMap.set(signal.symbol, signal);
      }
    });

    // Convert back to array and sort by confidence
    const uniqueSignals = Array.from(signalMap.values());
    
    return uniqueSignals
      .filter(signal => signal.confidence >= 70) // Aggressive minimum threshold
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8); // Top 8 signals for aggressive trading
  }

  getWatchedSymbols(): string[] {
    return this.WATCHED_SYMBOLS;
  }

  // Override position sizing for more aggressive trading
  protected calculatePositionSize(signal: TradingSignal): number {
    const baseSize = super.calculatePositionSize(signal);
    
    // Increase position size for very high confidence signals
    if (signal.confidence >= 90) {
      return Math.min(baseSize * 1.5, this.config.maxPositionSize);
    }
    
    // Standard aggressive sizing
    return baseSize;
  }

  // Override signal filtering for more aggressive execution
  protected shouldExecuteSignal(signal: TradingSignal): boolean {
    // Lower threshold for aggressive trading
    if (signal.confidence < 65) {
      return false;
    }

    // Allow more positions for aggressive trading
    const currentPositions = this.tradeExecutor.getPendingOrders().length;
    if (currentPositions >= this.config.maxOpenPositions * 1.5) {
      return false;
    }

    return true;
  }
}