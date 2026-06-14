import { Candle } from "../types";

/**
 * Calcula a EMA (Média Móvel Exponencial) para um determinado período
 */
export function calculateEMA(candles: Candle[], period: number): number[] {
  const emas: number[] = new Array(candles.length).fill(0);
  if (candles.length === 0) return emas;

  let smaSum = 0;
  const limit = Math.min(period, candles.length);
  for (let i = 0; i < limit; i++) {
    smaSum += candles[i].close;
  }
  
  const sma = smaSum / limit;
  emas[limit - 1] = sma;

  const k = 2 / (period + 1);
  for (let i = limit; i < candles.length; i++) {
    emas[i] = candles[i].close * k + emas[i - 1] * (1 - k);
  }

  return emas;
}

/**
 * Calcula o RSI (Índice de Força Relativa) com período de 14 v1
 */
export function calculateRSI(candles: Candle[], period: number = 14): number[] {
  const rsi: number[] = new Array(candles.length).fill(50);
  if (candles.length < period + 1) return rsi;

  let gains = 0;
  let losses = 0;

  // Primeiro RSI (baseado em SMA de ganhos e perdas)
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  // RSI subsequentes usando Wilders Smoothing
  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return rsi;
}

/**
 * Calcula as Bandas de Bollinger (20, 2)
 */
export function calculateBollingerBands(
  candles: Candle[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const upper = new Array(candles.length).fill(0);
  const middle = new Array(candles.length).fill(0);
  const lower = new Array(candles.length).fill(0);

  if (candles.length < period) {
    // Preenche com o valor atual aproximado
    for (let i = 0; i < candles.length; i++) {
      middle[i] = candles[i].close;
      upper[i] = candles[i].close * 1.002;
      lower[i] = candles[i].close * 0.998;
    }
    return { upper, middle, lower };
  }

  for (let i = period - 1; i < candles.length; i++) {
    // Calcular Média Móvel Simples (Middle Band)
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += candles[j].close;
    }
    const sma = sum / period;
    middle[i] = sma;

    // Calcular Desvio Padrão
    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varianceSum += Math.pow(candles[j].close - sma, 2);
    }
    const variance = varianceSum / period;
    const stdDev = Math.sqrt(variance);

    upper[i] = sma + stdDevMultiplier * stdDev;
    lower[i] = sma - stdDevMultiplier * stdDev;
  }

  // Preenche os primeiros valores que não possuem dados suficientes
  for (let i = 0; i < period - 1; i++) {
    middle[i] = middle[period - 1];
    upper[i] = upper[period - 1];
    lower[i] = lower[period - 1];
  }

  return { upper, middle, lower };
}

/**
 * Calcula o MACD (12, 26, 9)
 */
export function calculateMACD(candles: Candle[]): { Macd: number[]; Signal: number[]; Hist: number[] } {
  const macdLine = new Array(candles.length).fill(0);
  const signalLine = new Array(candles.length).fill(0);
  const histogram = new Array(candles.length).fill(0);

  if (candles.length < 26) {
    return { Macd: macdLine, Signal: signalLine, Hist: histogram };
  }

  const ema12 = calculateEMA(candles, 12);
  const ema26 = calculateEMA(candles, 26);

  // Calcula linha MACD
  for (let i = 0; i < candles.length; i++) {
    macdLine[i] = ema12[i] - ema26[i];
  }

  // Calcula linha de Sinal (EMA 9 do MACD)
  const k = 2 / (9 + 1);
  signalLine[0] = macdLine[0];
  for (let i = 1; i < candles.length; i++) {
    signalLine[i] = macdLine[i] * k + signalLine[i - 1] * (1 - k);
  }

  // Calcula Histograma
  for (let i = 0; i < candles.length; i++) {
    histogram[i] = macdLine[i] - signalLine[i];
  }

  return { Macd: macdLine, Signal: signalLine, Hist: histogram };
}

/**
 * Atualiza todos os indicadores de uma vez em um lote de velas
 */
export function enrichCandlesWithIndicators(candles: Candle[]): Candle[] {
  if (candles.length === 0) return candles;

  const ema9Values = calculateEMA(candles, 9);
  const ema21Values = calculateEMA(candles, 21);
  const rsiValues = calculateRSI(candles, 14);
  const bb = calculateBollingerBands(candles, 20, 2);
  const macdData = calculateMACD(candles);

  return candles.map((candle, idx) => ({
    ...candle,
    ema9: ema9Values[idx],
    ema21: ema21Values[idx],
    rsi: rsiValues[idx],
    bbUpper: bb.upper[idx],
    bbMiddle: bb.middle[idx],
    bbLower: bb.lower[idx],
    macd: macdData.Macd[idx],
    macdSignal: macdData.Signal[idx],
    macdHist: macdData.Hist[idx],
  }));
}
