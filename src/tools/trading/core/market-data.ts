// Market data fetching and management service

import type { MarketData } from './types.js';

export class MarketDataService {
  private dataCache: Map<string, MarketData> = new Map();
  private lastUpdateTime: number = 0;
  private readonly UPDATE_INTERVAL = 10000; // 10 seconds

  constructor() {
    this.startDataUpdates();
  }

  private startDataUpdates() {
    setInterval(() => {
      this.updateAllMarketData();
    }, this.UPDATE_INTERVAL);
  }

  async getMarketData(symbol: string): Promise<MarketData | null> {
    // Check cache first
    if (this.dataCache.has(symbol)) {
      const cached = this.dataCache.get(symbol)!;
      if (Date.now() - cached.timestamp < this.UPDATE_INTERVAL) {
        return cached;
      }
    }

    // Fetch fresh data
    try {
      const data = await this.fetchMarketDataFromAPI(symbol);
      this.dataCache.set(symbol, data);
      return data;
    } catch (error) {
      console.error(`Failed to fetch market data for ${symbol}:`, error);
      return this.dataCache.get(symbol) || null;
    }
  }

  private async fetchMarketDataFromAPI(symbol: string): Promise<MarketData> {
    // Using CoinGecko API as a free alternative
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${this.symbolToCoingeckoId(symbol)}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const coinId = this.symbolToCoingeckoId(symbol);
    const coinData = data[coinId];

    if (!coinData) {
      throw new Error(`No data found for symbol ${symbol}`);
    }

    return {
      symbol,
      price: coinData.usd,
      volume: coinData.usd_24h_vol || 0,
      change24h: coinData.usd_24h_change || 0,
      timestamp: Date.now(),
      high24h: coinData.usd * (1 + Math.abs(coinData.usd_24h_change || 0) / 100),
      low24h: coinData.usd * (1 - Math.abs(coinData.usd_24h_change || 0) / 100),
      marketCap: coinData.usd_market_cap,
    };
  }

  private symbolToCoingeckoId(symbol: string): string {
    const symbolMap: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'ADA': 'cardano',
      'BCH': 'bitcoin-cash',
      'LTC': 'litecoin',
      'DOT': 'polkadot',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'AAVE': 'aave',
      'COMP': 'compound-governance-token',
      'MKR': 'maker',
      'SNX': 'synthetix-network-token',
      'SUSHI': 'sushi'
    };

    return symbolMap[symbol.toUpperCase()] || symbol.toLowerCase();
  }

  private async updateAllMarketData() {
    const symbols = Array.from(this.dataCache.keys());
    for (const symbol of symbols) {
      try {
        await this.getMarketData(symbol);
      } catch (error) {
        console.error(`Failed to update data for ${symbol}:`, error);
      }
    }
    this.lastUpdateTime = Date.now();
  }

  getMultipleMarketData(symbols: string[]): Promise<(MarketData | null)[]> {
    return Promise.all(symbols.map(symbol => this.getMarketData(symbol)));
  }

  async getTopVolumePairs(limit: number = 10): Promise<MarketData[]> {
    // Get top trading pairs by volume
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch top volume pairs: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.map((coin: any) => ({
      symbol: coin.symbol.toUpperCase(),
      price: coin.current_price,
      volume: coin.total_volume,
      change24h: coin.price_change_percentage_24h || 0,
      timestamp: Date.now(),
      high24h: coin.high_24h || coin.current_price,
      low24h: coin.low_24h || coin.current_price,
      marketCap: coin.market_cap,
    }));
  }
}