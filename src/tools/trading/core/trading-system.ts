// Main trading system orchestrator - manages all agents and coordinates trading

import type { EvmWalletProvider } from '@coinbase/agentkit';
import type { TradingSystemState, TradingConfig, AgentState } from './types.js';
import { BaseTradingAgent } from '../agents/base-agent.js';
import { AggressiveOracleAgent } from '../agents/aggressive-oracle.js';
import { ContinuousMoneyMakerAgent } from '../agents/continuous-money-maker.js';
import { MarketDataService } from './market-data.js';

export class TradingSystem {
  private state: TradingSystemState;
  private agents: Map<string, BaseTradingAgent> = new Map();
  private marketDataService: MarketDataService;
  private systemInterval?: NodeJS.Timeout;
  private readonly SYSTEM_UPDATE_FREQUENCY = 60000; // 1 minute

  constructor(
    private walletProvider: EvmWalletProvider,
    private config: Partial<TradingConfig> = {}
  ) {
    this.marketDataService = new MarketDataService();
    
    this.state = {
      isRunning: false,
      agents: {},
      positions: [],
      orders: [],
      totalPnL: 0,
      totalTrades: 0,
      startTime: Date.now(),
      lastUpdate: Date.now(),
    };

    this.initializeAgents();
    console.log('Trading System initialized with', this.agents.size, 'agents');
  }

  private initializeAgents(): void {
    // Create specialized trading agents
    const aggressiveOracle = new AggressiveOracleAgent(this.walletProvider, {
      ...this.config,
      tradingFrequency: 15, // Very aggressive
    });

    const continuousMoneyMaker = new ContinuousMoneyMakerAgent(this.walletProvider, {
      ...this.config,
      tradingFrequency: 45, // More conservative
    });

    // Add more agents as needed
    this.agents.set('aggressive-oracle', aggressiveOracle);
    this.agents.set('continuous-money-maker', continuousMoneyMaker);

    console.log('Initialized agents:', Array.from(this.agents.keys()));
  }

  async start(): Promise<void> {
    if (this.state.isRunning) {
      console.log('Trading system is already running');
      return;
    }

    console.log('🚀 Starting Agentic Nexus Trading System...');
    
    this.state.isRunning = true;
    this.state.startTime = Date.now();

    try {
      // Start all agents
      for (const [agentId, agent] of this.agents) {
        console.log(`Starting agent: ${agentId}`);
        await agent.start();
        this.state.agents[agentId] = agent.getState();
      }

      // Start system monitoring
      this.startSystemMonitoring();

      console.log('✅ All trading agents are now running 24/7');
      console.log('💰 Money printer go brrrrrrrrr...');
      
      // Log initial status
      this.logSystemStatus();

    } catch (error) {
      console.error('Failed to start trading system:', error);
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.state.isRunning) {
      return;
    }

    console.log('🛑 Stopping Agentic Nexus Trading System...');
    
    this.state.isRunning = false;

    // Stop system monitoring
    if (this.systemInterval) {
      clearInterval(this.systemInterval);
      this.systemInterval = undefined;
    }

    // Stop all agents
    for (const [agentId, agent] of this.agents) {
      console.log(`Stopping agent: ${agentId}`);
      try {
        await agent.stop();
      } catch (error) {
        console.error(`Error stopping agent ${agentId}:`, error);
      }
    }

    // Final status report
    this.generateSystemReport();
    
    console.log('✅ Trading system stopped');
  }

  private startSystemMonitoring(): void {
    this.systemInterval = setInterval(async () => {
      try {
        await this.updateSystemState();
        await this.performSystemHealthCheck();
        await this.optimizeSystemPerformance();
      } catch (error) {
        console.error('System monitoring error:', error);
        await this.handleSystemError(error);
      }
    }, this.SYSTEM_UPDATE_FREQUENCY);
  }

  private async updateSystemState(): Promise<void> {
    // Update agent states
    for (const [agentId, agent] of this.agents) {
      this.state.agents[agentId] = agent.getState();
    }

    // Calculate system-wide metrics
    let totalPnL = 0;
    let totalTrades = 0;

    for (const agentState of Object.values(this.state.agents)) {
      totalPnL += agentState.performanceMetrics.totalPnL;
      totalTrades += agentState.performanceMetrics.totalTrades;
    }

    this.state.totalPnL = totalPnL;
    this.state.totalTrades = totalTrades;
    this.state.lastUpdate = Date.now();
  }

  private async performSystemHealthCheck(): Promise<void> {
    const issues: string[] = [];

    // Check agent health
    for (const [agentId, agentState] of Object.entries(this.state.agents)) {
      if (!agentState.isActive) {
        issues.push(`Agent ${agentId} is inactive`);
      }

      const timeSinceUpdate = Date.now() - agentState.lastUpdate;
      if (timeSinceUpdate > 300000) { // 5 minutes
        issues.push(`Agent ${agentId} hasn't updated in ${timeSinceUpdate / 1000}s`);
      }

      // Check performance metrics
      if (agentState.performanceMetrics.totalTrades > 10 && agentState.performanceMetrics.winRate < 0.3) {
        issues.push(`Agent ${agentId} has low win rate: ${(agentState.performanceMetrics.winRate * 100).toFixed(1)}%`);
      }
    }

    // Check system-wide metrics
    const runTime = Date.now() - this.state.startTime;
    if (runTime > 3600000 && this.state.totalTrades === 0) { // 1 hour with no trades
      issues.push('No trades executed in the last hour');
    }

    if (issues.length > 0) {
      console.log('⚠️  System health issues detected:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      
      // Attempt self-healing
      await this.attemptSelfHealing(issues);
    }
  }

  private async attemptSelfHealing(issues: string[]): Promise<void> {
    console.log('🔧 Attempting self-healing...');

    for (const issue of issues) {
      try {
        if (issue.includes('inactive')) {
          const agentId = issue.split(' ')[1];
          const agent = this.agents.get(agentId);
          if (agent) {
            console.log(`Restarting agent: ${agentId}`);
            await agent.stop();
            await agent.start();
          }
        }

        if (issue.includes('low win rate')) {
          const agentId = issue.split(' ')[1];
          const agent = this.agents.get(agentId);
          if (agent) {
            console.log(`Adjusting config for underperforming agent: ${agentId}`);
            agent.updateConfig({
              riskPerTrade: 0.01, // Reduce risk
              tradingFrequency: 120, // Slow down trading
            });
          }
        }

        if (issue.includes('No trades executed')) {
          console.log('Boosting signal sensitivity to increase trading activity');
          for (const [agentId, agent] of this.agents) {
            const config = agent.getState().config as TradingConfig;
            agent.updateConfig({
              tradingFrequency: Math.max(15, config.tradingFrequency * 0.8),
            });
          }
        }

      } catch (error) {
        console.error(`Self-healing failed for issue "${issue}":`, error);
      }
    }

    console.log('✅ Self-healing attempt completed');
  }

  private async optimizeSystemPerformance(): Promise<void> {
    // Get overall system performance
    const totalTrades = this.state.totalTrades;
    const totalPnL = this.state.totalPnL;
    const avgReturn = totalTrades > 0 ? totalPnL / totalTrades : 0;

    // Optimize based on performance
    if (totalTrades > 20) { // Need sufficient data
      if (avgReturn > 0.02) { // Performing well
        console.log('💎 System performing well - optimizing for growth');
        
        // Increase position sizes slightly
        for (const [agentId, agent] of this.agents) {
          const currentConfig = agent.getState().config as TradingConfig;
          agent.updateConfig({
            maxPositionSize: Math.min(currentConfig.maxPositionSize * 1.1, 3000),
            riskPerTrade: Math.min(currentConfig.riskPerTrade * 1.05, 0.04),
          });
        }
        
      } else if (avgReturn < -0.01) { // Performing poorly
        console.log('⚠️ System underperforming - switching to conservative mode');
        
        // Reduce risk and slow down
        for (const [agentId, agent] of this.agents) {
          const currentConfig = agent.getState().config as TradingConfig;
          agent.updateConfig({
            maxPositionSize: Math.max(currentConfig.maxPositionSize * 0.9, 100),
            riskPerTrade: Math.max(currentConfig.riskPerTrade * 0.95, 0.005),
            tradingFrequency: currentConfig.tradingFrequency * 1.1,
          });
        }
      }
    }

    // Dynamic agent allocation based on performance
    this.optimizeAgentAllocation();
  }

  private optimizeAgentAllocation(): void {
    // Find best performing agents
    const agentPerformance = Object.entries(this.state.agents)
      .map(([agentId, state]) => ({
        agentId,
        winRate: state.performanceMetrics.winRate,
        avgReturn: state.performanceMetrics.averageReturn,
        totalTrades: state.performanceMetrics.totalTrades,
      }))
      .filter(perf => perf.totalTrades > 5); // Only consider agents with sufficient trades

    if (agentPerformance.length === 0) return;

    // Sort by performance score
    agentPerformance.sort((a, b) => {
      const scoreA = (a.winRate * 0.6) + (a.avgReturn * 0.4);
      const scoreB = (b.winRate * 0.6) + (b.avgReturn * 0.4);
      return scoreB - scoreA;
    });

    console.log('📊 Agent Performance Ranking:');
    agentPerformance.forEach((perf, index) => {
      console.log(`   ${index + 1}. ${perf.agentId}: ${(perf.winRate * 100).toFixed(1)}% win rate, ${(perf.avgReturn * 100).toFixed(2)}% avg return`);
    });

    // Allocate more resources to top performers
    const topPerformer = agentPerformance[0];
    if (topPerformer.winRate > 0.7) {
      const agent = this.agents.get(topPerformer.agentId);
      if (agent) {
        console.log(`🏆 Boosting top performer: ${topPerformer.agentId}`);
        const config = agent.getState().config as TradingConfig;
        agent.updateConfig({
          maxOpenPositions: Math.min(8, config.maxOpenPositions + 1),
          tradingFrequency: Math.max(10, config.tradingFrequency * 0.9),
        });
      }
    }
  }

  private async handleSystemError(error: any): Promise<void> {
    console.error('🚨 System error detected:', error);

    // Implement circuit breaker pattern
    const errorCount = (this as any).errorCount || 0;
    (this as any).errorCount = errorCount + 1;

    if (errorCount > 5) {
      console.log('🔌 Circuit breaker activated - stopping system due to repeated errors');
      await this.stop();
      return;
    }

    // Try to recover from specific error types
    if (error.message.includes('network') || error.message.includes('timeout')) {
      console.log('🌐 Network error detected - reducing trading frequency');
      for (const [agentId, agent] of this.agents) {
        const config = agent.getState().config as TradingConfig;
        agent.updateConfig({
          tradingFrequency: config.tradingFrequency * 1.5,
        });
      }
    }

    if (error.message.includes('insufficient') || error.message.includes('balance')) {
      console.log('💰 Balance error detected - reducing position sizes');
      for (const [agentId, agent] of this.agents) {
        const config = agent.getState().config as TradingConfig;
        agent.updateConfig({
          maxPositionSize: config.maxPositionSize * 0.8,
        });
      }
    }
  }

  private logSystemStatus(): void {
    console.log('📊 ===== AGENTIC NEXUS STATUS =====');
    console.log(`🤖 Active Agents: ${Object.keys(this.state.agents).length}`);
    console.log(`💹 Total Trades: ${this.state.totalTrades}`);
    console.log(`💰 Total P&L: ${this.state.totalPnL.toFixed(4)} (${(this.state.totalPnL * 100).toFixed(2)}%)`);
    console.log(`⏱️  Running Time: ${((Date.now() - this.state.startTime) / 1000 / 60).toFixed(1)} minutes`);
    console.log('=====================================');
  }

  generateSystemReport(): {
    systemStats: any;
    agentStats: any[];
    recommendations: string[];
  } {
    const runTime = Date.now() - this.state.startTime;
    const totalTrades = this.state.totalTrades;
    const totalPnL = this.state.totalPnL;
    const winRate = totalTrades > 0 ? 
      Object.values(this.state.agents).reduce((sum, agent) => sum + agent.performanceMetrics.profitableTrades, 0) / totalTrades 
      : 0;

    const systemStats = {
      runTime: runTime / 1000 / 60, // minutes
      totalTrades,
      totalPnL,
      winRate,
      profitFactor: totalPnL > 0 ? totalPnL / Math.abs(totalPnL) : 0,
      tradesPerHour: totalTrades / (runTime / 1000 / 3600),
    };

    const agentStats = Object.entries(this.state.agents).map(([agentId, state]) => ({
      agentId,
      ...state.performanceMetrics,
      efficiency: state.performanceMetrics.totalTrades > 0 ? 
        state.performanceMetrics.totalPnL / state.performanceMetrics.totalTrades : 0,
    }));

    const recommendations: string[] = [];
    
    if (winRate < 0.5) {
      recommendations.push('Consider reducing risk per trade and increasing signal confidence thresholds');
    }
    
    if (totalTrades < 10 && runTime > 3600000) {
      recommendations.push('Trading frequency might be too conservative - consider increasing signal sensitivity');
    }
    
    if (totalPnL < 0) {
      recommendations.push('System is in drawdown - consider switching to defensive mode or paper trading');
    }

    return { systemStats, agentStats, recommendations };
  }

  // Public interface methods
  getSystemState(): TradingSystemState {
    return { ...this.state };
  }

  getAgentStates(): Record<string, AgentState> {
    return { ...this.state.agents };
  }

  async forceExecuteAllPendingOrders(): Promise<void> {
    console.log('⚡ Force executing all pending orders...');
    for (const [agentId, agent] of this.agents) {
      try {
        await (agent as any).tradeExecutor.executeAllPendingOrders();
      } catch (error) {
        console.error(`Error force executing orders for ${agentId}:`, error);
      }
    }
  }

  updateSystemConfig(newConfig: Partial<TradingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('System config updated:', newConfig);
    
    // Apply to all agents
    for (const [agentId, agent] of this.agents) {
      agent.updateConfig(newConfig);
    }
  }
}