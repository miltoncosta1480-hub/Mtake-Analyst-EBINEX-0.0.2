
import { Candle, FundamentalData, TechnicalIndicators, OrderBookStats, TapeStats } from '../types';

// API Key preserved for reference or backend use.
const USER_BINANCE_API_KEY = 'q8f3PoAV65XSN98u3gT7XXjoMdgdd8NWLVfbMAXYLsXFG3odSH6ZTp00e2e1yo7w';

// Secret Key added as requested. 
// NOTE: Used for signing private requests (trading/balance). Not needed for public market data (Klines/Depth).
const USER_BINANCE_SECRET_KEY = 'ygYwoztb1im5jLx9nVVKhNoKfhx6tHyy0PTFEQzwo7tdgxFPCyLuNyKc4qzex6Qd';

// REST Endpoint for initial history
const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false';

// WebSocket Endpoint
const WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@kline_5m';

// CORS Proxy to bypass browser restrictions
const CORS_PROXY = 'https://corsproxy.io/?';

export const fetchInitialHistory = async (): Promise<Candle[]> => {
  try {
    // We use the proxy and remove custom headers to ensure the browser doesn't block the request (CORS).
    // The endpoint is public.
    const targetUrl = `${BINANCE_BASE_URL}/klines?symbol=BTCUSDT&interval=5m&limit=100`;
    const response = await fetch(`${CORS_PROXY}${targetUrl}`);
    
    if (!response.ok) throw new Error(response.statusText);
    const rawData = await response.json();

    return rawData.map((k: any) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      takerBuyBaseAssetVolume: parseFloat(k[9]), // Index 9 is Taker buy base asset volume
      isClosed: true
    }));
  } catch (error) {
    console.error("Initial fetch failed:", error);
    return [];
  }
};

// Nova função para buscar Profundidade de Mercado (Order Book)
export const fetchOrderBookDepth = async (): Promise<OrderBookStats | null> => {
  try {
    // Limit 20 para pegar as 20 melhores ofertas de compra e venda (Top of Book)
    const targetUrl = `${BINANCE_BASE_URL}/depth?symbol=BTCUSDT&limit=20`;
    const response = await fetch(`${CORS_PROXY}${targetUrl}`);
    
    if (!response.ok) return null;
    const data = await response.json();

    // Calcular volume total de Bids (Compras) e Asks (Vendas)
    const bidVol = data.bids.reduce((acc: number, bid: string[]) => acc + parseFloat(bid[1]), 0);
    const askVol = data.asks.reduce((acc: number, ask: string[]) => acc + parseFloat(ask[1]), 0);
    
    // Imbalance Ratio: (Bid - Ask) / (Bid + Ask)
    // Range de -1 (Só venda) a +1 (Só compra). 0 é neutro.
    const total = bidVol + askVol;
    const imbalance = total === 0 ? 0 : (bidVol - askVol) / total;

    // Spread cálculo
    const bestBid = parseFloat(data.bids[0][0]);
    const bestAsk = parseFloat(data.asks[0][0]);
    const spread = bestAsk - bestBid;

    return {
      bidVol,
      askVol,
      imbalance,
      spread
    };
  } catch (error) {
    console.error("Depth fetch failed:", error);
    return null;
  }
};

// --- TIMES AND TRADES (TAPE READING) ---
export const fetchAggregatedTrades = async (): Promise<TapeStats | null> => {
  try {
    // Busca os últimos 1000 trades executados recentemente
    const targetUrl = `${BINANCE_BASE_URL}/aggTrades?symbol=BTCUSDT&limit=1000`;
    const response = await fetch(`${CORS_PROXY}${targetUrl}`);
    
    if (!response.ok) return null;
    const trades = await response.json();

    let buyVolume = 0;
    let sellVolume = 0;
    let whaleActivity = 0;

    trades.forEach((t: any) => {
      // t.q = quantity, t.p = price, t.m = isBuyerMaker
      const quantity = parseFloat(t.q);
      const isBuyerMaker = t.m; 

      // LÓGICA DE AGRESSÃO:
      // Se isBuyerMaker = true -> O Maker (quem colocou a ordem passiva) era Comprador.
      // Logo, o Taker (quem agrediu) foi um VENDEDOR.
      // Se isBuyerMaker = false -> O Maker era Vendedor. O Taker foi COMPRADOR.

      if (isBuyerMaker) {
        // Agressão de VENDA (Bateram na bid)
        sellVolume += quantity;
      } else {
        // Agressão de COMPRA (Tomaram a ask)
        buyVolume += quantity;
      }

      // Detectar trades grandes (Baleias) - Ex: acima de 0.5 BTC num único trade
      if (quantity >= 0.5) {
        whaleActivity += quantity;
      }
    });

    return {
      buyVolume,
      sellVolume,
      delta: buyVolume - sellVolume,
      totalTrades: trades.length,
      whaleActivity
    };
  } catch (error) {
    console.error("Tape reading failed:", error);
    return null;
  }
};


export const connectBinanceStream = (
  onCandleUpdate: (candle: Candle) => void
) => {
  const ws = new WebSocket(WS_URL);

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.e === 'kline') {
      const k = message.k;
      const candle: Candle = {
        time: k.t,
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
        takerBuyBaseAssetVolume: parseFloat(k.V),
        isClosed: k.x // 'x' is true if candle is closed
      };
      onCandleUpdate(candle);
    }
  };

  return () => ws.close();
};

export const fetchCryptoFundamentals = async (): Promise<FundamentalData | null> => {
  try {
    const response = await fetch(COINGECKO_API_URL);
    if (!response.ok) return null;
    const data = await response.json();
    const marketData = data.market_data;

    return {
      marketCap: marketData.market_cap.usd,
      totalVolume: marketData.total_volume.usd,
      priceChange24h: marketData.price_change_percentage_24h,
      marketCapRank: marketData.market_cap_rank,
      high24h: marketData.high_24h.usd,
      low24h: marketData.low_24h.usd
    };
  } catch (error) {
    console.error("Fundamentas fetch failed:", error);
    return null;
  }
};

// --- Technical Analysis Lib (Mini) ---

export const calculateTechnicalIndicators = (history: Candle[]): TechnicalIndicators => {
  const closes = history.map(c => c.close);
  const lastIndex = closes.length - 1;
  const current = history[lastIndex];

  // 1. RSI (14)
  const rsi = calculateRSI(closes, 14);

  // 2. SMA
  const sma7 = calculateSMA(closes, 7);
  const sma25 = calculateSMA(closes, 25);

  // 3. Bollinger Bands (20, 2)
  const bollinger = calculateBollinger(closes, 20, 2);

  // 4. MACD (12, 26, 9)
  const macd = calculateMACD(closes, 12, 26, 9);

  // 5. Volume Flow (Taker Buy Ratio)
  // If takerBuyVolume is high relative to total volume, it indicates aggressive buying
  const volFlow = current.takerBuyBaseAssetVolume && current.volume > 0 
    ? (current.takerBuyBaseAssetVolume / current.volume) 
    : 0.5;

  return {
    rsi: rsi[rsi.length - 1] || 50,
    sma7: sma7[sma7.length - 1] || 0,
    sma25: sma25[sma25.length - 1] || 0,
    bollinger: bollinger,
    macd: macd,
    volumeFlow: volFlow
  };
};

// --- Math Helpers ---

const calculateSMA = (data: number[], period: number): number[] => {
  let result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(data[i]); // Fallback
      continue;
    }
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
};

const calculateRSI = (data: number[], period: number): number[] => {
  if (data.length < period) return Array(data.length).fill(50);
  
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  const rsiArray = [];
  // Fill initial padding
  for(let k=0; k<=period; k++) rsiArray.push(50);

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1) + 0) / period;
    } else {
      avgGain = (avgGain * (period - 1) + 0) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiArray.push(100 - (100 / (1 + rs)));
  }
  return rsiArray;
};

const calculateBollinger = (data: number[], period: number, stdDevMultiplier: number) => {
  if (data.length < period) return { upper: 0, lower: 0, middle: 0 };
  
  const slice = data.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const squaredDiffs = slice.map(x => Math.pow(x - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    middle: mean,
    upper: mean + (stdDev * stdDevMultiplier),
    lower: mean - (stdDev * stdDevMultiplier)
  };
};

const calculateMACD = (data: number[], shortPeriod: number, longPeriod: number, signalPeriod: number) => {
  const emaShort = calculateEMA(data, shortPeriod);
  const emaLong = calculateEMA(data, longPeriod);
  
  // MACD Line
  const macdLine = emaShort.map((val, i) => val - emaLong[i]);
  
  // Signal Line (EMA of MACD Line)
  // We only care about the last values effectively
  const signalLine = calculateEMA(macdLine, signalPeriod);
  
  const lastMacd = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  
  return {
    macd: lastMacd,
    signal: lastSignal,
    histogram: lastMacd - lastSignal
  };
};

const calculateEMA = (data: number[], period: number): number[] => {
  const k = 2 / (period + 1);
  const result = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  return result;
};
