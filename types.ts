
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed?: boolean;
  takerBuyBaseAssetVolume?: number; // For flow analysis
}

export interface FundamentalData {
  marketCap: number;
  totalVolume: number;
  priceChange24h: number; // Percentage
  marketCapRank: number;
  high24h: number;
  low24h: number;
}

export interface OrderBookStats {
  bidVol: number; // Volume total de compra nas primeiras X ordens
  askVol: number; // Volume total de venda nas primeiras X ordens
  imbalance: number; // % de desbalanço (-1 a 1). Positivo = Pressão de Compra
  spread: number;
}

export interface TapeStats {
  buyVolume: number; // Volume agredido na compra (Taker Buy)
  sellVolume: number; // Volume agredido na venda (Taker Sell)
  delta: number; // buyVolume - sellVolume
  totalTrades: number;
  whaleActivity: number; // Volume movimentado em ordens grandes
}

export enum PredictionType {
  UP = 'UP', // Green
  DOWN = 'DOWN', // Red
  NEUTRAL = 'NEUTRAL'
}

export interface DetailedAnalysis {
  graphicAnalysis: string; // Patterns, Support/Resistance
  technicalAnalysis: string; // Indicators (RSI, MACD, etc)
  fundamentalAnalysis: string; // Volume flow, Sentiment inferred
  probabilisticAnalysis: string; // Odds calculation
}

export interface AIPrediction {
  direction: PredictionType;
  confidence: number; // 0 to 100
  reasoning: string; // Main summary
  details: DetailedAnalysis; // The 4 pillars
  timestamp: number; // When the analysis was made
  targetTimestamp: number; // The Start Time of the candle we are predicting (numeric)
  targetCandleTime: string; // String representation
}

export type PredictionOutcome = 'WIN' | 'LOSS' | 'PENDING';

export interface PredictionResult extends AIPrediction {
  outcome: PredictionOutcome;
  actualOpen?: number;
  actualClose?: number;
}

export interface AnalysisResult {
  lastCandle: Candle;
  prediction: AIPrediction | null;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  bollinger: { upper: number; middle: number; lower: number };
  sma7: number;
  sma25: number;
  volumeFlow: number; // Ratio of Taker Buy Volume / Total Volume
}
