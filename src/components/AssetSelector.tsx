import React, { useEffect, useRef } from "react";
import { ForexPair, Signal } from "../types";
import { Globe, TrendingUp, TrendingDown, Sparkles } from "lucide-react";

interface AssetSelectorProps {
  pairs: ForexPair[];
  prices: Record<string, number>;
  selectedPair: ForexPair;
  onSelectPair: (pair: ForexPair) => void;
  activeSignals: Signal[];
  decimalDigits: Record<string, number>;
  syncSource?: string;
}

export const AssetSelector: React.FC<AssetSelectorProps> = ({
  pairs,
  prices,
  selectedPair,
  onSelectPair,
  activeSignals,
  decimalDigits,
  syncSource = "Simulado em Tempo Real",
}) => {
  // Guarda preços anteriores para exibir animação de alteração (piscada verde ou vermelha)
  const prevPricesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    prevPricesRef.current = { ...prices };
  }, [prices]);

  const isSynced = syncSource.includes("Frankfurter");

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col h-full gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 tracking-wider uppercase flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400 animate-spin-slow" />
            Radar de Ativos Forex
          </h3>
          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
            isSynced 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-400/20 active-status"
              : "bg-slate-800 text-slate-400 border-slate-700"
          }`}>
            {isSynced ? "● REAL (BCE)" : "Simulado"}
          </span>
        </div>
        <p className="text-[10px] text-slate-500 text-left leading-normal font-sans pt-0.5">
          {isSynced 
            ? "Cotação diária real sincronizada via Banco Central Europeu com micro-ticks ativos."
            : "Simulação de ticks de Forex off-line ativo."}
        </p>
      </div>

      <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[460px] md:max-h-[700px] pr-1">
        {pairs.map((pair) => {
          const currentPrice = prices[pair.symbol] || pair.basePrice;
          const prevPrice = prevPricesRef.current[pair.symbol] || currentPrice;
          const decimalCount = decimalDigits[pair.symbol] ?? pair.decimalDigits;

          // Determina a direção e cor da mudança (alta ou baixa)
          let flashClass = "text-slate-300 border-slate-800/80 bg-slate-950/20";
          if (currentPrice > prevPrice) {
            flashClass = "text-emerald-400 border-emerald-500/20 bg-emerald-950/20 animate-pulse";
          } else if (currentPrice < prevPrice) {
            flashClass = "text-rose-400 border-rose-500/20 bg-rose-950/20 animate-pulse";
          } else if (selectedPair.symbol === pair.symbol) {
            flashClass = "border-emerald-500/40 bg-slate-950/50 ring-1 ring-emerald-500/10 text-white";
          }

          // Busca alertas pendentes ativos para este par
          const pairSignals = activeSignals.filter(
            (s) => s.pair === pair.symbol && s.status === "PENDING"
          );

          return (
            <div
              key={pair.symbol}
              onClick={() => onSelectPair(pair)}
              id={`asset-${pair.symbol.replace("/", "-")}`}
              className={`p-3 rounded-xl border cursor-pointer transition-all duration-300 group ${
                selectedPair.symbol === pair.symbol
                  ? "border-emerald-500/50 bg-slate-950/40 ring-1 ring-emerald-500/20"
                  : "border-slate-800/60 bg-slate-950/15 hover:border-slate-700/80 hover:bg-slate-950/30"
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-sm text-slate-100 group-hover:text-emerald-300 transition-colors">
                    {pair.symbol}
                  </span>
                  {selectedPair.symbol === pair.symbol && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </div>

                {/* Exibe preço em tamanho real com piscada rápida se mudou */}
                <span className={`font-mono text-sm font-extrabold px-1.5 py-0.5 rounded transition-all duration-300 ${flashClass}`}>
                  {currentPrice.toFixed(decimalCount)}
                </span>
              </div>

              <div className="text-left text-[11px] text-slate-500 leading-tight">
                {pair.description}
              </div>

              {/* Estatísticas adicionais do ativo */}
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/40 text-[10px] font-mono">
                <div className="flex items-center gap-1">
                  {pair.trend > 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-rose-500" />
                  )}
                  <span className={pair.trend > 0 ? "text-emerald-500/80" : "text-rose-500/80"}>
                    {pair.trend > 0 ? "Alta" : "Baixa"} ({(Math.abs(pair.trend) * 10).toFixed(1)}%)
                  </span>
                </div>

                {/* Badge de Alerta Gerado recentemente */}
                {pairSignals.length > 0 ? (
                  <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                    <Sparkles className="w-2.5 h-2.5" />
                    {pairSignals.length} SINAL
                  </span>
                ) : (
                  <span className="text-slate-500 font-mono text-[9px]">
                    Estável
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
