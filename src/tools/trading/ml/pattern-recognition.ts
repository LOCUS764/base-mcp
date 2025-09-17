// Pattern recognition system for identifying trading opportunities

import type { MarketData, PatternData, TradingSignal } from '../core/types.js';

export class PatternRecognitionEngine {
  private priceHistory: Map<string, number[]> = new Map();
  private volumeHistory: Map<string, number[]> = new Map();
  private readonly HISTORY_LENGTH = 100; // Keep last 100 data points

  constructor() {
    console.log('Pattern Recognition Engine initialized');
  }

  addMarketData(data: MarketData): void {
    const symbol = data.symbol;
    
    // Update price history
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }
    const prices = this.priceHistory.get(symbol)!;
    prices.push(data.price);
    if (prices.length > this.HISTORY_LENGTH) {
      prices.shift();
    }

    // Update volume history
    if (!this.volumeHistory.has(symbol)) {
      this.volumeHistory.set(symbol, []);
    }
    const volumes = this.volumeHistory.get(symbol)!;
    volumes.push(data.volume);
    if (volumes.length > this.HISTORY_LENGTH) {
      volumes.shift();
    }
  }

  analyzePatterns(symbol: string): PatternData[] {
    const patterns: PatternData[] = [];
    const prices = this.priceHistory.get(symbol);
    const volumes = this.volumeHistory.get(symbol);

    if (!prices || prices.length < 20) {
      return patterns; // Need at least 20 data points
    }

    // Detect various patterns
    patterns.push(...this.detectTrendPatterns(symbol, prices));
    patterns.push(...this.detectSupportResistanceBreakouts(symbol, prices));
    patterns.push(...this.detectVolumePatterns(symbol, prices, volumes || []));
    patterns.push(...this.detectCandlestickPatterns(symbol, prices));
    patterns.push(...this.detectMomentumPatterns(symbol, prices));

    return patterns.filter(pattern => pattern.confidence > 60); // Only return high-confidence patterns
  }

  private detectTrendPatterns(symbol: string, prices: number[]): PatternData[] {
    const patterns: PatternData[] = [];
    const recentPrices = prices.slice(-20); // Last 20 data points
    
    // Calculate trend strength using linear regression
    const trend = this.calculateTrend(recentPrices);
    
    if (Math.abs(trend.slope) > 0.001) { // Significant trend
      const confidence = Math.min(95, Math.abs(trend.slope) * 10000 + trend.rSquared * 50);
      
      patterns.push({
        pattern: trend.slope > 0 ? 'UPTREND' : 'DOWNTREND',
        confidence,
        timeframe: '20-period',
        symbol,
        prediction: trend.slope > 0 ? 'BULLISH' : 'BEARISH',
        timestamp: Date.now(),
      });
    }

    return patterns;
  }

  private detectSupportResistanceBreakouts(symbol: string, prices: number[]): PatternData[] {
    const patterns: PatternData[] = [];
    
    if (prices.length < 50) return patterns;
    
    const recentPrices = prices.slice(-50);
    const currentPrice = prices[prices.length - 1];
    
    // Find support and resistance levels
    const support = Math.min(...recentPrices.slice(0, -5)); // Exclude last 5 for confirmation
    const resistance = Math.max(...recentPrices.slice(0, -5));
    
    const supportDistance = (currentPrice - support) / support;
    const resistanceDistance = (resistance - currentPrice) / currentPrice;
    
    // Breakout detection
    if (currentPrice > resistance * 1.002) { // 0.2% above resistance
      patterns.push({
        pattern: 'RESISTANCE_BREAKOUT',
        confidence: Math.min(90, supportDistance * 1000 + 70),
        timeframe: '50-period',
        symbol,
        prediction: 'BULLISH',
        timestamp: Date.now(),
      });
    }
    
    if (currentPrice < support * 0.998) { // 0.2% below support
      patterns.push({
        pattern: 'SUPPORT_BREAKDOWN',
        confidence: Math.min(90, resistanceDistance * 1000 + 70),
        timeframe: '50-period',
        symbol,
        prediction: 'BEARISH',
        timestamp: Date.now(),
      });
    }

    return patterns;
  }

  private detectVolumePatterns(symbol: string, prices: number[], volumes: number[]): PatternData[] {
    const patterns: PatternData[] = [];
    
    if (volumes.length < 20) return patterns;
    
    const recentVolumes = volumes.slice(-10);
    const recentPrices = prices.slice(-10);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const currentVolume = recentVolumes[recentVolumes.length - 1];
    
    // Volume spike detection
    if (currentVolume > avgVolume * 1.5) {
      const priceChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];
      
      patterns.push({
        pattern: 'VOLUME_SPIKE',
        confidence: Math.min(95, (currentVolume / avgVolume - 1) * 50 + 65),
        timeframe: '10-period',
        symbol,
        prediction: priceChange > 0 ? 'BULLISH' : 'BEARISH',
        timestamp: Date.now(),
      });
    }

    return patterns;
  }

  private detectCandlestickPatterns(symbol: string, prices: number[]): PatternData[] {
    const patterns: PatternData[] = [];
    
    if (prices.length < 10) return patterns;
    
    const recent = prices.slice(-5);
    
    // Detect simple reversal patterns
    if (this.isHammerPattern(recent)) {
      patterns.push({
        pattern: 'HAMMER',
        confidence: 75,
        timeframe: '5-period',
        symbol,
        prediction: 'BULLISH',
        timestamp: Date.now(),
      });
    }
    
    if (this.isDojiPattern(recent)) {
      patterns.push({
        pattern: 'DOJI',
        confidence: 65,
        timeframe: '5-period',
        symbol,
        prediction: 'NEUTRAL',
        timestamp: Date.now(),
      });
    }

    return patterns;
  }

  private detectMomentumPatterns(symbol: string, prices: number[]): PatternData[] {
    const patterns: PatternData[] = [];
    
    if (prices.length < 14) return patterns;
    
    // Calculate RSI-like momentum
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains.push(change);
        losses.push(0);
      } else {
        gains.push(0);
        losses.push(-change);
      }
    }
    
    const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
    const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
    
    if (avgLoss === 0) return patterns;
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    // Oversold condition
    if (rsi < 30) {
      patterns.push({
        pattern: 'OVERSOLD',
        confidence: Math.min(95, (30 - rsi) * 2 + 70),
        timeframe: '14-period',
        symbol,
        prediction: 'BULLISH',
        timestamp: Date.now(),
      });
    }
    
    // Overbought condition
    if (rsi > 70) {
      patterns.push({
        pattern: 'OVERBOUGHT',
        confidence: Math.min(95, (rsi - 70) * 2 + 70),
        timeframe: '14-period',
        symbol,
        prediction: 'BEARISH',
        timestamp: Date.now(),
      });
    }

    return patterns;
  }

  private calculateTrend(prices: number[]): { slope: number; rSquared: number } {
    const n = prices.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = prices;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * i + intercept), 2), 0);
    const rSquared = 1 - (ssRes / ssTotal);
    
    return { slope, rSquared };
  }

  private isHammerPattern(prices: number[]): boolean {
    if (prices.length < 3) return false;
    
    const [prev2, prev1, current] = prices.slice(-3);
    
    // Simplified hammer: price declined then recovered
    return prev1 < prev2 && current > prev1 && (current - prev1) > (prev2 - prev1) * 0.5;
  }

  private isDojiPattern(prices: number[]): boolean {
    if (prices.length < 3) return false;
    
    const recent = prices.slice(-3);
    const volatility = Math.max(...recent) - Math.min(...recent);
    const avgPrice = recent.reduce((a, b) => a + b, 0) / recent.length;
    
    // Simplified doji: low volatility
    return (volatility / avgPrice) < 0.005; // Less than 0.5% range
  }

  generateTradingSignalsFromPatterns(patterns: PatternData[]): TradingSignal[] {
    const signals: TradingSignal[] = [];
    
    // Group patterns by symbol
    const patternsBySymbol = new Map<string, PatternData[]>();
    patterns.forEach(pattern => {
      if (!patternsBySymbol.has(pattern.symbol)) {
        patternsBySymbol.set(pattern.symbol, []);
      }
      patternsBySymbol.get(pattern.symbol)!.push(pattern);
    });
    
    // Generate signals for each symbol
    patternsBySymbol.forEach((symbolPatterns, symbol) => {
      const bullishPatterns = symbolPatterns.filter(p => p.prediction === 'BULLISH');
      const bearishPatterns = symbolPatterns.filter(p => p.prediction === 'BEARISH');
      
      if (bullishPatterns.length > bearishPatterns.length) {
        const avgConfidence = bullishPatterns.reduce((sum, p) => sum + p.confidence, 0) / bullishPatterns.length;
        
        signals.push({
          symbol,
          action: 'BUY',
          confidence: Math.min(95, avgConfidence + bullishPatterns.length * 5),
          reason: `Pattern analysis: ${bullishPatterns.map(p => p.pattern).join(', ')}`,
          timestamp: Date.now(),
          source: 'PatternRecognition',
        });
      } else if (bearishPatterns.length > bullishPatterns.length) {
        const avgConfidence = bearishPatterns.reduce((sum, p) => sum + p.confidence, 0) / bearishPatterns.length;
        
        signals.push({
          symbol,
          action: 'SELL',
          confidence: Math.min(95, avgConfidence + bearishPatterns.length * 5),
          reason: `Pattern analysis: ${bearishPatterns.map(p => p.pattern).join(', ')}`,
          timestamp: Date.now(),
          source: 'PatternRecognition',
        });
      }
    });
    
    return signals;
  }
}