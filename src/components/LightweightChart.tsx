import React, { useEffect, useRef, useState } from "react";
import { Candle, Timeframe } from "../types";

interface LightweightChartProps {
  candles: Candle[];
  timeframe: Timeframe;
  selectedPairSymbol: string;
  decimalDigits: number;
}

export const LightweightChart: React.FC<LightweightChartProps> = ({
  candles,
  timeframe,
  selectedPairSymbol,
  decimalDigits,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 380 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Auto-resize do canvas conforme o contêiner usando ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      // Debounce opcional ou set direto suave
      setDimensions({
        width: Math.max(width, 300),
        height: Math.max(height, 350),
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Desenhar os gráficos de velas e indicadores técnicos no Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ajusta a escala de alta definição
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const width = dimensions.width;
    const height = dimensions.height;

    // Limpa a tela com fundo de alta tecnologia (slate-950)
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, width, height);

    // Grid vertical e horizontal suaves
    ctx.strokeStyle = "rgba(30, 41, 59, 0.45)"; // slate-800
    ctx.lineWidth = 1;

    // Desenha painel principal de preços (75% da altura) e MACD (20% da altura)
    const pricePanelHeight = height * 0.72;
    const macdPanelTop = height * 0.78;
    const macdPanelHeight = height * 0.20;

    // Grid Horizontal (Linhas de preço)
    const horizontalGridLines = 6;
    for (let i = 0; i < horizontalGridLines; i++) {
      const y = (pricePanelHeight / (horizontalGridLines - 1)) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width - 50, y);
      ctx.stroke();
    }

    // Grid Lateral para o MACD
    ctx.beginPath();
    ctx.moveTo(0, macdPanelTop + macdPanelHeight / 2);
    ctx.lineTo(width - 50, macdPanelTop + macdPanelHeight / 2);
    ctx.stroke();

    // Determinar limites de preços para escala vertical
    // Pegamos as últimas N velas que cabem no gráfico
    const maxVisibleCandles = Math.min(candles.length, Math.floor((width - 60) / 10));
    const startIndex = candles.length - maxVisibleCandles;
    const visibleCandles = candles.slice(startIndex);

    if (visibleCandles.length === 0) return;

    let minPrice = Infinity;
    let maxPrice = -Infinity;

    visibleCandles.forEach((c) => {
      let low = c.low;
      let high = c.high;
      // Inclui bandas de bollinger na escala para não cortar
      if (c.bbLower !== undefined) low = Math.min(low, c.bbLower);
      if (c.bbUpper !== undefined) high = Math.max(high, c.bbUpper);

      if (low < minPrice) minPrice = low;
      if (high > maxPrice) maxPrice = high;
    });

    // Margem vertical extra
    const priceRange = maxPrice - minPrice || 0.0001;
    const padding = priceRange * 0.06;
    const valMin = minPrice - padding;
    const valMax = maxPrice + padding;
    const valRange = valMax - valMin;

    // Helper de mapeamento de preço -> Y no Canvas
    const getPriceY = (val: number) => {
      return pricePanelHeight - ((val - valMin) / valRange) * (pricePanelHeight - 15) - 10;
    };

    // Helper de índice -> X no Canvas
    const candleWidth = (width - 65) / maxVisibleCandles;
    const getCandleX = (idx: number) => {
      return idx * candleWidth + 10;
    };

    // 1. Desenha as Bandas de Bollinger como uma região preenchida sutil
    ctx.fillStyle = "rgba(99, 102, 241, 0.04)"; // Indigo transparente
    ctx.beginPath();
    visibleCandles.forEach((c, idx) => {
      const x = getCandleX(idx) + candleWidth / 2;
      const y = getPriceY(c.bbUpper ?? c.high);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    for (let idx = visibleCandles.length - 1; idx >= 0; idx--) {
      const c = visibleCandles[idx];
      const x = getCandleX(idx) + candleWidth / 2;
      const y = getPriceY(c.bbLower ?? c.low);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Desenha as bordas das bandas de bollinger
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = "rgba(99, 102, 241, 0.25)"; // bbUpper
    ctx.beginPath();
    visibleCandles.forEach((c, idx) => {
      const x = getCandleX(idx) + candleWidth / 2;
      const y = getPriceY(c.bbUpper ?? c.high);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.strokeStyle = "rgba(99, 102, 241, 0.25)"; // bbLower
    ctx.beginPath();
    visibleCandles.forEach((c, idx) => {
      const x = getCandleX(idx) + candleWidth / 2;
      const y = getPriceY(c.bbLower ?? c.low);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]); // Reseta estilo de pontilhado

    // Grid vertical de tempo (Linhas das Velas)
    visibleCandles.forEach((c, idx) => {
      if (idx % 10 === 0) {
        const x = getCandleX(idx) + candleWidth / 2;
        ctx.strokeStyle = "rgba(30, 41, 59, 0.3)";
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Escreva legenda de horário sutil
        ctx.fillStyle = "#64748b";
        ctx.font = "9px monospace";
        const date = new Date(c.time);
        const timeStr = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
        ctx.fillText(timeStr, x - 10, pricePanelHeight + 12);
      }
    });

    // 2. Desenha Médias Móveis EMA9 (Azul-cian) e EMA21 (Laranja)
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#06b6d4"; // Cyan
    ctx.beginPath();
    visibleCandles.forEach((c, idx) => {
      if (c.ema9 === undefined) return;
      const x = getCandleX(idx) + candleWidth / 2;
      const y = getPriceY(c.ema9);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.strokeStyle = "#f97316"; // Laranja
    ctx.beginPath();
    visibleCandles.forEach((c, idx) => {
      if (c.ema21 === undefined) return;
      const x = getCandleX(idx) + candleWidth / 2;
      const y = getPriceY(c.ema21);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 3. Desenha Velas OHLC
    visibleCandles.forEach((c, idx) => {
      const x = getCandleX(idx);
      const isBullish = c.close >= c.open;
      const candleColor = isBullish ? "#10b981" : "#ef4444"; // emerald-500 : rose-500

      ctx.strokeStyle = candleColor;
      ctx.fillStyle = candleColor;
      ctx.lineWidth = 1.25;

      // Sombra superior e inferior (pavio)
      const xMid = x + candleWidth / 2;
      ctx.beginPath();
      ctx.moveTo(xMid, getPriceY(c.high));
      ctx.lineTo(xMid, getPriceY(c.low));
      ctx.stroke();

      // Corpo da vela
      const yOpen = getPriceY(c.open);
      const yClose = getPriceY(c.close);
      const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));
      const bodyY = Math.min(yOpen, yClose);
      const bodyWidth = Math.max(3, candleWidth - 2.5);

      ctx.fillRect(xMid - bodyWidth / 2, bodyY, bodyWidth, bodyHeight);

      // Marcação do nível de preço hover atual
      if (idx === hoverIndex) {
        ctx.fillStyle = "rgba(148, 163, 184, 0.08)";
        ctx.fillRect(xMid - candleWidth / 2, 0, candleWidth, pricePanelHeight);
      }
    });

    // 4. Desenha escala de Preço na lateral direita
    const yTickCount = 5;
    ctx.fillStyle = "#94a3b8"; // slate-400
    ctx.font = "9px monospace";
    for (let i = 0; i < yTickCount; i++) {
      const y = 15 + ((pricePanelHeight - 40) / (yTickCount - 1)) * i;
      // Preço reverso do Y
      const priceVal = valMax - ((y - 10) / (pricePanelHeight - 15)) * valRange;
      ctx.fillText(priceVal.toFixed(decimalDigits), width - 48, y + 3);
    }

    // Linha do Preço atual (última vela)
    const latestCandle = candles[candles.length - 1];
    if (latestCandle) {
      const currentY = getPriceY(latestCandle.close);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.35)"; // Verde suave
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, currentY);
      ctx.lineTo(width - 50, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Caixa de preço no lado direito
      ctx.fillStyle = "#059669"; // Verde escura
      ctx.fillRect(width - 52, currentY - 7, 52, 14);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px monospace";
      ctx.fillText(latestCandle.close.toFixed(decimalDigits), width - 49, currentY + 3);
    }

    // 5. PAINEL DE MACD (Painel Inferior)
    // Encontrar limites do histograma do MACD
    let maxHist = 0.0001;
    visibleCandles.forEach((c) => {
      const actHist = Math.abs(c.macdHist ?? 0);
      const actMacd = Math.abs(c.macd ?? 0);
      if (actHist > maxHist) maxHist = actHist;
      if (actMacd > maxHist) maxHist = actMacd;
    });

    const getMacdY = (val: number) => {
      const center = macdPanelTop + macdPanelHeight / 2;
      return center - (val / (maxHist * 1.5)) * (macdPanelHeight / 2 - 4);
    };

    // Desenhar histograma e linhas MACD
    visibleCandles.forEach((c, idx) => {
      const x = getCandleX(idx);
      const xMid = x + candleWidth / 2;
      const hist = c.macdHist ?? 0;
      const mY = getMacdY(hist);
      const centerY = macdPanelTop + macdPanelHeight / 2;

      ctx.fillStyle = hist >= 0 ? "rgba(16, 185, 129, 0.45)" : "rgba(239, 68, 68, 0.45)";
      ctx.fillRect(xMid - candleWidth / 2.5, Math.min(centerY, mY), Math.max(1, candleWidth - 2.5), Math.max(1, Math.abs(centerY - mY)));
    });

    // Linha MACD (Azul) e Sinal (Amarelo)
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#38bdf8"; // cyan-400
    ctx.beginPath();
    visibleCandles.forEach((c, idx) => {
      if (c.macd === undefined) return;
      const x = getCandleX(idx) + candleWidth / 2;
      const y = getMacdY(c.macd);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.strokeStyle = "#facc15"; // yellow-400
    ctx.beginPath();
    visibleCandles.forEach((c, idx) => {
      if (c.macdSignal === undefined) return;
      const x = getCandleX(idx) + candleWidth / 2;
      const y = getMacdY(c.macdSignal);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Título ou Legenda nos painéis
    ctx.fillStyle = "#475569";
    ctx.font = "9px sans-serif";
    ctx.fillText("MACD (12, 26, 9)", 10, macdPanelTop - 4);

    // Escreve os dados da vela selecionada por Hover no topo
    const selectedCandleForData = hoverIndex !== null ? visibleCandles[hoverIndex] : latestCandle;
    if (selectedCandleForData) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.fillRect(8, 8, width - 70, 20);

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 9.5px monospace";
      let cursorX = 14;

      const items = [
        { label: "O:", val: selectedCandleForData.open.toFixed(decimalDigits), col: "#94a3b8" },
        { label: "H:", val: selectedCandleForData.high.toFixed(decimalDigits), col: "#10b981" },
        { label: "L:", val: selectedCandleForData.low.toFixed(decimalDigits), col: "#ef4444" },
        { label: "C:", val: selectedCandleForData.close.toFixed(decimalDigits), col: "#e2e8f0" },
        { label: "RSI:", val: selectedCandleForData.rsi ? selectedCandleForData.rsi.toFixed(1) : "N/A", col: "#facc15" },
      ];

      items.forEach((item) => {
        ctx.fillStyle = "#64748b";
        ctx.fillText(item.label, cursorX, 22);
        cursorX += ctx.measureText(item.label).width + 2;

        ctx.fillStyle = item.col;
        ctx.fillText(item.val, cursorX, 22);
        cursorX += ctx.measureText(item.val).width + 10;
      });
    }

  }, [candles, dimensions, hoverIndex, decimalDigits]);

  // Função para lidar com movimento do mouse para fins de tooltip / dados no topo
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const maxVisibleCandles = Math.min(candles.length, Math.floor((dimensions.width - 60) / 10));
    const candleWidth = (dimensions.width - 65) / maxVisibleCandles;

    const idx = Math.floor((x - 10) / candleWidth);
    if (idx >= 0 && idx < maxVisibleCandles) {
      setHoverIndex(idx);
    } else {
      setHoverIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const getLatestCandle = () => candles[candles.length - 1];

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col h-full gap-3 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm text-slate-100 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
            {selectedPairSymbol}
          </span>
          <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 px-2 py-1 rounded font-bold font-mono">
            {timeframe === "1m" ? "1 MINUTO" : "5 MINUTOS"}
          </span>
        </div>

        <div className="flex gap-4 items-center text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            EMA 9
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            EMA 21
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="w-2.5 h-2.5 bg-indigo-500/10 border border-indigo-400/20 rounded" />
            Banda B. (20,2)
          </div>
        </div>
      </div>

      {/* Gráfico Canvas Interativo */}
      <div className="flex-1 w-full bg-slate-950 rounded-xl overflow-hidden min-h-[300px]" ref={containerRef}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="block cursor-crosshair w-full h-full"
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-1">
        <div>
          Velas analisadas: <span className="text-slate-300 font-bold">{candles.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Fechamento Atual:</span>
          <span className="text-emerald-400 font-extrabold">
            {getLatestCandle()?.close.toFixed(decimalDigits)}
          </span>
        </div>
      </div>
    </div>
  );
};
