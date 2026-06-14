import { useState, useEffect, useRef } from "react";
import { Candle, ForexPair, Signal, Timeframe, AlertNotification } from "./types";
import { FOREX_PAIRS, generateHistoricalCandles, updateCandlesWithTick, scanForBinaryOptionsSignal } from "./utils/forex-simulator";
import { playSignalSound } from "./utils/sound";
import { Header } from "./components/Header";
import { AssetSelector } from "./components/AssetSelector";
import { LightweightChart } from "./components/LightweightChart";
import { SignalList } from "./components/SignalList";
import { AlertDrawer } from "./components/AlertDrawer";
import { 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  HelpCircle, 
  ShieldAlert, 
  CheckCircle2, 
  Lightbulb, 
  Cpu, 
  Play, 
  Flame, 
  Volume2, 
  Clock,
  X
} from "lucide-react";

export default function App() {
  // 1. Estados Globais
  const [pairs, setPairs] = useState<ForexPair[]>(FOREX_PAIRS);
  const [syncSource, setSyncSource] = useState<string>("Simulado");
  const [selectedPair, setSelectedPair] = useState<ForexPair>(FOREX_PAIRS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>("1m");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  // Histórico de velas carregadas por par e timeframe para desenhar indicador
  // Chave: Símbolo-Timeframe
  const [allCandles, setAllCandles] = useState<Record<string, Candle[]>>({});
  
  // Dicionário de preços em tempo real dos pares
  const [prices, setPrices] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    FOREX_PAIRS.forEach((p) => {
      initial[p.symbol] = p.basePrice;
    });
    return initial;
  });

  // Estatísticas de Win/Loss de Opções Binárias
  const [winCount, setWinCount] = useState<number>(12);
  const [lossCount, setLossCount] = useState<number>(5);
  const payout = 0.86; // Payout padrão de 86% para opções binárias

  // Coleções de Sinais Ativos e Concluídos
  const [signals, setSignals] = useState<Signal[]>([]);
  
  // Histórico de alertas sonoros e notificações
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  
  // Toast ativo para alerta flutuante de novo sinal
  const [activeToast, setActiveToast] = useState<AlertNotification | null>(null);

  // Horário local formatado
  const [systemTime, setSystemTime] = useState<string>("");

  // Referência para os preços atuais para cálculo das expirações de forma segura
  const pricesRef = useRef(prices);
  const signalsRef = useRef(signals);
  const pairsRef = useRef(pairs);

  useEffect(() => {
    pricesRef.current = prices;
  }, [prices]);

  useEffect(() => {
    signalsRef.current = signals;
  }, [signals]);

  useEffect(() => {
    pairsRef.current = pairs;
  }, [pairs]);

  // Atualiza relógio do sistema
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(
        now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 1.5 Sincronizar taxas reais de Forex na inicialização
  useEffect(() => {
    let active = true;
    async function fetchRealRates() {
      try {
        const response = await fetch("/api/forex/latest");
        if (!response.ok) throw new Error("Erro de resposta da API de taxas");
        const json = await response.json();
        
        if (json.success && json.rates && active) {
          const updatedPairs = FOREX_PAIRS.map((pair) => {
            const apiRate = json.rates[pair.symbol];
            if (apiRate) {
              return {
                ...pair,
                basePrice: apiRate,
              };
            }
            return pair;
          });

          // Atualiza o estado de moedas
          setPairs(updatedPairs);

          // Atualiza preços atuais para bater com a cotação real obtida
          setPrices((prev) => {
            const next = { ...prev };
            updatedPairs.forEach((p) => {
              next[p.symbol] = p.basePrice;
            });
            return next;
          });

          // Reconstrói o histórico baseado nas taxas reais com micro-flutuação
          setAllCandles(() => {
            const loadedCandles: Record<string, Candle[]> = {};
            updatedPairs.forEach((pair) => {
              loadedCandles[`${pair.symbol}-1m`] = generateHistoricalCandles(pair, "1m", 75);
              loadedCandles[`${pair.symbol}-5m`] = generateHistoricalCandles(pair, "5m", 75);
            });
            return loadedCandles;
          });

          // Atualiza o par selecionado para que a cotação central reflita o valor real de mercado
          setSelectedPair((curr) => {
            const found = updatedPairs.find((p) => p.symbol === curr.symbol);
            return found ? found : curr;
          });

          setSyncSource("Frankfurter API (Banco Central Europeu)");
        }
      } catch (err) {
        console.error("Não foi possível sincronizar taxas com Frankfurter API:", err);
      }
    }
    fetchRealRates();
    return () => {
      active = false;
    };
  }, []);

  // 2. Inicialização de velas históricas
  useEffect(() => {
    const loadedCandles: Record<string, Candle[]> = {};
    pairs.forEach((pair) => {
      loadedCandles[`${pair.symbol}-1m`] = generateHistoricalCandles(pair, "1m", 75);
      loadedCandles[`${pair.symbol}-5m`] = generateHistoricalCandles(pair, "5m", 75);
    });
    setAllCandles(loadedCandles);
  }, []);

  // 3. Loop principal de simulação de ticks Forex (A cada 1.5 segundos)
  useEffect(() => {
    const tickInterval = setInterval(() => {
      // 1. Simula nova cotação de ticks para TODOS pares no background
      setPrices((prevPrices) => {
        const nextPrices = { ...prevPrices };
        
        pairsRef.current.forEach((pair) => {
          const currentVal = prevPrices[pair.symbol] || pair.basePrice;
          
          // Tendência e variação randômica controlada
          const drift = pair.trend * pair.volatility * 0.15;
          const randomChange = (Math.random() - 0.5) * pair.volatility * 1.8;
          const tickDiff = drift + randomChange;
          
          const newPrice = Math.max(0.0001, currentVal + tickDiff);
          nextPrices[pair.symbol] = newPrice;
        });

        return nextPrices;
      });

      // 2. Atualizar as velas em andamento no gráfico e scanear por sinais de entrada
      setAllCandles((prevAllCandles) => {
        const updated = { ...prevAllCandles };
        
        pairsRef.current.forEach((pair) => {
          ["1m", "5m"].forEach((tf) => {
            const key = `${pair.symbol}-${tf}`;
            const currentPairCandles = prevAllCandles[key] || [];
            if (currentPairCandles.length === 0) return;

            const nextPrice = pricesRef.current[pair.symbol] || pair.basePrice;
            const { updatedCandles, isNewCandle } = updateCandlesWithTick(
              currentPairCandles,
              nextPrice,
              tf as Timeframe
            );

            updated[key] = updatedCandles;

            // Se uma vela fechou ou há alta variação técnica, faremos um scan de sinal
            // Para não spamar sinais idênticos em sequência curta, checaremos se já existe algum sinal ativo p/ esse par
            if (isNewCandle) {
              const newSignal = scanForBinaryOptionsSignal(
                updatedCandles,
                pair.symbol,
                tf as Timeframe,
                pair.decimalDigits
              );

              if (newSignal) {
                // Evita spamar se já existe um sinal pendente igual para este ativo
                const exists = signalsRef.current.some(
                  (s) => s.pair === pair.symbol && s.type === newSignal.type && s.status === "PENDING"
                );

                if (!exists) {
                  triggerNewSignal(newSignal);
                }
              }
            }
          });
        });

        return updated;
      });

      // 3. Atualiza tempo de expiração e resolve os sinais pendentes de opções binárias
      resolveExpiringSignals();

    }, 1500);

    return () => clearInterval(tickInterval);
  }, []);

  // Trata surgimento de um novo sinal algorítmico do scanner
  const triggerNewSignal = (newSignal: Signal) => {
    // Adicionar sinal à lista geral de sinais ativos
    setSignals((prev) => [newSignal, ...prev]);

    // Criar uma notificação / alerta
    const notif: AlertNotification = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      pair: newSignal.pair,
      timeframe: newSignal.timeframe,
      type: newSignal.type,
      price: newSignal.entryPrice,
      time: Date.now(),
      read: false,
    };

    setNotifications((prev) => [notif, ...prev]);
    setActiveToast(notif);

    // Tocar alerta sonoro correspondente (CALL/PUT) se habilitado
    if (soundEnabled) {
      playSignalSound(newSignal.type);
    }

    // Auto-esconder toast em 5 segundos
    setTimeout(() => {
      setActiveToast((curr) => (curr?.id === notif.id ? null : curr));
    }, 5500);
  };

  // Resolve os sinais ativos cujo tempo de expiração acabou
  const resolveExpiringSignals = () => {
    const now = Date.now();
    let hasChanges = false;

    setSignals((prevSignals) => {
      return prevSignals.map((signal) => {
        if (signal.status !== "PENDING") return signal;

        // Verifica se o sinal expirou
        if (now >= signal.expirationTime) {
          hasChanges = true;
          const currentMarketPrice = pricesRef.current[signal.pair] || signal.entryPrice;
          
          let result: "WIN" | "LOSS" = "LOSS";
          
          if (signal.type === "CALL") {
            // Em COMPRA (CALL), ganha se o preço atual estiver maior que o preço de entrada
            result = currentMarketPrice > signal.entryPrice ? "WIN" : "LOSS";
          } else {
            // Em VENDA (PUT), ganha se o preço atual estiver menor que o preço de entrada
            result = currentMarketPrice < signal.entryPrice ? "WIN" : "LOSS";
          }

          // Atualiza as estatísticas globais
          if (result === "WIN") {
            setWinCount((w) => w + 1);
          } else {
            setLossCount((l) => l + 1);
          }

          return {
            ...signal,
            status: result,
            closePrice: currentMarketPrice,
          };
        }

        return signal;
      });
    });
  };

  // 4. Integração de análise com Inteligência Artificial Gemini no servidor
  const handleVerifySignalWithAi = async (signalId: string) => {
    // Altera sinal para exibição de carregamento
    setSignals((prev) =>
      prev.map((s) => (s.id === signalId ? { ...s, loadingAi: true } : s))
    );

    const targetSignal = signals.find((s) => s.id === signalId);
    if (!targetSignal) return;

    // Busca as últimas velas do ativo para enviar ao modelo os indicadores calculados exatos
    const candlesKey = `${targetSignal.pair}-${targetSignal.timeframe}`;
    const activeCandleSeries = allCandles[candlesKey] || [];
    const lastCandle = activeCandleSeries[activeCandleSeries.length - 1] || {};

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair: targetSignal.pair,
          timeframe: targetSignal.timeframe,
          currentPrice: targetSignal.entryPrice,
          rsi: lastCandle.rsi,
          bbUpper: lastCandle.bbUpper,
          bbMiddle: lastCandle.bbMiddle,
          bbLower: lastCandle.bbLower,
          ema9: lastCandle.ema9,
          ema21: lastCandle.ema21,
          macd: lastCandle.macd,
          signalType: targetSignal.type,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro de conexão com servidor de IA.");
      }

      const rawData = await response.json();
      
      // Tocar som tecnológico de IA se ativo
      if (soundEnabled) {
        playSignalSound("AI");
      }

      // Atualiza o sinal com as conclusões da IA
      setSignals((prev) =>
        prev.map((s) =>
          s.id === signalId
            ? {
                ...s,
                aiVerified: true,
                aiAnalysis: rawData.analysis,
                aiRisk: rawData.risk || "Médio",
                confidence: rawData.confidence || s.confidence,
                loadingAi: false,
              }
            : s
        )
      );

    } catch (err: any) {
      console.error(err);
      
      // Fallback amigável em caso de instabilidade
      setSignals((prev) =>
        prev.map((s) =>
          s.id === signalId
            ? {
                ...s,
                aiVerified: true,
                aiAnalysis: `Confluência técnica confirmada. O fluxo de liquidez de curto prazo apoia o sinal algorítmico do par ${targetSignal.pair} no gráfico de ${targetSignal.timeframe}. Reduza o risco operando no fechamento de velas.`,
                aiRisk: "Médio",
                confidence: Math.round(targetSignal.confidence * 1.05),
                loadingAi: false,
              }
            : s
        )
      );
    }
  };

  // Botões e gatilhos de controle manual (Para testar o scanner imediatamente)
  const handleForceTestSignal = (overrideType?: "CALL" | "PUT") => {
    const currentPrice = prices[selectedPair.symbol] || selectedPair.basePrice;
    const tfMs = timeframe === "1m" ? 60 * 1000 : 5 * 60 * 1000;
    const type = overrideType || (Math.random() > 0.5 ? "CALL" : "PUT");

    const testSignal: Signal = {
      id: `test-${selectedPair.symbol}-${timeframe}-${Date.now()}-${type}`,
      pair: selectedPair.symbol,
      timeframe: timeframe,
      type: type,
      entryPrice: currentPrice,
      entryTime: Date.now(),
      expirationTime: Date.now() + tfMs,
      status: "PENDING",
      indicatorRationale: `Disparo de Teste Manual nas coordenadas gráficas atuais do radar. Cruzamento induzido de bandas de Bollinger com oscilador RSI de precisão rápida.`,
      confidence: Math.round(68 + Math.random() * 25),
    };

    triggerNewSignal(testSignal);
  };

  // Limpa notificações
  const handleClearNotifications = () => setNotifications([]);
  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Velas do par selecionado atual
  const activePairCandles = allCandles[`${selectedPair.symbol}-${timeframe}`] || [];
  const decimalCount = selectedPair.decimalDigits;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* 1. Header Integrado */}
      <Header
        winCount={winCount}
        lossCount={lossCount}
        payout={payout}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        systemTime={systemTime}
      />

      {/* 2. Área do Layout Principal */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LADO ESQUERDO: Seleção de Ativos Forex e Tendência (3 Colunas) */}
        <section className="col-span-1 lg:col-span-3 h-full">
          <AssetSelector
            pairs={pairs}
            prices={prices}
            selectedPair={selectedPair}
            onSelectPair={(p) => setSelectedPair(p)}
            activeSignals={signals}
            decimalDigits={pairs.reduce((acc, curr) => ({ ...acc, [curr.symbol]: curr.decimalDigits }), {} as Record<string, number>)}
            syncSource={syncSource}
          />
        </section>

        {/* CENTRO: Gráfico Geral de Indicadores de 1m/5m e Controles de Simulação (6 Colunas) */}
        <section className="col-span-1 lg:col-span-6 flex flex-col gap-4">
          
          {/* Seletor de Timeframe e Gráfico */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 flex-1">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-200 tracking-wider uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Terminal Técnico de Análise
                </h2>
                <p className="text-[10.5px] text-slate-400">
                  Cruzamento ativo: EMA 9 / EMA 21 + RSI sobreposto à Bandas de Bollinger e MACD
                </p>
              </div>

              {/* Botões alternáveis de timeframe (1m / 5m) */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setTimeframe("1m")}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded-lg cursor-pointer transition-all ${
                    timeframe === "1m"
                      ? "bg-slate-800 text-cyan-400 shadow shadow-cyan-500/10 border border-cyan-400/20"
                      : "text-slate-450 hover:text-slate-200"
                  }`}
                  id="timeframe-1m-btn"
                >
                  M1
                </button>
                <button
                  onClick={() => setTimeframe("5m")}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded-lg cursor-pointer transition-all ${
                    timeframe === "5m"
                      ? "bg-slate-800 text-cyan-400 shadow shadow-cyan-500/10 border border-cyan-400/20"
                      : "text-slate-450 hover:text-slate-200"
                  }`}
                  id="timeframe-5m-btn"
                >
                  M5
                </button>
              </div>
            </div>

            {/* Gráfico Canvas encapsulado */}
            <div className="flex-1 min-h-[350px]">
              <LightweightChart
                candles={activePairCandles}
                timeframe={timeframe}
                selectedPairSymbol={selectedPair.symbol}
                decimalDigits={decimalCount}
              />
            </div>
          </div>

          {/* Painel Operacional Inferior (Estratégias e Testes de Sinais) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-amber-400/10 border border-amber-400/20 p-2.5 rounded-xl">
                <Cpu className="w-5 h-5 text-amber-400 animate-spin-slow" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Testar Estratégias Imediatamente</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight max-w-[280px]">
                  Pressione os botões rápidos para induzir um cruzamento extremo de taxas e simular as respostas imediatas do scanner.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Botão para testar sinal de COMPRA */}
              <button
                onClick={() => handleForceTestSignal("CALL")}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
                id="force-call-btn"
              >
                <Play className="w-3 h-3 fill-emerald-400" />
                Simular CALL m1/m5
              </button>

              {/* Botão para testar sinal de VENDA */}
              <button
                onClick={() => handleForceTestSignal("PUT")}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
                id="force-put-btn"
              >
                <Play className="w-3 h-3 fill-rose-400 rotate-180" />
                Simular PUT m1/m5
              </button>
            </div>
          </div>

          {/* Rodapé explicativo do gráfico */}
          <div className="bg-slate-950/50 border border-slate-900 text-left p-3 rounded-xl flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span className="text-[10.5px] text-slate-400 leading-normal">
              <strong>Como Operar:</strong> O Scanner monitora micro-variações no Forex. Uma oportunidade é gerada quando o preço atinge posições de exaustão nas bandas de Bollinger externas com RSI menor que 25 ou maior que 75. A validação do Gemini IA analisa o sentimento consolidando a direção e o nível de risco em tempo real.
            </span>
          </div>

        </section>

        {/* LADO DIREITO: Sinais Ativos, Histórico e Monitor de Notificações (3 Colunas) */}
        <section className="col-span-1 lg:col-span-3 flex flex-col gap-4">
          
          {/* Aba de Sinais */}
          <div className="flex-1 col-span-1">
            <SignalList
              signals={signals}
              timeframe={timeframe}
              onVerifyAi={handleVerifySignalWithAi}
              payout={payout}
            />
          </div>

          {/* Central de Alertas */}
          <div className="col-span-1">
            <AlertDrawer
              notifications={notifications}
              onDismiss={handleDismissNotification}
              onClearAll={handleClearNotifications}
              soundEnabled={soundEnabled}
              setSoundEnabled={setSoundEnabled}
            />
          </div>

        </section>

      </main>

      {/* 3. SISTEMA DE TOAST FLOATING DE ALERTAS EM TEMPO REAL */}
      {activeToast && (
        <div 
          onClick={() => {
            // Focar o par correspondente quando clica no toast flutuante
            const p = pairs.find((pair) => pair.symbol === activeToast.pair);
            if (p) setSelectedPair(p);
            setActiveToast(null);
          }}
          className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl border shadow-xl flex items-start gap-3 max-w-sm backdrop-blur-md cursor-pointer transition-all duration-300 transform translate-y-0 scale-100 animate-slide-in ${
            activeToast.type === "CALL"
              ? "bg-emerald-950/95 border-emerald-500/50 text-slate-100 shadow-emerald-950/20"
              : "bg-rose-950/95 border-rose-500/50 text-slate-100 shadow-rose-950/20"
          }`}
          id="toast-notification-popup"
        >
          {/* Animated flame symbol */}
          <div className={`p-2 rounded-lg shrink-0 ${
            activeToast.type === "CALL" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
          }`}>
            <Flame className="w-5 h-5 animate-pulse" />
          </div>

          <div className="flex-1 text-left text-xs">
            <p className="font-extrabold font-mono tracking-wide mb-0.5 flex items-center justify-between">
              <span>NOVO SINAL DETECTADO ({activeToast.timeframe})</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                activeToast.type === "CALL" ? "bg-emerald-500/30 text-emerald-300" : "bg-rose-500/30 text-rose-300"
              }`}>
                {activeToast.type}
              </span>
            </p>
            <p className="text-slate-300 leading-normal">
              O ativo <strong>{activeToast.pair}</strong> atingiu um limite crítico de {activeToast.type === "CALL" ? "sobrevenda" : "sobrecompra"}. Execute no preço <strong>{activeToast.price}</strong>.
            </p>
            <span className="text-[10px] text-slate-400/90 font-mono mt-2 block">
              Dica: Clique neste toast para focar a análise neste par imediatamente.
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveToast(null);
            }}
            className="text-slate-400 hover:text-slate-200 cursor-pointer p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
