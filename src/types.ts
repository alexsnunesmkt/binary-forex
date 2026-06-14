export interface Candle {
  time: number; // timestamp em ms de início da vela
  open: number;
  high: number;
  low: number;
  close: number;
  // IndicadoresCalculados
  rsi?: number;
  ema9?: number;
  ema21?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
}

export type Timeframe = "1m" | "5m";

export interface Signal {
  id: string;
  pair: string;
  timeframe: Timeframe;
  type: "CALL" | "PUT";
  entryPrice: number;
  entryTime: number; // timestamp em ms
  expirationTime: number; // timestamp em ms
  status: "PENDING" | "WIN" | "LOSS";
  closePrice?: number;
  indicatorRationale: string;
  confidence: number; // heurística de 0 a 100
  aiVerified?: boolean;
  aiAnalysis?: string;
  aiRisk?: "Mínimo" | "Médio" | "Alto";
  loadingAi?: boolean;
}

export interface ForexPair {
  symbol: string;
  description: string;
  basePrice: number;
  decimalDigits: number;
  volatility: number; // fator de variação de preço
  trend: number; // tendência (-1 a +1)
}

export interface AlertNotification {
  id: string;
  pair: string;
  timeframe: Timeframe;
  type: "CALL" | "PUT";
  price: number;
  time: number;
  read: boolean;
}
