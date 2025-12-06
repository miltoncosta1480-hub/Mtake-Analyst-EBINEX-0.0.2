
import { GoogleGenAI, Type } from "@google/genai";
import { Candle, AIPrediction, PredictionType, FundamentalData, TechnicalIndicators, OrderBookStats, TapeStats } from "../types";
import { calculateTechnicalIndicators } from "./marketDataService";

const API_KEY = process.env.API_KEY;

export const analyzeMarket = async (
  history: Candle[], 
  currentPartialCandle: Candle,
  fundamentals: FundamentalData | null,
  orderBook: OrderBookStats | null,
  tapeStats: TapeStats | null
): Promise<AIPrediction> => {
  
  // Combine history + current partial candle for calculation
  const fullData = [...history, currentPartialCandle];
  const indicators: TechnicalIndicators = calculateTechnicalIndicators(fullData);

  // Calculate timestamp for the NEXT candle (the one we predicted)
  // Logic: Current Time -> Round up to next 5m block
  // This is the START time of the target candle
  const nextCandleTimestamp = Math.ceil(Date.now() / 300000) * 300000;
  const nextCandleTimeStr = new Date(nextCandleTimestamp).toLocaleTimeString();

  if (!API_KEY) {
    throw new Error("Chave API do Gemini não configurada (process.env.API_KEY). Impossível realizar análise real.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const fundamentalContext = fundamentals ? `
    DADOS FUNDAMENTAIS (CoinGecko):
    - 24h Change: ${fundamentals.priceChange24h.toFixed(2)}%
    - 24h Vol: $${(fundamentals.totalVolume / 1e9).toFixed(2)}B
    - Rank: #${fundamentals.marketCapRank}
  ` : "Dados fundamentais externos indisponíveis.";

  const orderBookContext = orderBook ? `
    DADOS DE PROFUNDIDADE (ORDER BOOK):
    - Bid Volume (Suporte/Intenção de Compra): ${orderBook.bidVol.toFixed(2)} BTC
    - Ask Volume (Resistência/Intenção de Venda): ${orderBook.askVol.toFixed(2)} BTC
    - Imbalance: ${(orderBook.imbalance * 100).toFixed(2)}% (${orderBook.imbalance > 0 ? "Mais compradores passivos" : "Mais vendedores passivos"})
  ` : "Dados de Order Book não disponíveis.";

  const tapeContext = tapeStats ? `
    ### DADOS CRÍTICOS: TIMES & TRADES (TAPE READING - FLUXO REAL) ###
    Análise dos últimos 1000 trades executados (Agressão a Mercado):
    - Volume Agressor na Compra (Taker Buy): ${tapeStats.buyVolume.toFixed(2)} BTC
    - Volume Agressor na Venda (Taker Sell): ${tapeStats.sellVolume.toFixed(2)} BTC
    - DELTA (Compra - Venda): ${tapeStats.delta.toFixed(2)} BTC
    - Atividade Institucional (Baleias > 0.5 BTC): ${tapeStats.whaleActivity.toFixed(2)} BTC movimentados
    
    COMO INTERPRETAR O TAPE:
    1. Delta POSITIVO alto: Muita agressão de compra (Compradores aceitando pagar mais caro).
    2. Delta NEGATIVO alto: Muita agressão de venda (Vendedores aceitando vender mais barato).
  ` : "Dados de Tape Reading (Fluxo) não disponíveis.";

  const prompt = `
    ATUE COMO UM ALGORITMO DE TRADING INSTITUCIONAL (HFT/Scalping).
    
    MOMENTO DA ANÁLISE: Agora.
    OBJETIVO: Prever a direção da PRÓXIMA vela (que abre em ${nextCandleTimeStr}).

    DADOS TÉCNICOS:
    - Preço Atual: $${currentPartialCandle.close}
    - RSI (14): ${indicators.rsi.toFixed(2)} (Acima de 70=Sobrecompra, Abaixo de 30=Sobrevenda)
    - Bandas de Bollinger: Upper ${indicators.bollinger.upper.toFixed(2)} / Lower ${indicators.bollinger.lower.toFixed(2)}
    - MACD Histogram: ${indicators.macd.histogram.toFixed(4)}

    ${orderBookContext}

    ${tapeContext}

    ${fundamentalContext}

    REGRA DE DECISÃO SUPREMA (DATA CROSSING - TAPE READING + ORDER BOOK):
    Você deve cruzar a INTENÇÃO (Order Book) com a EXECUÇÃO (Tape Reading).
    
    CENÁRIOS:
    1. **Rompimento Confirmado:** O Book tem uma parede de venda (Ask alto), mas o Tape mostra um DELTA POSITIVO massivo com Baleias comprando. ISSO É SINAL DE ALTA (Rompimento).
    2. **Absorção (Reversão):** O preço cai, chega num suporte do Book (Bid alto), e o Tape mostra Delta Positivo (Compradores absorvendo vendas a mercado). ISSO É SINAL DE ALTA.
    3. **Exaustão:** Preço sobe, mas o Delta vira Negativo (Falta comprador agressor). ISSO É SINAL DE BAIXA.
    4. **Tendência Pura:** RSI indica tendência, Delta confirma a direção da tendência e Book tem pouco imbalance contrário.

    TAREFA:
    Analise os dados. Dê peso maior ao FLUXO (Tape/Delta) se houver divergência com indicadores atrasados (RSI/MACD).
    Retorne a direção (UP, DOWN ou NEUTRAL) para a próxima vela de 5m.

    FORMATO JSON:
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            direction: { type: Type.STRING, enum: ["UP", "DOWN", "NEUTRAL"] },
            confidence: { type: Type.NUMBER, description: "0 to 100" },
            reasoning: { type: Type.STRING, description: "Sintetize a leitura do fluxo (Delta) vs Book." },
            details: {
              type: Type.OBJECT,
              properties: {
                graphicAnalysis: { type: Type.STRING },
                technicalAnalysis: { type: Type.STRING },
                fundamentalAnalysis: { type: Type.STRING },
                probabilisticAnalysis: { type: Type.STRING },
              },
              required: ["graphicAnalysis", "technicalAnalysis", "fundamentalAnalysis", "probabilisticAnalysis"]
            }
          },
          required: ["direction", "confidence", "reasoning", "details"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("A IA não retornou dados. Tente novamente.");

    const result = JSON.parse(jsonText);
    
    return {
      direction: result.direction as PredictionType,
      confidence: result.confidence,
      reasoning: result.reasoning,
      details: result.details,
      timestamp: Date.now(),
      targetTimestamp: nextCandleTimestamp,
      targetCandleTime: nextCandleTimeStr
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
