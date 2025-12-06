import React from 'react';
import { PredictionResult, PredictionType } from '../types';
import { Trophy, XCircle, Clock, TrendingUp } from 'lucide-react';

interface HistoryPanelProps {
  history: PredictionResult[];
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history }) => {
  // Calculate Stats
  const completed = history.filter(h => h.outcome !== 'PENDING');
  const wins = completed.filter(h => h.outcome === 'WIN').length;
  const total = completed.length;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="w-full h-full flex flex-col gap-4">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-panel p-3 rounded-xl border border-gray-700/50 flex flex-col items-center">
          <span className="text-[10px] text-gray-400 font-mono uppercase">Win Rate</span>
          <span className={`text-xl font-bold ${Number(winRate) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
            {winRate}%
          </span>
        </div>
        <div className="glass-panel p-3 rounded-xl border border-gray-700/50 flex flex-col items-center">
          <span className="text-[10px] text-gray-400 font-mono uppercase">Gains</span>
          <span className="text-xl font-bold text-green-400">{wins}</span>
        </div>
        <div className="glass-panel p-3 rounded-xl border border-gray-700/50 flex flex-col items-center">
          <span className="text-[10px] text-gray-400 font-mono uppercase">Total</span>
          <span className="text-xl font-bold text-blue-400">{total}</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 glass-panel rounded-xl overflow-hidden flex flex-col border border-gray-800">
        <div className="p-3 bg-gray-800/50 border-b border-gray-700 text-[10px] font-mono uppercase text-gray-400 flex justify-between">
           <span>Target Candle</span>
           <span>Signal vs Result</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {history.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm">
                <Clock size={24} className="mb-2 opacity-50"/>
                <p>Nenhum sinal registrado ainda.</p>
             </div>
          ) : (
            [...history].reverse().map((item, idx) => (
              <div key={idx} className="bg-gray-800/20 p-3 rounded-lg border border-gray-700/30 flex items-center justify-between">
                
                {/* Time & Direction */}
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-gray-300">{item.targetCandleTime}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.direction === PredictionType.UP ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {item.direction}
                    </span>
                    <span className="text-[10px] text-gray-500">{item.confidence}%</span>
                  </div>
                </div>

                {/* Outcome */}
                <div className="flex items-center">
                   {item.outcome === 'PENDING' && (
                     <span className="flex items-center gap-1 text-xs text-yellow-500 font-mono bg-yellow-900/10 px-2 py-1 rounded-full border border-yellow-900/30">
                        <Clock size={12} /> Pending
                     </span>
                   )}
                   {item.outcome === 'WIN' && (
                     <span className="flex items-center gap-1 text-xs text-green-400 font-bold font-mono bg-green-900/10 px-2 py-1 rounded-full border border-green-900/30 shadow-[0_0_10px_rgba(74,222,128,0.1)]">
                        <Trophy size={12} /> GAIN
                     </span>
                   )}
                   {item.outcome === 'LOSS' && (
                     <span className="flex items-center gap-1 text-xs text-red-400 font-bold font-mono bg-red-900/10 px-2 py-1 rounded-full border border-red-900/30">
                        <XCircle size={12} /> LOSS
                     </span>
                   )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};

export default HistoryPanel;