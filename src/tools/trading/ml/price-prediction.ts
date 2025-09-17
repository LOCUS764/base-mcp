// Price movement prediction system using various algorithms

import type { MarketData, TradingSignal } from '../core/types.js';

interface PredictionModel {
  name: string;
  predict(data: MarketData[]): number; // Returns predicted price change percentage
  confidence: number;
}

export class PricePredictionEngine {
  private priceHistory: Map<string, MarketData[]> = new Map();
  private models: PredictionModel[] = [];
  private readonly HISTORY_LENGTH = 200;

  constructor() {
    this.initializeModels();
    console.log('Price Prediction Engine initialized with', this.models.length, 'models');
  }

  private initializeModels(): void {
    this.models = [
      new LinearRegressionModel(),
      new MovingAverageModel(),
      new MomentumModel(),
      new VolatilityModel(),
      new SeasonalityModel(),
      new SentimentModel(),
    ];
  }

  addMarketData(data: MarketData): void {
    const symbol = data.symbol;
    
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }
    
    const history = this.priceHistory.get(symbol)!;
    history.push(data);
    
    // Keep only recent history
    if (history.length > this.HISTORY_LENGTH) {
      history.shift();
    }
  }

  async generatePredictiveSignals(symbols: string[]): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];
    
    for (const symbol of symbols) {
      try {
        const signal = await this.predictForSymbol(symbol);
        if (signal) {
          signals.push(signal);
        }
      } catch (error) {
        console.error(`Prediction failed for ${symbol}:`, error);
      }
    }
    
    return signals;
  }

  private async predictForSymbol(symbol: string): Promise<TradingSignal | null> {
    const history = this.priceHistory.get(symbol);
    
    if (!history || history.length < 50) {
      return null; // Need sufficient history
    }
    
    // Get predictions from all models
    const predictions: Array<{ change: number; confidence: number; model: string }> = [];
    
    for (const model of this.models) {
      try {
        const prediction = model.predict(history);
        predictions.push({
          change: prediction,
          confidence: model.confidence,
          model: model.name,
        });
      } catch (error) {
        console.error(`Model ${model.name} failed for ${symbol}:`, error);
      }
    }
    
    if (predictions.length === 0) {
      return null;
    }
    
    // Ensemble prediction using weighted average
    const ensemblePrediction = this.calculateEnsemblePrediction(predictions);
    
    // Generate signal based on ensemble prediction
    if (Math.abs(ensemblePrediction.change) < 0.01) { // Less than 1% predicted change
      return null; // Not significant enough
    }
    
    const action = ensemblePrediction.change > 0 ? 'BUY' : 'SELL';
    const confidence = Math.min(95, ensemblePrediction.confidence);
    
    // Only generate signals with reasonable confidence
    if (confidence < 60) {
      return null;
    }
    
    return {
      symbol,
      action,
      confidence,
      reason: `Price prediction: ${(ensemblePrediction.change * 100).toFixed(2)}% (models: ${predictions.map(p => p.model).join(', ')})`,
      priceTarget: history[history.length - 1].price * (1 + ensemblePrediction.change),
      timestamp: Date.now(),
      source: 'PricePrediction',
    };
  }

  private calculateEnsemblePrediction(predictions: Array<{ change: number; confidence: number; model: string }>): { change: number; confidence: number } {
    // Weight predictions by confidence
    let weightedSum = 0;
    let totalWeight = 0;
    let totalConfidence = 0;
    
    for (const pred of predictions) {
      const weight = pred.confidence / 100;
      weightedSum += pred.change * weight;
      totalWeight += weight;
      totalConfidence += pred.confidence;
    }
    
    return {
      change: weightedSum / totalWeight,
      confidence: totalConfidence / predictions.length,
    };
  }

  getPredictionAccuracy(symbol: string): number {
    // Calculate historical accuracy of predictions
    // This would track actual vs predicted outcomes
    // For now, return a placeholder
    return 0.65; // 65% accuracy
  }
}

// Linear Regression Model
class LinearRegressionModel implements PredictionModel {
  name = 'LinearRegression';
  confidence = 70;

  predict(data: MarketData[]): number {
    if (data.length < 20) return 0;
    
    const recent = data.slice(-20);
    const prices = recent.map(d => d.price);
    
    // Simple linear regression on recent prices
    const n = prices.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = prices;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Predict next period change
    const currentPrice = prices[prices.length - 1];
    const predictedPrice = slope * n + (sumY - slope * sumX) / n;
    
    return (predictedPrice - currentPrice) / currentPrice;
  }
}

// Moving Average Model
class MovingAverageModel implements PredictionModel {
  name = 'MovingAverage';
  confidence = 65;

  predict(data: MarketData[]): number {
    if (data.length < 50) return 0;
    
    const prices = data.map(d => d.price);
    const currentPrice = prices[prices.length - 1];
    
    // Calculate multiple moving averages
    const ma20 = this.calculateMA(prices, 20);
    const ma50 = this.calculateMA(prices, 50);
    
    // Predict based on MA crossover and distance
    const ma20Distance = (currentPrice - ma20) / ma20;
    const ma50Distance = (currentPrice - ma50) / ma50;
    
    // If price is above both MAs and MAs are trending up, predict bullish
    if (ma20Distance > 0 && ma50Distance > 0 && ma20 > ma50) {
      return Math.min(0.05, ma20Distance * 2); // Cap at 5%
    }
    
    // If price is below both MAs and MAs are trending down, predict bearish
    if (ma20Distance < 0 && ma50Distance < 0 && ma20 < ma50) {
      return Math.max(-0.05, ma20Distance * 2); // Cap at -5%
    }
    
    return 0;
  }

  private calculateMA(prices: number[], period: number): number {
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }
}

// Momentum Model
class MomentumModel implements PredictionModel {
  name = 'Momentum';
  confidence = 75;

  predict(data: MarketData[]): number {
    if (data.length < 14) return 0;
    
    const recent = data.slice(-14);
    const prices = recent.map(d => d.price);
    const volumes = recent.map(d => d.volume);
    
    // Calculate price momentum
    const priceChange = (prices[prices.length - 1] - prices[0]) / prices[0];
    
    // Calculate volume momentum
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const recentVolume = volumes[volumes.length - 1];
    const volumeRatio = recentVolume / avgVolume;
    
    // Combine price and volume momentum
    let momentum = priceChange;
    
    // Amplify momentum if volume confirms
    if (volumeRatio > 1.2) {
      momentum *= 1.5;
    }
    
    // Predict continuation of momentum with decay
    return momentum * 0.7; // 70% continuation
  }
}

// Volatility Model
class VolatilityModel implements PredictionModel {
  name = 'Volatility';
  confidence = 60;

  predict(data: MarketData[]): number {
    if (data.length < 20) return 0;
    
    const recent = data.slice(-20);
    const prices = recent.map(d => d.price);
    
    // Calculate volatility
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    // High volatility often precedes mean reversion
    const currentPrice = prices[prices.length - 1];
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const priceDeviation = (currentPrice - avgPrice) / avgPrice;
    
    // Predict mean reversion for high volatility periods
    if (volatility > 0.03) { // High volatility threshold
      return -priceDeviation * 0.5; // 50% mean reversion
    }
    
    return 0;
  }
}

// Seasonality Model
class SeasonalityModel implements PredictionModel {
  name = 'Seasonality';
  confidence = 50;

  predict(data: MarketData[]): number {
    if (data.length < 30) return 0;
    
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    // Simple seasonal patterns (crypto markets)
    let seasonalityFactor = 0;
    
    // Weekend effect (less institutional trading)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      seasonalityFactor += 0.01; // Slight bullish bias on weekends
    }
    
    // Time of day effects
    if (hour >= 9 && hour <= 16) { // Traditional trading hours
      seasonalityFactor += 0.005; // Slight bullish bias during traditional hours
    }
    
    return seasonalityFactor;
  }
}

// Sentiment Model (simplified)
class SentimentModel implements PredictionModel {
  name = 'Sentiment';
  confidence = 55;

  predict(data: MarketData[]): number {
    if (data.length < 10) return 0;
    
    const recent = data.slice(-10);
    
    // Analyze recent price action as sentiment proxy
    const positiveCount = recent.filter(d => d.change24h > 0).length;
    const negativeCount = recent.filter(d => d.change24h < 0).length;
    
    const sentimentScore = (positiveCount - negativeCount) / recent.length;
    
    // Predict continuation of sentiment with some mean reversion
    return sentimentScore * 0.02; // Small sentiment-based prediction
  }
}