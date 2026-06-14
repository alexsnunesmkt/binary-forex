import React from "react";
import { TrendingUp, Volume2, VolumeX, ShieldCheck, Activity, Award, BarChart3 } from "lucide-react";

interface HeaderProps {
  winCount: number;
  lossCount: number;
  payout: number;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  systemTime: string;
}

export const Header: React.FC<HeaderProps> = ({
  winCount,
  lossCount,
  payout,
  soundEnabled,
  setSoundEnabled,
  systemTime,
}) => {
  const totalSignals = winCount + lossCount;
  const winRate = totalSignals > 0 ? Math.round((winCount / totalSignals) * 100) : 100;

  return (
    <header className="bg-slate-900 border-b border-slate-800 p-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-50">
      {/* Logos & status */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-tr from-yellow-500 to-emerald-500 p-2 rounded-xl shadow-lg ring-1 ring-emerald-400/20">
          <TrendingUp className="w-6 h-6 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            BinaryForex <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 px-2 py-0.5 rounded font-mono">SCANNER v4.2</span>
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Sinais Algorítmicos em Tempo Real baseados em Indicadores Forex
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-950/40 p-2 rounded-2xl border border-slate-800/60">
        {/* Win Rate */}
        <div className="flex items-center gap-2.5 px-3 py-1 bg-slate-950/60 rounded-xl border border-slate-800/40">
          <Award className="w-4 h-4 text-emerald-400" />
          <div className="text-left">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest leading-none">Taxa de Acerto</p>
            <p className="text-sm font-bold text-emerald-400 font-mono">
              {winRate}% <span className="text-[10px] text-slate-400">({winCount}v / {lossCount}d)</span>
            </p>
          </div>
        </div>

        {/* Payout */}
        <div className="flex items-center gap-2.5 px-3 py-1 bg-slate-950/60 rounded-xl border border-slate-800/40">
          <BarChart3 className="w-4 h-4 text-yellow-400" />
          <div className="text-left">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest leading-none">Payout Médio</p>
            <p className="text-sm font-bold text-yellow-400 font-mono">
              {Math.round(payout * 100)}%
            </p>
          </div>
        </div>

        {/* Server Status Indicators */}
        <div className="flex items-center gap-2.5 px-3 py-1 bg-slate-950/60 rounded-xl border border-slate-800/40">
          <Activity className="w-4 h-4 text-cyan-400" />
          <div className="text-left">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest leading-none">Sinal Forex</p>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              CONECTADO
            </div>
          </div>
        </div>
      </div>

      {/* Connection Time & Sound Controls */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-[10px] text-slate-500 font-mono uppercase">Horário Local</p>
          <span className="font-mono text-sm text-slate-200 font-bold">{systemTime}</span>
        </div>

        <div className="h-8 w-[1px] bg-slate-800 hidden sm:block" />

        {/* Sound toggle button */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`relative p-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
            soundEnabled
              ? "bg-slate-800 text-yellow-400 hover:bg-slate-700 ring-1 ring-yellow-400/30"
              : "bg-slate-950 text-slate-500 hover:bg-slate-900 border border-slate-800"
          }`}
          title={soundEnabled ? "Desativar alertas sonoros" : "Ativar alertas sonoros"}
          id="sound-opt-toggle"
        >
          {soundEnabled ? (
            <Volume2 className="w-5 h-5 animate-bounce-slow" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </button>
      </div>
    </header>
  );
};
