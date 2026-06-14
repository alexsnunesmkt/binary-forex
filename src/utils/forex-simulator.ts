import { Candle, ForexPair, Signal, Timeframe } from "../types";
import { enrichCandlesWithIndicators } from "./indicators";

// Pares de Moedas Forex principais para análise
export const FOREX_PAIRS: ForexPair[] = [
  { symbol: "EUR/USD", description: "Euro / Dólar Americano", basePrice: 1.12450, decimalDigits: 5, volatility: 0.00015, trend: 0.05 },
  { symbol: "GBP/USD", description: "Libra Esterlina / Dólar Americano", basePrice: 1.28200, decimalDigits: 5, volatility: 0.00018, trend: -0.02 },
  { symbol: "USD/JPY", description: "Dólar Americano / Iene Japonês", basePrice: 154.380, decimalDigits: 3, volatility: 0.02500, trend: 0.08 },
  { symbol: "AUD/USD", description: "Dólar Australiano / Dólar Americano", basePrice: 0.66540, decimalDigits: 5, volatility: 0.00012, trend: -0.04 },
  { symbol: "USD/CAD", description: "Dólar Americano / Dólar Canadense", basePrice: 1.36820, decimalDigits: 5, volatility: 0.00011, trend: 0.01 },
  { symbol: "EUR/GBP", description: "Euro / Libra Esterlina", basePrice: 0.87620, decimalDigits: 5, volatility: 0.00008, trend: -0.01 },
];

/**
 * Gera velas históricas iniciais realistas para um par de moedas
 */
export function generateHistoricalCandles(
  pair: ForexPair,
  timeframe: Timeframe,
  count: number = 70
): Candle[] {
  const candles: Candle[] = [];
  const timeframeMs = timeframe === "1m" ? 60 * 1000 : 5 * 60 * 1000;
  const now = Date.now();
  
  let currentPrice = pair.basePrice;
  const seedTimeStart = now - count * timeframeMs;

  for (let i = 0; i < count; i++) {
    const candleTime = seedTimeStart + i * timeframeMs;
    
    // Simula uma caminhada aleatória com tendência
    const drift = pair.trend * pair.volatility;
    const change = (Math.random() - 0.5) * pair.volatility * 4 + drift;
    
    const open = currentPrice;
    const close = currentPrice + change;
    
    const high = Math.max(open, close) + Math.random() * pair.volatility * 1.5;
    const low = Math.min(open, close) - Math.random() * pair.volatility * 1.5;

    candles.push({
      time: candleTime,
      open,
      high,
      low,
      close,
    });

    currentPrice = close;
  }

  // Completa as velas com os indicadores calculados
  return enrichCandlesWithIndicators(candles);
}

/**
 * Atualiza a última vela em andamento com um novo tick de preço ou cria uma nova vela se o período acabou.
 */
export function updateCandlesWithTick(
  currentCandles: Candle[],
  tickPrice: number,
  timeframe: Timeframe
): { updatedCandles: Candle[]; isNewCandle: boolean } {
  if (currentCandles.length === 0) return { updatedCandles: [], isNewCandle: false };

  const timeframeMs = timeframe === "1m" ? 60 * 1000 : 5 * 60 * 1000;
  const lastCandle = currentCandles[currentCandles.length - 1];
  const now = Date.now();

  // Determina se o tick pertence a uma nova vela ou à vela atual
  const currentCandleStartTime = Math.floor(now / timeframeMs) * timeframeMs;
  const isNewCandle = currentCandleStartTime > lastCandle.time;

  let newCandleList: Candle[] = [...currentCandles];

  if (isNewCandle) {
    // Fecha a vela anterior adicionando as métricas finais obtidas pelo último tick
    // Cria uma nova vela
    const newCandle: Candle = {
      time: currentCandleStartTime,
      open: lastCandle.close,
      high: Math.max(lastCandle.close, tickPrice),
      low: Math.min(lastCandle.close, tickPrice),
      close: tickPrice,
    };
    newCandleList.push(newCandle);

    // Limita o tamanho máximo de histórico de velas para manter alta performance
    if (newCandleList.length > 200) {
      newCandleList.shift();
    }
  } else {
    // Atualiza a vela atual
    const updatedLast: Candle = {
      ...lastCandle,
      close: tickPrice,
      high: Math.max(lastCandle.high, tickPrice),
      low: Math.min(lastCandle.low, tickPrice),
    };
    newCandleList[newCandleList.length - 1] = updatedLast;
  }

  // Recalcula os indicadores técnicos do lote
  const enriched = enrichCandlesWithIndicators(newCandleList);

  return {
    updatedCandles: enriched,
    isNewCandle,
  };
}

/**
 * Varre as velas em busca de novos sinais de Opções Binárias de alta probabilidade
 * É focado na vela anterior (última fechada)
 */
export function scanForBinaryOptionsSignal(
  candles: Candle[],
  pair: string,
  timeframe: Timeframe,
  decimalDigits: number
): Signal | null {
  if (candles.length < 5) return null;

  // Analisamos o penúltimo elemento (última vela fechada completa)
  const lastClosedIdx = candles.length - 2;
  const currentCandle = candles[lastClosedIdx];
  const prevCandle = candles[lastClosedIdx - 1];

  if (!currentCandle || !prevCandle) return null;

  const currentPrice = currentCandle.close;
  const timeframeMs = timeframe === "1m" ? 60 * 1000 : 5 * 60 * 1000;
  
  // 1. ESTRATÉGIA: Bollinger Bounce + Exaustão de RSI
  const isBBUpperTouch = currentCandle.high >= (currentCandle.bbUpper ?? 0) * 0.9999;
  const isBBLowerTouch = currentCandle.low <= (currentCandle.bbLower ?? 0) * 1.0001;
  const isRSIOverbought = (currentCandle.rsi ?? 50) >= 70;
  const isRSIOversold = (currentCandle.rsi ?? 50) <= 30;

  if (isBBUpperTouch && isRSIOverbought) {
    const confidence = Math.round(55 + Math.min(40, ((currentCandle.rsi ?? 70) - 70) * 2 + 10));
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    return {
      id: `${pair}-${timeframe}-${currentCandle.time}-PUT-${uniqueSuffix}`,
      pair,
      timeframe,
      type: "PUT",
      entryPrice: currentPrice,
      entryTime: Date.now(),
      expirationTime: Date.now() + timeframeMs,
      status: "PENDING",
      indicatorRationale: `Exaustão na banda superior de Bollinger + RSI sobrecomprado (${currentCandle.rsi?.toFixed(1)}) indicando reversão iminente.`,
      confidence,
    };
  }

  if (isBBLowerTouch && isRSIOversold) {
    const confidence = Math.round(55 + Math.min(40, (30 - (currentCandle.rsi ?? 30)) * 2 + 10));
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    return {
      id: `${pair}-${timeframe}-${currentCandle.time}-CALL-${uniqueSuffix}`,
      pair,
      timeframe,
      type: "CALL",
      entryPrice: currentPrice,
      entryTime: Date.now(),
      expirationTime: Date.now() + timeframeMs,
      status: "PENDING",
      indicatorRationale: `Exaustão na banda inferior de Bollinger + RSI sobrevendido (${currentCandle.rsi?.toFixed(1)}) indicando reversão iminente.`,
      confidence,
    };
  }

  // 2. ESTRATÉGIA: Cruzamento de Médias Móveis Exponenciais (9 vs 21 EMA)
  const prevEma9 = prevCandle.ema9 ?? 0;
  const prevEma21 = prevCandle.ema21 ?? 0;
  const currEma9 = currentCandle.ema9 ?? 0;
  const currEma21 = currentCandle.ema21 ?? 0;

  // Cruzamento de Alta (CALL)
  if (prevEma9 <= prevEma21 && currEma9 > currEma21) {
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    return {
      id: `${pair}-${timeframe}-${currentCandle.time}-CALL-CROSS-${uniqueSuffix}`,
      pair,
      timeframe,
      type: "CALL",
      entryPrice: currentPrice,
      entryTime: Date.now(),
      expirationTime: Date.now() + timeframeMs,
      status: "PENDING",
      indicatorRationale: `Cruzamento de Alta da EMA rápida de 9 períodos acima da EMA de 21 períodos, sinalizando nova tendência forte.`,
      confidence: 72,
    };
  }

  // Cruzamento de Baixa (PUT)
  if (prevEma9 >= prevEma21 && currEma9 < currEma21) {
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    return {
      id: `${pair}-${timeframe}-${currentCandle.time}-PUT-CROSS-${uniqueSuffix}`,
      pair,
      timeframe,
      type: "PUT",
      entryPrice: currentPrice,
      entryTime: Date.now(),
      expirationTime: Date.now() + timeframeMs,
      status: "PENDING",
      indicatorRationale: `Cruzamento de Baixa da EMA rápida de 9 períodos abaixo da EMA de 21 períodos, sinalizando forte fluxo vendedor.`,
      confidence: 70,
    };
  }

  // 3. ESTRATÉGIA: Divergência Extrema de RSI nas Velas
  // Sem outro crossover, se o RSI cruzar limites absolutos (RSI > 75 ou RSI < 25)
  if ((currentCandle.rsi ?? 50) > 75 ) {
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    return {
      id: `${pair}-${timeframe}-${currentCandle.time}-PUT-EXTREME-${uniqueSuffix}`,
      pair,
      timeframe,
      type: "PUT",
      entryPrice: currentPrice,
      entryTime: Date.now(),
      expirationTime: Date.now() + timeframeMs,
      status: "PENDING",
      indicatorRationale: `Sobrecompra Extrema de RSI (${currentCandle.rsi?.toFixed(1)}) sugerindo cansaço do mercado e reversão para curto prazo.`,
      confidence: 75,
    };
  }

  if ((currentCandle.rsi ?? 50) < 25) {
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    return {
      id: `${pair}-${timeframe}-${currentCandle.time}-CALL-EXTREME-${uniqueSuffix}`,
      pair,
      timeframe,
      type: "CALL",
      entryPrice: currentPrice,
      entryTime: Date.now(),
      expirationTime: Date.now() + timeframeMs,
      status: "PENDING",
      indicatorRationale: `Sobrevenda Extrema de RSI (${currentCandle.rsi?.toFixed(1)}) indicando alto potencial de retração compradora.`,
      confidence: 77,
    };
  }

  return null;
}
