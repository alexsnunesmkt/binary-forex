import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini AI client
  // Will use process.env.GEMINI_API_KEY
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  // API Route: AI Market Sentiment & Binary Options Signal Validation
  app.post("/api/analyze", async (req, res) => {
    try {
      const { pair, timeframe, currentPrice, rsi, bbUpper, bbLower, bbMiddle, ema9, ema21, macd, signalType } = req.body;

      if (!pair || !timeframe) {
        return res.status(400).json({ error: "Par de moedas e tempo gráfico são obrigatórios." });
      }

      const prompt = `
Você é um analista quantitativo sênior de Forex especialista em Opções Binárias de alta precisão.
Analise a seguinte situação técnica atual para tomada de decisão em opções binárias (expiração de ${timeframe}):

Ativo: ${pair}
Tempo Gráfico: ${timeframe}
Preço Atual: ${currentPrice}

Indicadores Técnicos de Curto Prazo:
- RSI (14): ${rsi ? rsi.toFixed(2) : "N/A"}
- Bandas de Bollinger (20,2): Superior: ${bbUpper ? bbUpper.toFixed(5) : "N/A"} | Média: ${bbMiddle ? bbMiddle.toFixed(5) : "N/A"} | Inferior: ${bbLower ? bbLower.toFixed(5) : "N/A"}
- Médias Móveis: EMA 9: ${ema9 ? ema9.toFixed(5) : "N/A"} | EMA 21: ${ema21 ? ema21.toFixed(5) : "N/A"}
- MACD (12, 26, 9): Linha MACD: ${macd ? macd.toFixed(5) : "N/A"}
- Sinal de Estratégia Estimado: ${signalType || "NENHUM"}

Com base exclusiva nestes dados matemáticos e no comportamento típico de opções binárias (reversão ou continuação rápida onde cada segundo importa nas velas de 1 e 5 minutos):
1. Avalie a força do sinal (${signalType || "NEUTRO"}).
2. Forneça uma recomendação clara: CALL (Compra), PUT (Venda) ou NENHUM (Aguardar).
3. Diga o nível de confiança (0% a 100%).
4. Dê uma explicação analítica extremamente concisa e técnica (máximo de 3 frases) em português, explicando o motivo com base nos indicadores fornecidos (ex: exaustão do preço nas bandas, cruzamento de EMA, ou divergência de RSI).
5. Defina um fator de risco (Mínimo, Médio ou Alto).

Responda rigorosamente no formato de JSON estruturado com a seguinte estrutura:
{
  "recommendation": "CALL" | "PUT" | "NENHUM",
  "confidence": <número de 0 a 100>,
  "risk": "Mínimo" | "Médio" | "Alto",
  "analysis": "<sua explicação técnica concisa>"
}
Retorne exclusivamente o JSON, sem markdown ou caracteres extras.
`;

      if (!ai) {
        // Fallback se não houver chave de API configurada
        // Simulando resposta baseada em regras simples para desenvolvimento offline
        const mockRecommendation = signalType || "NENHUM";
        let mockConfidence = 50;
        let mockRisk = "Médio";
        let mockAnalysis = "Modo offline ativo. Análise gráfica heurística: ";
        
        if (signalType === "CALL") {
          mockConfidence = rsi && rsi < 30 ? 78 : 65;
          mockRisk = rsi && rsi < 20 ? "Mínimo" : "Médio";
          mockAnalysis += "O preço tocou a banda inferior com RSI em sobrevenda extremo, sugerindo forte probabilidade de reversão imediata de alta nas próximas velas.";
        } else if (signalType === "PUT") {
          mockConfidence = rsi && rsi > 70 ? 76 : 64;
          mockRisk = rsi && rsi > 80 ? "Mínimo" : "Médio";
          mockAnalysis += "O preço atingiu a banda de Bollinger superior em confluência com RSI sobrecomprado, indicando exaustão compradora e provável correção de baixa.";
        } else {
          mockAnalysis += "Estabilidade no meio de canais. Recomenda-se aguardar aproximação de suportes e resistências relevantes para melhores oportunidades.";
        }

        return res.json({
          recommendation: mockRecommendation,
          confidence: mockConfidence,
          risk: mockRisk,
          analysis: mockAnalysis,
          isMock: true
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendation: { type: Type.STRING, description: "CALL, PUT ou NENHUM" },
              confidence: { type: Type.INTEGER, description: "Nível de confiança de 0 a 100" },
              risk: { type: Type.STRING, description: "Mínimo, Médio ou Alto" },
              analysis: { type: Type.STRING, description: "Explicação técnica concisa" }
            },
            required: ["recommendation", "confidence", "risk", "analysis"]
          }
        }
      });

      const responseText = response.text || "{}";
      const cleanedText = responseText.trim();
      const analysisResult = JSON.parse(cleanedText);
      res.json({ ...analysisResult, isMock: false });

    } catch (err: any) {
      console.error("Erro na análise do Gemini:", err);
      // Retornar fallback elegante para manter operabilidade caso ocorra falha de rede/API
      res.json({
        recommendation: "NENHUM",
        confidence: 0,
        risk: "Alto",
        analysis: `Erro na comunicação com a IA: ${err.message || err}. Analise manualmente pelos gráficos de indicadores técnicos.`,
        isError: true
      });
    }
  });

  // API Route: Real-world Forex base rate fetch from public exchange rate API (Frankfurter)
  app.get("/api/forex/latest", async (req, res) => {
    try {
      const controller = new AbortController();
      const signalTimeout = setTimeout(() => controller.abort(), 4000);

      const response = await fetch("https://api.frankfurter.app/latest?from=USD", {
        signal: controller.signal
      });
      clearTimeout(signalTimeout);

      if (!response.ok) {
        throw new Error(`Frankfurter API returned status: ${response.status}`);
      }

      const data: any = await response.json();
      const rates = data.rates || {};

      // Map basic currencies to our Forex pairs accurately
      // Rates are relative to USD (1 USD = X currencies)
      const eur_usd = rates.EUR ? parseFloat((1 / rates.EUR).toFixed(5)) : 1.12450;
      const gbp_usd = rates.GBP ? parseFloat((1 / rates.GBP).toFixed(5)) : 1.28200;
      const usd_jpy = rates.JPY ? parseFloat(rates.JPY.toFixed(3)) : 154.380;
      const aud_usd = rates.AUD ? parseFloat((1 / rates.AUD).toFixed(5)) : 0.66540;
      const usd_cad = rates.CAD ? parseFloat(rates.CAD.toFixed(5)) : 1.36820;
      
      // EUR/GBP = USD/GBP * EUR/USD ratio (rates.GBP / rates.EUR)
      const eur_gbp = (rates.EUR && rates.GBP) 
        ? parseFloat((rates.GBP / rates.EUR).toFixed(5)) 
        : 0.87620;

      res.json({
        success: true,
        source: "Frankfurter API (European Central Bank)",
        date: data.date,
        rates: {
          "EUR/USD": eur_usd,
          "GBP/USD": gbp_usd,
          "USD/JPY": usd_jpy,
          "AUD/USD": aud_usd,
          "USD/CAD": usd_cad,
          "EUR/GBP": eur_gbp
        }
      });

    } catch (err: any) {
      console.warn("Falha ao obter taxas de Forex reais do Frankfurter API (usando fallbacks locales):", err.message);
      // Fallback robusto instantâneo com valores padrão estáticos
      res.json({
        success: false,
        source: "Locally Seeded Offline Fallback",
        error: err.message,
        rates: {
          "EUR/USD": 1.12450,
          "GBP/USD": 1.28200,
          "USD/JPY": 154.380,
          "AUD/USD": 0.66540,
          "USD/CAD": 1.36820,
          "EUR/GBP": 0.87620
        }
      });
    }
  });

  // Serve static assets in production or use Vite middleware in dev
  if (process.env.NODE_ENV !== "production") {
    console.log("Iniciando Vite em modo de desenvolvimento...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Servindo arquivos de produção compilados...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BINARYFOREX SERVER] rodando com sucesso em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Erro ao iniciar o servidor express:", err);
});
