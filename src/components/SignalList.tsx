import React from "react";
import { Signal, Timeframe } from "../types";
import { ArrowUpRight, ArrowDownRight, Brain, Clock, ShieldCheck, HelpCircle, Activity, Sparkles, CheckCircle2, XCircle } from "lucide-react";

interface SignalListProps {
  signals: Signal[];
  timeframe: Timeframe;
  onVerifyAi: (signalId: string) => void;
  payout: number;
}

export const SignalList: React.FC<SignalListProps> = ({
  signals,
  timeframe,
  onVerifyAi,
  payout,
}) => {
  // Filtra de acordo com a aba selecionada se necessário, mas exibir todos filtrados por tempo ou geral é ótimo
  const pendingSignals = signals.filter((s) => s.status === "PENDING");
  const completedSignals = signals
    .filter((s) => s.status !== "PENDING")
    .sort((a, b) => b.expirationTime - a.expirationTime)
    .slice(0, 40); // Últimos 40 resolvidos de forma mais recente no topo para histórico navegável

  // Formata o preço de acordo com o par para evitar números com dízimas gigantescas
  const formatPrice = (price: number | undefined, pairSymbol: string) => {
    if (price === undefined || price === null) return "-";
    const decimals = pairSymbol.toUpperCase().includes("JPY") ? 3 : 5;
    return price.toFixed(decimals);
  };

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* 1. SINAIS ATIVOS / EM AGUARDO */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 border-b border-slate-800/60 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Sinais Ativos ({pendingSignals.length})
            </h3>
          </div>
          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 px-2 py-0.5 rounded-full font-mono font-bold animate-pulse self-start sm:self-auto">
            Tempo Real ({timeframe})
          </span>
        </div>

        {pendingSignals.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-xl p-6 text-center text-slate-500 text-xs">
            <Clock className="w-5 h-5 mx-auto mb-2 text-slate-600 animate-spin-slow" />
            Aguardando cruzamento de indicadores para gerar novos sinais...
          </div>
        ) : (
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[280px] pr-1">
            {pendingSignals.map((signal, idx) => {
              const minutesLeft = Math.max(0, Math.ceil((signal.expirationTime - Date.now()) / 1000));
              const isCall = signal.type === "CALL";

              return (
                <div
                  key={`${signal.id}-${signal.status}-${idx}`}
                  id={`signal-card-${signal.id}`}
                  className={`p-3.5 rounded-xl border relative overflow-hidden transition-all duration-300 shrink-0 ${
                    isCall
                      ? "bg-emerald-950/15 border-emerald-500/25 hover:border-emerald-500/50"
                      : "bg-rose-950/15 border-rose-500/25 hover:border-rose-500/50"
                  }`}
                >
                  {/* Tipo de sinal (CALL/PUT) */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-md flex items-center gap-1 font-mono tracking-wider ${
                          isCall ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {isCall ? (
                          <>
                            <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
                            COMPRA (CALL)
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="w-3.5 h-3.5 stroke-[3]" />
                            VENDA (PUT)
                          </>
                        )}
                      </span>
                      <span className="font-mono text-xs font-bold text-white">
                        {signal.pair}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-yellow-400" />
                      <span>{minutesLeft}s p/ expiração</span>
                    </div>
                  </div>

                  {/* Informações detalhadas da Entrada */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/40 text-xs font-mono mb-3">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Preço Entrada</span>
                      <span className="text-slate-200 font-bold">{formatPrice(signal.entryPrice, signal.pair)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Assertividade</span>
                      <span className="text-emerald-400 font-bold">{signal.confidence}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Payout Est.</span>
                      <span className="text-yellow-400 font-bold">+{Math.round(payout * 100)}%</span>
                    </div>
                  </div>

                  {/* Rationale do Alerta */}
                  <p className="text-xs text-slate-400 leading-relaxed font-sans mb-3 text-left">
                    {signal.indicatorRationale}
                  </p>

                  {/* Validação por Gemini IA */}
                  <div className="border-t border-slate-800/60 pt-3 mt-1">
                    {signal.aiVerified ? (
                      <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-lg p-2.5 text-left">
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[10px] bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent font-black tracking-widest uppercase flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            Análise de IA Gemini ativa
                          </span>
                          <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded ${
                            signal.aiRisk === "Mínimo" 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : signal.aiRisk === "Médio" 
                              ? "bg-amber-500/10 text-amber-500" 
                              : "bg-rose-500/10 text-rose-400"
                          }`}>
                            Risco: {signal.aiRisk}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                          {signal.aiAnalysis}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => onVerifyAi(signal.id)}
                        disabled={signal.loadingAi}
                        className="w-full flex items-center justify-center gap-2 py-1.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow shadow-indigo-500/10 border border-indigo-400/30 disabled:opacity-50"
                        id={`ai-verify-btn-${signal.id}`}
                      >
                        <Brain className={`w-3.5 h-3.5 ${signal.loadingAi ? "animate-spin" : ""}`} />
                        {signal.loadingAi ? "Consultando Gemini AI..." : "VERIFICAR CONFLUÊNCIA COM IA"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. HISTÓRICO DE ALERTAS RECENTES */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 border-b border-slate-800/60 pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Histórico Resolvido ({signals.filter(s => s.status !== "PENDING").length})
            </h3>
          </div>
          <span className="text-[9px] text-slate-500 font-mono font-bold bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800/40 self-start sm:self-auto">
            Últimas 40 expirações
          </span>
        </div>

        {completedSignals.length === 0 ? (
          <div className="border border-dashed border-slate-850 rounded-xl p-6 text-center text-slate-600 text-xs font-mono">
            Nenhuma operação recente auditada. Aguarde o fechamento das velas de expiração.
          </div>
        ) : (
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[350px] pr-1 scrollbar-thin">
            {completedSignals.map((signal, idx) => {
              const isWin = signal.status === "WIN";
              const isCall = signal.type === "CALL";

              return (
                <div
                  key={`${signal.id}-${signal.status}-${idx}`}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs bg-slate-950/45 relative overflow-hidden transition-all hover:bg-slate-950/75 shrink-0 min-h-[64px] ${
                    isWin ? "border-emerald-500/20" : "border-rose-500/20"
                  }`}
                >
                  {/* Status Win/Loss Left line */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isWin ? "bg-emerald-500" : "bg-rose-500"}`} />

                  <div className="flex items-center gap-2.5 pl-1 text-left min-w-0 flex-1">
                    <div className="shrink-0">
                      {isWin ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 stroke-[2.5]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-black text-slate-100 text-xs tracking-tight">
                          {signal.pair}
                        </span>
                        <span className="text-[9px] bg-slate-800 font-bold px-1 rounded text-slate-400">
                          {signal.timeframe}
                        </span>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-1 rounded ${
                          isCall ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {isCall ? "CALL" : "PUT"}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1 flex-wrap leading-none">
                        <span>Ent: <strong className="text-slate-300 font-bold">{formatPrice(signal.entryPrice, signal.pair)}</strong></span>
                        <span className="text-slate-600">➔</span>
                        <span>Fech: <strong className={isWin ? "text-emerald-400 font-extrabold" : "text-rose-400 font-extrabold"}>{formatPrice(signal.closePrice, signal.pair)}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end justify-center min-w-[76px]">
                    <span
                      className={`text-[10px] font-mono font-black uppercase tracking-wider px-1.5 py-0.5 rounded leading-none ${
                        isWin ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                      }`}
                    >
                      {isWin ? (
                        <>+{Math.round(payout * 100)}% Win</>
                      ) : (
                        <>-100% Loss</>
                      )}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono font-bold mt-1.5">
                      Acerto: {signal.confidence}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
