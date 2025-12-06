
import React from 'react';
import { AIPrediction, PredictionType } from '../types';
import { ArrowUp, ArrowDown, Activity, BarChart2, Search, Percent, Zap } from 'lucide-react';

interface PredictionPanelProps {
  prediction: AIPrediction | null;
  loading: boolean;
  secondsRemaining: number;
}

const PredictionPanel: React.FC<PredictionPanelProps> = ({ prediction, loading, secondsRemaining }) => {
  
  // Loading State
  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-xl flex flex-col items-center justify-center h-full min-h-[400px] border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse"></div>
          <Activity size={48} className="text-blue-400 mb-4 animate-bounce relative z-10" />
        </div>
        <h2 className="text-xl font-bold text-white animate-pulse">Processando Dados...</h2>
        <div className="mt-4 space-y-2 w-full max-w-xs text-center">
           <p className="text-xs text-blue-300 font-mono">Cruzando Order Book com Fluxo de Taker...</p>
           <p className="text-xs text-purple-300 font-mono">Calculando Probabilidades Gemini 3 Pro...</p>
        </div>
      </div>
    );
  }

  // Initial State (No prediction yet)
  if (!prediction) {
    return (
      <div className="glass-panel p-6 rounded-xl flex flex-col items-center justify-center h-full min-h-[300px] border border-dashed border-gray-700 bg-gray-900/20">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4 border border-gray-700">
           <Zap size={32} className="text-gray-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-400">Pronto para Analisar</h2>
        <p className="text-gray-500 mt-2 text-center text-sm max-w-[240px]">
          Clique no botão "Gerar Sinal Agora" para cruzar dados da Binance em tempo real e obter uma previsão da IA.
        </p>
      </div>
    );
  }

  const isUp = prediction.direction === PredictionType.UP;
  const isNeutral = prediction.direction === PredictionType.NEUTRAL;
  const colorClass = isNeutral 
    ? 'text-gray-400 border-gray-500' 
    : isUp 
      ? 'text-green-450 border-green-450 shadow-[0_0_30px_rgba(74,222,128,0.15)] bg-green-450/10' 
      : 'text-red-450 border-red-450 shadow-[0_0_30px_rgba(248,113,113,0.15)] bg-red-450/10';

  return (
    <div className="glass-panel p-6 rounded-xl flex flex-col relative overflow-hidden border border-gray-800">
      
      {/* Result Header */}
      <div className="flex flex-col items-center justify-center mb-6 border-b border-gray-800 pb-6 relative">
        <div className="absolute top-0 right-0 text-[10px] font-mono text-gray-500">
           Target: {prediction.targetCandleTime}
        </div>

        <span className="text-xs text-gray-400 font-mono uppercase tracking-widest mb-3">Sinal Gerado</span>
        
        <div className={`w-full max-w-[240px] py-4 rounded-2xl border flex flex-col items-center justify-center gap-2 ${colorClass}`}>
           <div className="flex items-center gap-3">
              {isUp ? <ArrowUp size={48} strokeWidth={3} /> : <ArrowDown size={48} strokeWidth={3} />}
              <span className="text-4xl font-black tracking-tighter">{prediction.direction}</span>
           </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs font-mono text-gray-400">
           <span>Confiança IA:</span>
           <span className={`text-white font-bold ${prediction.confidence > 75 ? 'text-green-400' : 'text-yellow-400'}`}>
             {prediction.confidence}%
           </span>
        </div>
      </div>

      {/* Reasoning (Summary) */}
      <div className="mb-6 bg-gray-900/50 p-3 rounded-lg border border-gray-800">
        <p className="text-sm text-gray-300 text-center italic">"{prediction.reasoning}"</p>
      </div>

      {/* The 4 Pillars Grid */}
      <div className="grid grid-cols-1 gap-3">
        
        {/* Technical & Graphic Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700/30">
            <div className="flex items-center gap-2 mb-1 text-blue-400">
              <BarChart2 size={14} />
              <h4 className="text-[10px] font-bold uppercase">Gráfica</h4>
            </div>
            <p className="text-[11px] text-gray-400 leading-tight">{prediction.details.graphicAnalysis}</p>
          </div>
          <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700/30">
            <div className="flex items-center gap-2 mb-1 text-purple-400">
              <Activity size={14} />
              <h4 className="text-[10px] font-bold uppercase">Técnica</h4>
            </div>
            <p className="text-[11px] text-gray-400 leading-tight">{prediction.details.technicalAnalysis}</p>
          </div>
        </div>

        {/* Fundamental & Probabilistic Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700/30">
            <div className="flex items-center gap-2 mb-1 text-yellow-400">
              <Search size={14} />
              <h4 className="text-[10px] font-bold uppercase">Fundamentos</h4>
            </div>
            <p className="text-[11px] text-gray-400 leading-tight">{prediction.details.fundamentalAnalysis}</p>
          </div>
          <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700/30">
            <div className="flex items-center gap-2 mb-1 text-pink-400">
              <Percent size={14} />
              <h4 className="text-[10px] font-bold uppercase">Probabilidade</h4>
            </div>
            <p className="text-[11px] text-gray-400 leading-tight">{prediction.details.probabilisticAnalysis}</p>
          </div>
        </div>

      </div>
      
      <div className="mt-4 text-[10px] text-gray-600 text-center font-mono">
        Análise gerada em: {new Date(prediction.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default PredictionPanel;
