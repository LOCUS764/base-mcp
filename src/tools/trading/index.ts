// Main trading system integration with Base MCP

import {
  ActionProvider,
  CreateAction,
  EvmWalletProvider,
  type Network,
} from '@coinbase/agentkit';
import { base, baseSepolia } from 'viem/chains';
import type { z } from 'zod';
import { z as zod } from 'zod';
import { TradingSystem } from './core/trading-system.js';
import type { TradingConfig } from './core/types.js';

// Schema definitions for trading actions
const StartTradingSystemSchema = zod.object({
  config: zod.object({
    maxPositionSize: zod.number().optional().default(1000),
    riskPerTrade: zod.number().optional().default(0.02),
    tradingFrequency: zod.number().optional().default(30),
    stopLossPercentage: zod.number().optional().default(0.05),
    takeProfitPercentage: zod.number().optional().default(0.10),
    maxOpenPositions: zod.number().optional().default(5),
    enablePatternRecognition: zod.boolean().optional().default(true),
    enableReinforcementLearning: zod.boolean().optional().default(true),
    enablePredictiveAnalysis: zod.boolean().optional().default(true),
  }).optional().default({}),
});

const GetTradingStatusSchema = zod.object({
  detailed: zod.boolean().optional().default(false),
});

const UpdateTradingConfigSchema = zod.object({
  config: zod.object({
    maxPositionSize: zod.number().optional(),
    riskPerTrade: zod.number().optional(),
    tradingFrequency: zod.number().optional(),
    stopLossPercentage: zod.number().optional(),
    takeProfitPercentage: zod.number().optional(),
    maxOpenPositions: zod.number().optional(),
    enablePatternRecognition: zod.boolean().optional(),
    enableReinforcementLearning: zod.boolean().optional(),
    enablePredictiveAnalysis: zod.boolean().optional(),
  }),
});

const StopTradingSystemSchema = zod.object({});

const GetPerformanceReportSchema = zod.object({});

const ForceExecuteOrdersSchema = zod.object({
  confirm: zod.boolean().default(false),
});

export class BaseMcpTradingActionProvider extends ActionProvider<EvmWalletProvider> {
  private tradingSystem?: TradingSystem;

  constructor() {
    super('baseMcpTrading', []);
  }

  @CreateAction({
    name: 'start_trading_system',
    description: 'Start the Agentic Nexus Automated Trading System with advanced AI agents, pattern recognition, price prediction, and reinforcement learning. This system runs 24/7 and uses multiple specialized agents for compound gains.',
    schema: StartTradingSystemSchema,
  })
  async startTradingSystem(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof StartTradingSystemSchema>
  ) {
    try {
      if (this.tradingSystem?.getSystemState().isRunning) {
        return JSON.stringify({
          success: false,
          message: 'Trading system is already running',
          status: this.tradingSystem.getSystemState(),
        });
      }

      console.log('🚀 Initializing Agentic Nexus Trading System...');
      
      this.tradingSystem = new TradingSystem(walletProvider, args.config);
      await this.tradingSystem.start();

      const initialState = this.tradingSystem.getSystemState();

      return JSON.stringify({
        success: true,
        message: '🚀 Agentic Nexus Trading System is now running 24/7 with all agents active! 💰 Money printer go brrrrrrrrr...',
        systemId: `trading-system-${Date.now()}`,
        startTime: new Date(initialState.startTime).toISOString(),
        activeAgents: Object.keys(initialState.agents),
        config: args.config,
        features: [
          '🤖 Multiple AI Trading Agents',
          '📊 Pattern Recognition Engine',
          '🔮 Price Movement Prediction',
          '🧠 Reinforcement Learning',
          '⚡ Dynamic Limit Orders',
          '🔄 Token-to-Token Conversion',
          '💎 Compound Gains Strategy',
          '🛡️ Self-Healing System',
          '📈 Real-time Performance Optimization'
        ],
        status: 'RUNNING',
      });

    } catch (error) {
      console.error('Failed to start trading system:', error);
      return JSON.stringify({
        success: false,
        message: `Failed to start trading system: ${error}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @CreateAction({
    name: 'stop_trading_system',
    description: 'Stop the Agentic Nexus Trading System and all active agents',
    schema: StopTradingSystemSchema,
  })
  async stopTradingSystem(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof StopTradingSystemSchema>
  ) {
    try {
      if (!this.tradingSystem) {
        return JSON.stringify({
          success: false,
          message: 'Trading system is not initialized',
        });
      }

      const finalReport = this.tradingSystem.generateSystemReport();
      await this.tradingSystem.stop();

      return JSON.stringify({
        success: true,
        message: '🛑 Agentic Nexus Trading System stopped successfully',
        finalReport,
        status: 'STOPPED',
      });

    } catch (error) {
      console.error('Failed to stop trading system:', error);
      return JSON.stringify({
        success: false,
        message: `Failed to stop trading system: ${error}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @CreateAction({
    name: 'get_trading_status',
    description: 'Get current status and performance of the trading system and all agents',
    schema: GetTradingStatusSchema,
  })
  async getTradingStatus(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetTradingStatusSchema>
  ) {
    try {
      if (!this.tradingSystem) {
        return JSON.stringify({
          success: false,
          message: 'Trading system is not initialized',
          status: 'NOT_INITIALIZED',
        });
      }

      const systemState = this.tradingSystem.getSystemState();
      const agentStates = this.tradingSystem.getAgentStates();

      const response: any = {
        success: true,
        status: systemState.isRunning ? 'RUNNING' : 'STOPPED',
        systemStats: {
          totalTrades: systemState.totalTrades,
          totalPnL: systemState.totalPnL,
          totalPnLPercentage: (systemState.totalPnL * 100).toFixed(2) + '%',
          runTime: ((Date.now() - systemState.startTime) / 1000 / 60).toFixed(1) + ' minutes',
          activeAgents: Object.values(agentStates).filter(agent => agent.isActive).length,
          totalAgents: Object.keys(agentStates).length,
        },
        agents: Object.entries(agentStates).map(([agentId, state]) => ({
          id: agentId,
          type: state.type,
          active: state.isActive,
          trades: state.performanceMetrics.totalTrades,
          profitableTrades: state.performanceMetrics.profitableTrades,
          winRate: (state.performanceMetrics.winRate * 100).toFixed(1) + '%',
          totalPnL: state.performanceMetrics.totalPnL.toFixed(4),
          avgReturn: (state.performanceMetrics.averageReturn * 100).toFixed(2) + '%',
          lastUpdate: new Date(state.lastUpdate).toISOString(),
        })),
        lastUpdate: new Date(systemState.lastUpdate).toISOString(),
      };

      if (args.detailed) {
        const report = this.tradingSystem.generateSystemReport();
        response.detailedReport = report;
      }

      return JSON.stringify(response);

    } catch (error) {
      console.error('Failed to get trading status:', error);
      return JSON.stringify({
        success: false,
        message: `Failed to get trading status: ${error}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @CreateAction({
    name: 'update_trading_config',
    description: 'Update trading system configuration including risk parameters, trading frequency, and feature toggles',
    schema: UpdateTradingConfigSchema,
  })
  async updateTradingConfig(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof UpdateTradingConfigSchema>
  ) {
    try {
      if (!this.tradingSystem) {
        return JSON.stringify({
          success: false,
          message: 'Trading system is not initialized',
        });
      }

      this.tradingSystem.updateSystemConfig(args.config);

      return JSON.stringify({
        success: true,
        message: 'Trading system configuration updated successfully',
        updatedConfig: args.config,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Failed to update trading config:', error);
      return JSON.stringify({
        success: false,
        message: `Failed to update trading config: ${error}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @CreateAction({
    name: 'force_execute_pending_orders',
    description: 'Force execute all pending limit orders immediately as market orders (emergency function)',
    schema: ForceExecuteOrdersSchema,
  })
  async forceExecutePendingOrders(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ForceExecuteOrdersSchema>
  ) {
    try {
      if (!this.tradingSystem) {
        return JSON.stringify({
          success: false,
          message: 'Trading system is not initialized',
        });
      }

      if (!args.confirm) {
        return JSON.stringify({
          success: false,
          message: 'Force execution requires confirmation. Set confirm: true to proceed.',
          warning: 'This will execute all pending orders at current market prices',
        });
      }

      await this.tradingSystem.forceExecuteAllPendingOrders();

      return JSON.stringify({
        success: true,
        message: '⚡ All pending orders have been force executed',
        timestamp: new Date().toISOString(),
        warning: 'Orders were executed at market price which may differ from limit prices',
      });

    } catch (error) {
      console.error('Failed to force execute orders:', error);
      return JSON.stringify({
        success: false,
        message: `Failed to force execute orders: ${error}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @CreateAction({
    name: 'get_performance_report',
    description: 'Get detailed performance report with recommendations for optimization',
    schema: GetPerformanceReportSchema,
  })
  async getPerformanceReport(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetPerformanceReportSchema>
  ) {
    try {
      if (!this.tradingSystem) {
        return JSON.stringify({
          success: false,
          message: 'Trading system is not initialized',
        });
      }

      const report = this.tradingSystem.generateSystemReport();

      return JSON.stringify({
        success: true,
        message: '📊 Comprehensive Performance Report Generated',
        report: {
          ...report,
          timestamp: new Date().toISOString(),
          summary: {
            status: report.systemStats.totalPnL > 0 ? '📈 PROFITABLE' : '📉 NEEDS OPTIMIZATION',
            recommendation: report.recommendations.length > 0 
              ? report.recommendations[0] 
              : 'System is performing optimally',
          },
        },
      });

    } catch (error) {
      console.error('Failed to generate performance report:', error);
      return JSON.stringify({
        success: false,
        message: `Failed to generate performance report: ${error}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  supportsNetwork(network: Network): boolean {
    return (
      network.chainId === String(base.id) ||
      network.chainId === String(baseSepolia.id)
    );
  }
}

export const baseMcpTradingActionProvider = () =>
  new BaseMcpTradingActionProvider();