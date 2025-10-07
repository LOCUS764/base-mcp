// Trade execution engine with dynamic limit orders

import type { EvmWalletProvider } from '@coinbase/agentkit';
import type { TradingOrder, TradingSignal, MarketData } from './types.js';
import { MarketDataService } from './market-data.js';

export class TradeExecutor {
  private orders: Map<string, TradingOrder> = new Map();
  private orderCounter = 0;
  private marketDataService: MarketDataService;
  
  // Common token addresses on Base
  private readonly TOKEN_ADDRESSES: Record<string, string> = {
    'ETH': 'ETH', // Native ETH
    'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    'USDT': '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    'DAI': '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    'WETH': '0x4200000000000000000000000000000000000006',
  };

  constructor(
    private walletProvider: EvmWalletProvider,
    marketDataService?: MarketDataService
  ) {
    this.marketDataService = marketDataService || new MarketDataService();
    this.startOrderMonitoring();
  }

  private startOrderMonitoring() {
    // Monitor and execute pending orders every 5 seconds
    setInterval(() => {
      this.processPendingOrders();
    }, 5000);
  }

  async executeSignal(signal: TradingSignal, quantity: number): Promise<TradingOrder> {
    const orderId = this.generateOrderId();
    const marketData = await this.marketDataService.getMarketData(signal.symbol);
    
    if (!marketData) {
      throw new Error(`Unable to get market data for ${signal.symbol}`);
    }

    // Create dynamic limit order based on signal confidence and market conditions
    const order: TradingOrder = {
      id: orderId,
      symbol: signal.symbol,
      type: this.determineBestOrderType(signal, marketData),
      side: signal.action as 'BUY' | 'SELL',
      quantity,
      price: this.calculateOptimalPrice(signal, marketData),
      status: 'PENDING',
      timestamp: Date.now(),
    };

    this.orders.set(orderId, order);
    
    // For high confidence signals, execute immediately as market order
    if (signal.confidence >= 85) {
      return await this.executeMarketOrder(order);
    } else {
      return await this.placeLimitOrder(order);
    }
  }

  private determineBestOrderType(signal: TradingSignal, marketData: MarketData): TradingOrder['type'] {
    // Use market orders for high confidence or volatile conditions
    if (signal.confidence >= 85 || Math.abs(marketData.change24h) > 10) {
      return 'MARKET';
    }
    
    // Use limit orders for better price execution
    return 'LIMIT';
  }

  private calculateOptimalPrice(signal: TradingSignal, marketData: MarketData): number {
    const currentPrice = marketData.price;
    const volatility = Math.abs(marketData.change24h) / 100;
    
    // Calculate price offset based on confidence and volatility
    let priceOffset = 0.001; // Base 0.1% offset
    
    // Increase offset for lower confidence signals
    if (signal.confidence < 70) {
      priceOffset += (70 - signal.confidence) / 1000; // Add up to 3% for low confidence
    }
    
    // Increase offset for high volatility
    priceOffset += volatility * 0.5;
    
    // Cap the offset at 5%
    priceOffset = Math.min(priceOffset, 0.05);
    
    if (signal.action === 'BUY') {
      // Place buy orders slightly below market price
      return currentPrice * (1 - priceOffset);
    } else {
      // Place sell orders slightly above market price
      return currentPrice * (1 + priceOffset);
    }
  }

  private async executeMarketOrder(order: TradingOrder): Promise<TradingOrder> {
    try {
      console.log(`Executing market ${order.side} order for ${order.quantity} ${order.symbol}`);
      
      // Use the swap functionality for token trades
      const result = await this.executeSwapOrder(order);
      
      order.status = 'FILLED';
      order.fillPrice = result.executionPrice;
      order.executionTimestamp = Date.now();
      
      this.orders.set(order.id, order);
      return order;
    } catch (error) {
      console.error(`Market order execution failed:`, error);
      order.status = 'FAILED';
      this.orders.set(order.id, order);
      return order;
    }
  }

  private async placeLimitOrder(order: TradingOrder): Promise<TradingOrder> {
    console.log(`Placing limit ${order.side} order for ${order.quantity} ${order.symbol} at $${order.price}`);
    
    // Store the limit order for monitoring
    this.orders.set(order.id, order);
    return order;
  }

  private async processPendingOrders() {
    const pendingOrders = Array.from(this.orders.values()).filter(
      order => order.status === 'PENDING' && order.type === 'LIMIT'
    );

    for (const order of pendingOrders) {
      try {
        const marketData = await this.marketDataService.getMarketData(order.symbol);
        if (!marketData) continue;

        const shouldExecute = this.shouldExecuteLimitOrder(order, marketData);
        if (shouldExecute) {
          await this.executeMarketOrder(order);
        }
      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error);
      }
    }
  }

  private shouldExecuteLimitOrder(order: TradingOrder, marketData: MarketData): boolean {
    if (!order.price) return false;

    if (order.side === 'BUY') {
      // Execute buy order if market price drops to or below limit price
      return marketData.price <= order.price;
    } else {
      // Execute sell order if market price rises to or above limit price
      return marketData.price >= order.price;
    }
  }

  private async executeSwapOrder(order: TradingOrder): Promise<{ executionPrice: number; hash: string }> {
    const tokenAddress = this.TOKEN_ADDRESSES[order.symbol.toUpperCase()];
    if (!tokenAddress) {
      throw new Error(`Token address not found for ${order.symbol}`);
    }

    let sellToken: string;
    let buyToken: string;
    let sellAmount: string;

    if (order.side === 'BUY') {
      // Buying the token with USDC
      sellToken = this.TOKEN_ADDRESSES['USDC'];
      buyToken = tokenAddress;
      // Calculate USDC amount needed (assuming we have current price)
      const marketData = await this.marketDataService.getMarketData(order.symbol);
      sellAmount = (order.quantity * (marketData?.price || 0)).toString();
    } else {
      // Selling the token for USDC
      sellToken = tokenAddress;
      buyToken = this.TOKEN_ADDRESSES['USDC'];
      sellAmount = order.quantity.toString();
    }

    // Use the existing swap functionality
    const swapParams = {
      sellToken,
      buyToken,
      sellAmount,
      slippageBps: 200, // 2% slippage for automated trading
    };

    // This would integrate with the existing swap action provider
    console.log('Executing swap with params:', swapParams);
    
    // For now, simulate the execution
    const marketData = await this.marketDataService.getMarketData(order.symbol);
    return {
      executionPrice: marketData?.price || 0,
      hash: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock hash
    };
  }

  private generateOrderId(): string {
    return `order_${++this.orderCounter}_${Date.now()}`;
  }

  getOrder(orderId: string): TradingOrder | undefined {
    return this.orders.get(orderId);
  }

  getAllOrders(): TradingOrder[] {
    return Array.from(this.orders.values());
  }

  getPendingOrders(): TradingOrder[] {
    return Array.from(this.orders.values()).filter(order => order.status === 'PENDING');
  }

  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (order && order.status === 'PENDING') {
      order.status = 'CANCELLED';
      this.orders.set(orderId, order);
      return true;
    }
    return false;
  }

  // Method to force execute all pending orders (for emergency situations)
  async executeAllPendingOrders(): Promise<void> {
    const pendingOrders = this.getPendingOrders();
    console.log(`Force executing ${pendingOrders.length} pending orders`);
    
    for (const order of pendingOrders) {
      try {
        await this.executeMarketOrder(order);
      } catch (error) {
        console.error(`Failed to force execute order ${order.id}:`, error);
      }
    }
  }
}