// Reinforcement learning system for trading optimization

import type { ReinforcementData, TradingSignal, TradingOrder } from '../core/types.js';

interface QValue {
  state: string;
  action: string;
  value: number;
  visits: number;
}

interface TradingState {
  priceChange: number;
  volumeChange: number;
  volatility: number;
  momentum: number;
  timeOfDay: number;
  dayOfWeek: number;
}

export class ReinforcementLearningEngine {
  private qTable: Map<string, QValue> = new Map();
  private trainingData: ReinforcementData[] = [];
  private readonly LEARNING_RATE = 0.1;
  private readonly DISCOUNT_FACTOR = 0.95;
  private readonly EXPLORATION_RATE = 0.1;
  private readonly MAX_TRAINING_DATA = 10000;

  constructor() {
    this.loadExistingData();
    console.log('Reinforcement Learning Engine initialized');
  }

  private loadExistingData(): void {
    // In a real implementation, this would load from persistent storage
    console.log('Loading existing Q-table and training data...');
  }

  recordTradeOutcome(
    signal: TradingSignal,
    order: TradingOrder,
    actualOutcome: number // Profit/loss percentage
  ): void {
    const reward = this.calculateReward(actualOutcome);
    const state = this.createStateKey(signal);
    
    const reinforcementData: ReinforcementData = {
      action: `${signal.action}_${signal.confidence > 80 ? 'HIGH' : 'LOW'}_CONFIDENCE`,
      outcome: actualOutcome > 0 ? 'POSITIVE' : 'NEGATIVE',
      reward,
      context: {
        signal,
        order,
        actualOutcome,
        state,
      },
      timestamp: Date.now(),
    };

    this.trainingData.push(reinforcementData);
    
    // Keep training data manageable
    if (this.trainingData.length > this.MAX_TRAINING_DATA) {
      this.trainingData.shift();
    }

    // Update Q-table
    this.updateQValue(state, reinforcementData.action, reward);
    
    console.log(`Recorded outcome: ${signal.symbol} ${signal.action} -> ${actualOutcome.toFixed(2)}% (reward: ${reward.toFixed(2)})`);
  }

  private calculateReward(outcome: number): number {
    // Design reward function to encourage profitable trades and discourage losses
    let reward = outcome; // Base reward is the actual profit/loss percentage
    
    // Amplify rewards for very profitable trades
    if (outcome > 0.05) { // > 5% profit
      reward *= 2;
    }
    
    // Penalize large losses more heavily
    if (outcome < -0.03) { // > 3% loss
      reward *= 3; // Make negative rewards more negative
    }
    
    // Add consistency bonus/penalty
    const recentTrades = this.trainingData.slice(-10);
    const profitableTrades = recentTrades.filter(t => t.outcome === 'POSITIVE').length;
    
    if (profitableTrades >= 7) { // 70% win rate
      reward += 0.01; // Consistency bonus
    } else if (profitableTrades <= 3) { // 30% win rate
      reward -= 0.01; // Consistency penalty
    }
    
    return reward;
  }

  private createStateKey(signal: TradingSignal): string {
    // Create a discrete state representation
    const confidenceBucket = signal.confidence > 80 ? 'HIGH' : signal.confidence > 60 ? 'MEDIUM' : 'LOW';
    const timeBucket = this.getTimeBucket();
    
    return `${signal.symbol}_${confidenceBucket}_${timeBucket}`;
  }

  private getTimeBucket(): string {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'MORNING';
    if (hour >= 12 && hour < 18) return 'AFTERNOON';
    if (hour >= 18 && hour < 24) return 'EVENING';
    return 'NIGHT';
  }

  private updateQValue(state: string, action: string, reward: number): void {
    const key = `${state}_${action}`;
    const existing = this.qTable.get(key);
    
    if (existing) {
      // Q-learning update rule
      const newValue = existing.value + this.LEARNING_RATE * (reward - existing.value);
      existing.value = newValue;
      existing.visits += 1;
    } else {
      // Initialize new Q-value
      this.qTable.set(key, {
        state,
        action,
        value: reward,
        visits: 1,
      });
    }
  }

  optimizeSignal(signal: TradingSignal): TradingSignal {
    const state = this.createStateKey(signal);
    const actions = this.getAvailableActions(signal);
    
    let bestAction: string = signal.action;
    let bestValue = -Infinity;
    
    // Explore vs exploit decision
    if (Math.random() < this.EXPLORATION_RATE) {
      // Exploration: try random action
      bestAction = actions[Math.floor(Math.random() * actions.length)];
    } else {
      // Exploitation: choose best known action
      for (const action of actions) {
        const key = `${state}_${action}`;
        const qValue = this.qTable.get(key);
        
        if (qValue && qValue.value > bestValue) {
          bestValue = qValue.value;
          bestAction = action;
        }
      }
    }
    
    // Apply reinforcement learning insights
    const optimizedSignal = { ...signal };
    
    // Adjust confidence based on learned Q-values
    const actionKey = `${state}_${bestAction}`;
    const qValue = this.qTable.get(actionKey);
    
    if (qValue && qValue.visits > 5) { // Only use well-tested Q-values
      if (qValue.value > 0.02) { // Strong positive Q-value
        optimizedSignal.confidence = Math.min(95, optimizedSignal.confidence + 10);
      } else if (qValue.value < -0.02) { // Strong negative Q-value
        optimizedSignal.confidence = Math.max(50, optimizedSignal.confidence - 15);
      }
    }
    
    // Update action if different
    if (bestAction.includes('BUY')) {
      optimizedSignal.action = 'BUY';
    } else if (bestAction.includes('SELL')) {
      optimizedSignal.action = 'SELL';
    } else {
      optimizedSignal.action = 'HOLD';
    }
    
    optimizedSignal.reason += ` [RL optimized: Q=${qValue?.value.toFixed(3) || 'N/A'}]`;
    
    return optimizedSignal;
  }

  private getAvailableActions(signal: TradingSignal): string[] {
    const baseActions = ['BUY_HIGH_CONFIDENCE', 'BUY_LOW_CONFIDENCE', 'SELL_HIGH_CONFIDENCE', 'SELL_LOW_CONFIDENCE', 'HOLD'];
    
    // Filter actions based on context
    const actions = baseActions.filter(action => {
      if (action.includes('BUY') && signal.action === 'SELL') return false;
      if (action.includes('SELL') && signal.action === 'BUY') return false;
      return true;
    });
    
    return actions;
  }

  getPerformanceMetrics(): {
    totalTrades: number;
    winRate: number;
    averageReward: number;
    bestActions: Array<{ action: string; value: number; visits: number }>;
  } {
    const totalTrades = this.trainingData.length;
    const profitableTrades = this.trainingData.filter(t => t.outcome === 'POSITIVE').length;
    const winRate = totalTrades > 0 ? profitableTrades / totalTrades : 0;
    
    const totalReward = this.trainingData.reduce((sum, t) => sum + t.reward, 0);
    const averageReward = totalTrades > 0 ? totalReward / totalTrades : 0;
    
    // Get best performing actions
    const bestActions = Array.from(this.qTable.values())
      .filter(q => q.visits >= 5) // Only well-tested actions
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(q => ({
        action: q.action,
        value: q.value,
        visits: q.visits,
      }));

    return {
      totalTrades,
      winRate,
      averageReward,
      bestActions,
    };
  }

  // Positive reinforcement for successful strategies
  reinforceSuccessfulPattern(
    pattern: string,
    symbol: string,
    outcome: number
  ): void {
    if (outcome <= 0) return; // Only reinforce positive outcomes
    
    const reward = this.calculateReward(outcome) * 1.5; // Bonus for pattern recognition
    
    const reinforcementData: ReinforcementData = {
      action: `PATTERN_${pattern}`,
      outcome: 'POSITIVE',
      reward,
      context: {
        pattern,
        symbol,
        outcome,
        type: 'pattern_reinforcement',
      },
      timestamp: Date.now(),
    };

    this.trainingData.push(reinforcementData);
    this.updateQValue(`PATTERN_${symbol}`, pattern, reward);
    
    console.log(`Reinforced pattern: ${pattern} for ${symbol} with reward ${reward.toFixed(3)}`);
  }

  // Negative reinforcement for failed strategies
  penalizeFailedStrategy(
    strategy: string,
    symbol: string,
    loss: number
  ): void {
    if (loss >= 0) return; // Only penalize actual losses
    
    const penalty = this.calculateReward(loss) * 1.2; // Additional penalty
    
    const reinforcementData: ReinforcementData = {
      action: `STRATEGY_${strategy}`,
      outcome: 'NEGATIVE',
      reward: penalty,
      context: {
        strategy,
        symbol,
        loss,
        type: 'strategy_penalty',
      },
      timestamp: Date.now(),
    };

    this.trainingData.push(reinforcementData);
    this.updateQValue(`STRATEGY_${symbol}`, strategy, penalty);
    
    console.log(`Penalized strategy: ${strategy} for ${symbol} with penalty ${penalty.toFixed(3)}`);
  }

  adaptTradingBehavior(currentPerformance: { winRate: number; avgReturn: number }): {
    explorationRate: number;
    riskTolerance: number;
    tradingFrequency: number;
  } {
    // Adaptive behavior based on recent performance
    let explorationRate = this.EXPLORATION_RATE;
    let riskTolerance = 0.02; // Base 2% risk per trade
    let tradingFrequency = 30; // Base 30 seconds between trades
    
    // If performing well, reduce exploration and increase risk tolerance
    if (currentPerformance.winRate > 0.7 && currentPerformance.avgReturn > 0.02) {
      explorationRate *= 0.7; // Reduce exploration
      riskTolerance *= 1.3; // Increase risk tolerance
      tradingFrequency *= 0.8; // Trade more frequently
    }
    
    // If performing poorly, increase exploration and reduce risk
    if (currentPerformance.winRate < 0.4 || currentPerformance.avgReturn < -0.01) {
      explorationRate *= 1.5; // Increase exploration
      riskTolerance *= 0.7; // Decrease risk tolerance
      tradingFrequency *= 1.3; // Trade less frequently
    }
    
    return {
      explorationRate: Math.min(0.3, Math.max(0.05, explorationRate)),
      riskTolerance: Math.min(0.05, Math.max(0.005, riskTolerance)),
      tradingFrequency: Math.min(120, Math.max(10, tradingFrequency)),
    };
  }

  saveModel(): void {
    // In a real implementation, save Q-table and training data to persistent storage
    console.log(`Saving RL model: ${this.qTable.size} Q-values, ${this.trainingData.length} training samples`);
    
    // For now, just log performance
    const metrics = this.getPerformanceMetrics();
    console.log('Current RL Performance:', metrics);
  }
}