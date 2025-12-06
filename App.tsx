
import React, { useState, useEffect, useRef } from 'react';
import { fetchInitialHistory, fetchCryptoFundamentals, fetchOrderBookDepth, connectBinanceStream, fetchAggregatedTrades } from './services/marketDataService';
import { analyzeMarket } from './services/geminiService';
import { Candle, AIPrediction, PredictionResult, PredictionType } from './types';
import PredictionPanel from './components/PredictionPanel';
import HistoryPanel from './components/HistoryPanel';
import { Zap, Wifi, AlertTriangle, Activity, History, Layers, MousePointerClick, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  // Data States
  const [history, setHistory] = useState<Candle[]>([]); // Candle History
  const [currentCandle, setCurrentCandle] = useState<Candle | null>(null);
  
  // App Logic States
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<PredictionResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Timer State (Visual only now)
  const [secondsUntilClose, setSecondsUntilClose] = useState<number>(0);
  const [nextCandleTime, setNextCandleTime] = useState<string>("");

  useEffect(() => {
    // 1. Initial Load (REST)
    const init = async () => {
      const hist = await fetchInitialHistory();
      if (hist && hist.length > 0) {
        setHistory(hist);
        console.log("History loaded:", hist.length, "candles");
      }
    };
    init();

    // 2. WebSocket Connection (Real-time)
    const disconnect = connectBinanceStream((updatedCandle) => {
      setCurrentCandle(updatedCandle);
      
      // TRIGGER: CANDLE CLOSED
      if (updatedCandle.isClosed) {
        // A. Update History Graph Data
        setHistory(prev => {
          const newHist = [...prev, updatedCandle];
          return newHist.slice(-100); // Keep last 100
        });

        // B. VALIDATE PREVIOUS PREDICTIONS (WIN/LOSS)
        // Check if we have any PENDING prediction that was targeting THIS candle.
        validatePrediction(updatedCandle);
      }
    });

    return () => disconnect();
  }, []);

  // 3. Timer Loop (Just for UI display now, no auto-trigger)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const interval = 5 * 60 * 1000; // 5 minutes
      
      // Calculate Next Close
      const currentIntervalStart = Math.floor(now / interval) * interval;
      const nextCloseTimestamp = currentIntervalStart + interval;
      
      const diffSeconds = Math.floor((nextCloseTimestamp - now) / 1000);
      setSecondsUntilClose(diffSeconds);
      setNextCandleTime(new Date(nextCloseTimestamp).toLocaleTimeString());
    }, 1000);

    return () => clearInterval(timer);
  }, []); 

  // Function to validate prediction result
  const validatePrediction = (closedCandle: Candle) => {
    setPredictionHistory(prev => prev.map(pred => {
      // Logic: If this prediction was targeting the candle that started at 'closedCandle.time'
      if (pred.outcome === 'PENDING' && pred.targetTimestamp === closedCandle.time) {
        
        const isGreen = closedCandle.close > closedCandle.open;
        let result: 'WIN' | 'LOSS' = 'LOSS';

        if (pred.direction === PredictionType.UP && isGreen) result = 'WIN';
        if (pred.direction === PredictionType.DOWN && !isGreen) result = 'WIN';
        if (pred.direction === PredictionType.NEUTRAL) result = 'LOSS'; 

        return {
          ...pred,
          outcome: result,
          actualOpen: closedCandle.open,
          actualClose: closedCandle.close
        };
      }
      return pred;
    }));
  };

  const handleManualAnalysis = async () => {
    if (!currentCandle || loading) return;
    
    // Switch to live tab if not already
    setActiveTab('live');
    setLoading(true);
    setErrorMsg(null);

    try {
      // Parallel Fetch for efficiency
      // AGORA INCLUI TAPE STATS (Times & Trades)
      const [fundamentals, orderBook, tapeStats] = await Promise.all([
        fetchCryptoFundamentals(),
        fetchOrderBookDepth(),
        fetchAggregatedTrades() // Nova chamada
      ]);

      const result = await analyzeMarket(history, currentCandle, fundamentals, orderBook, tapeStats);
      
      setPrediction(result);

      // Add to History as PENDING
      setPredictionHistory(prev => [
        ...prev, 
        { ...result, outcome: 'PENDING' }
      ]);
      
    } catch (e: any) {
      console.error("Analysis failed", e);
      setErrorMsg(e.message || "Erro desconhecido ao conectar com a IA.");
    } finally {
      setLoading(false);
    }
  };

  // Safe current price logic
  const currentPrice = currentCandle 
    ? currentCandle.close 
    : (history.length > 0 ? history[history.length-1].close : 0);
    
  const isPriceUp = currentCandle 
    ? currentCandle.close >= currentCandle.open 
    : (history.length > 0 ? history[history.length-1].close >= history[history.length-1].open : false);

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans flex flex-col items-center">
      
      {/* Header */}
      <header className="w-full max-w-2xl p-6 flex justify-between items-center border-b border-gray-800/50 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap className="text-white fill-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">CryptoOracle AI</h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-blue-400 font-mono uppercase">Mode: Real-Time</span>
              <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-900/20 px-1.5 rounded border border-green-800">
                <Wifi size={8} /> WS Connected
              </span>
              <span className="flex items-center gap-1 text-[10px] text-yellow-400 bg-yellow-900/20 px-1.5 rounded border border-yellow-800" title="Full Access">
                <ShieldCheck size={8} /> Auth Verified
              </span>
            </div>
          </div>
        </div>
        
        <div className={`text-right transition-colors duration-300 ${isPriceUp ? 'text-green-400' : 'text-red-400'}`}>
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center justify-end gap-1">
            BTC/USDT LIVE
          </div>
          <div className="font-mono text-xl font-bold">
            ${currentPrice > 0 ? currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-md px-4 flex flex-col items-center gap-6 flex-1 mb-8">
        
        {errorMsg && (
          <div className="w-full bg-red-900/20 border border-red-700/50 p-3 rounded-lg flex items-center gap-3 text-xs text-red-200">
             <AlertTriangle size={16} className="text-red-500 shrink-0" />
             <p>{errorMsg}</p>
          </div>
        )}

        {/* Info Bar */}
        <div className="w-full bg-gray-900/50 border border-gray-800 rounded-xl p-3 flex items-center justify-between text-xs font-mono text-gray-400">
          <div>
             <span>Target: </span>
             <span className="text-white font-bold">{nextCandleTime || '--:--'}</span>
          </div>
          <div>
             <span>Fecha em: </span>
             <span className="text-blue-400 font-bold">{secondsUntilClose}s</span>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleManualAnalysis}
          disabled={loading || !currentCandle}
          className={`
            w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-3
            ${loading || !currentCandle 
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/30 hover:shadow-blue-500/50 hover:from-blue-500 hover:to-indigo-500'}
          `}
        >
          {loading ? (
             <>
               <Activity className="animate-spin" size={24} />
               Lendo Tape & Book...
             </>
          ) : (
             <>
               <MousePointerClick size={24} />
               GERAR SINAL AGORA
             </>
          )}
        </button>

        {/* Navigation Tabs */}
        <div className="w-full flex bg-gray-900/50 p-1 rounded-xl border border-gray-800">
           <button 
             onClick={() => setActiveTab('live')}
             className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'live' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
           >
             <Activity size={16} /> Painel de Sinal
           </button>
           <button 
             onClick={() => setActiveTab('history')}
             className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
           >
             <History size={16} /> Histórico ({predictionHistory.filter(h => h.outcome !== 'PENDING').length})
           </button>
        </div>

        {/* View Content */}
        <div className="w-full h-full min-h-[400px]">
           {activeTab === 'live' ? (
             <PredictionPanel 
               prediction={prediction} 
               loading={loading} 
               secondsRemaining={secondsUntilClose}
             />
           ) : (
             <HistoryPanel history={predictionHistory} />
           )}
        </div>

      </main>

      <div className="py-4 text-center text-gray-700 text-[10px] font-mono">
         CryptoOracle AI • Tape Reading Enabled • Gemini 3 Pro
      </div>
    </div>
  );
};

export default App;
