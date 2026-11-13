import express from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware CORS completo per gestire richieste da iframe e cross-origin
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Range");
  res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

// Body parser con limite aumentato per PDF e scansioni ad alta risoluzione
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Istanziazione dell'SDK Gemini con header User-Agent richiesto
function getAi(customApiKey?: string): GoogleGenAI {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY non configurata nel server o nella richiesta");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "2.0.0-with-ai-invoice-scanner" });
});

// Helper per formattare errori di Gemini (503 alta richiesta, 429 quota, ecc.) in messaggi chiari
function formatGeminiError(error: any): string {
  if (!error) return "Errore sconosciuto durante l'elaborazione del documento con AI.";
  const msg = error.message || String(error);
  try {
    const parsed = JSON.parse(msg);
    if (parsed?.error?.code === 503 || parsed?.error?.status === "UNAVAILABLE") {
      return "I server AI di Google stanno riscontrando un picco temporaneo di traffico (503 - Alta richiesta). Riprova tra 1-2 minuti oppure clicca su 'Usa Fattura Esempio' per testare immediatamente.";
    }
    if (parsed?.error?.code === 429 || parsed?.error?.status === "RESOURCE_EXHAUSTED") {
      return "Limite temporaneo di richieste raggiunto sui server AI (429). Attendi qualche istante e riprova.";
    }
    if (parsed?.error?.message) {
      return `Errore motore AI: ${parsed.error.message}`;
    }
  } catch {
    // Non è formato JSON standard
  }
  if (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE")) {
    return "I server AI di Google stanno riscontrando un picco temporaneo di traffico (503 - Alta richiesta). Riprova tra 1-2 minuti oppure clicca su 'Usa Fattura Esempio' per testare immediatamente.";
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
    return "Limite temporaneo di richieste raggiunto sui server AI (429). Attendi qualche istante e riprova.";
  }
  return msg;
}

// Endpoint per la scansione ed estrazione intelligente da PDF o Immagine di fatture/DDT
app.post("/api/ai/parse-invoice", async (req, res) => {
  try {
    const { fileBase64, mimeType, fileName, existingProducts } = req.body;

    if (!fileBase64) {
      return res.status(400).json({ error: "File base64 mancante" });
    }

    let effectiveMime = mimeType || "application/pdf";
    const customKey = (req.headers["x-gemini-key"] as string) || req.body?.customApiKey;
    const ai = getAi(customKey);

    // Sanitizza la stringa base64 rimuovendo eventuale prefisso data URL e spazi/a capo
    const base64MarkerIndex = fileBase64.indexOf(";base64,");
    let cleanBase64 = "";
    if (base64MarkerIndex !== -1) {
      // Estrai mime type effettivo se presente nell'intestazione data:
      const mimeMatch = fileBase64.substring(0, base64MarkerIndex).match(/^data:([^;]+)/);
      if (mimeMatch && mimeMatch[1]) {
        effectiveMime = mimeMatch[1];
      }
      cleanBase64 = fileBase64.substring(base64MarkerIndex + 8);
    } else if (fileBase64.startsWith("data:")) {
      const commaIndex = fileBase64.indexOf(",");
      cleanBase64 = commaIndex !== -1 ? fileBase64.substring(commaIndex + 1) : fileBase64;
    } else {
      cleanBase64 = fileBase64;
    }
    cleanBase64 = cleanBase64.trim().replace(/[\r\n\s]/g, "");

    // Determinazione accurata del MIME type tramite magic bytes e nome file per evitare rifiuti da Gemini
    const lowerFileName = (fileName || "").toLowerCase();
    if (cleanBase64.startsWith("JVBERi0") || lowerFileName.endsWith(".pdf") || effectiveMime.includes("pdf")) {
      effectiveMime = "application/pdf";
    } else if (cleanBase64.startsWith("/9j/") || lowerFileName.endsWith(".jpg") || lowerFileName.endsWith(".jpeg") || effectiveMime.includes("jpeg") || effectiveMime.includes("jpg")) {
      effectiveMime = "image/jpeg";
    } else if (cleanBase64.startsWith("iVBORw0KGgo") || lowerFileName.endsWith(".png") || effectiveMime.includes("png")) {
      effectiveMime = "image/png";
    } else if (cleanBase64.startsWith("UklGR") || lowerFileName.endsWith(".webp") || effectiveMime.includes("webp")) {
      effectiveMime = "image/webp";
    }

    const existingCatalogInfo = Array.isArray(existingProducts) && existingProducts.length > 0
      ? `CATALOGO ATTUALE DEI PRODOTTI NEL MAGAZZINO:
${existingProducts.map((p: any) => `- ID: "${p.id}" | Nome: "${p.name}" | Categoria: "${p.category}" | Unità: "${p.unit}" | Costo Attuale: €${p.unitCost} | Prezzo Vendita: €${p.defaultPrice}`).join("\n")}`
      : "Nessun prodotto attualmente a catalogo.";

    const systemInstruction = `Sei un esperto contabile e gestore di magazzino per distributori automatici (vending machines) in Italia.
Il tuo compito è analizzare con precisione millimetrica il documento fornito (Fattura d'acquisto, Fattura Accompagnatoria o Documento di Trasporto DDT di un fornitore di bibite, snack, caffè o alimentari).

REGOLE CRUCIALI RICHIESTE DALL'UTENTE:
1. ARROTONDAMENTO PREZZO UNITARIO (unitCost):
   Arrotonda SEMPRE il prezzo unitario al centesimo (2 cifre decimali) per eccesso o per difetto secondo la regola matematica standard:
   - Se il 3° decimale è < 5 (es. 0,234), arrotonda per difetto a 0.23.
   - Se il 3° decimale è >= 5 (es. 0,237 oppure 0,235), arrotonda per eccesso a 0.24.
   Non restituire mai più di 2 decimali per unitCost.

2. ACCORPAMENTO PRODOTTI UGUALI:
   Se nel documento compaiono più righe per lo stesso identico prodotto (es. due righe di "Oro Ciock", "Coca Cola", o lo stesso articolo fatturato su più righe/confezioni):
   - DEVI UNIRLI in una sola riga (un unico prodotto).
   - quantity: somma totale di tutti i pezzi singoli di tutte le righe del prodotto.
   - packageCount: somma dei cartoni/colli totali.
   - totalCostNet: somma dei totali imponibili netti.
   - unitCost: calcolato come (totalCostNet / quantity) arrotondato a 2 decimali per eccesso o difetto.

3. SCADENZA PRODOTTI (expiryDate):
   Poiché sulle fatture commerciali la data di scadenza NON è presente (è stampata fisicamente sui singoli prodotti o cartoni), lascia expiryDate vuota "" oppure omettila. L'utente la imposterà manualmente nell'interfaccia.

ESTRAI I SEGUENTI DATI:
1. Dati Intestazione Documento:
   - supplierName: Ragione sociale del fornitore (es. "Coca-Cola HBC Italia S.r.l.", "Grossista Bevande Vending", "Lavazza S.p.A.")
   - invoiceNumber: Numero fattura o DDT (es. "FT-2026/04", "DDT-9082", "1234/A")
   - invoiceDate: Data documento nel formato standard YYYY-MM-DD (converti date italiane es. 12/03/2026 -> 2026-03-12)
   - dueDate: Data scadenza pagamento YYYY-MM-DD (se presente sul documento, altrimenti calcola 30 o 60 giorni dopo)
   - paymentMethod: Modalità di pagamento (es. "Bonifico Bancario 30gg d.f.", "Ri.Ba.", "Contanti alla consegna", "Carta di Credito")
   - paymentStatus: "da_pagare" oppure "pagata" (se esplicitato "Pagato" o "Quietanza")
   - taxRate: Aliquota IVA prevalente in percentuale (numero, es. 22, 10 o 4)
   - totalTaxable: Totale imponibile netto delle merci in Euro (numero float con 2 decimali)
   - totalTax: Totale imposta IVA in Euro (numero float con 2 decimali)
   - totalAmount: Totale complessivo del documento comprensivo di IVA in Euro (numero float con 2 decimali)
   - notes: Note, riferimenti ordine o annotazioni rilevanti

2. Righe Articoli e Merci accorpate (items):
   Per OGNI prodotto distinto presente nel documento estrai:
   - productName: Nome chiaro e leggibile del prodotto (es. "Oro Ciok", "Coca-Cola Lattina 330ml", "Acqua San Benedetto 500ml", "Kinder Bueno 43g")
   - matchedProductId: Se il prodotto corrisponde o è affine a uno dei prodotti del CATALOGO ATTUALE fornito, inserisci il suo ID esatto (es. "prod-coca-cola"). Se è un articolo nuovo non presente, inserisci null o stringa vuota.
   - isNewProduct: true se non è nel catalogo, false se abbinato a un prodotto esistente
   - category: Categoria appropriata tra: "bevande_fredde", "caffe_calde", "snack_dolci", "snack_salati", "freschi_healthy"
   - quantity: Quantità totale sommata di tutti i pezzi singoli (es. se ci sono 2 righe di Oro Ciok con 24 e 48 pezzi, inserisci 72)
   - packageCount: Numero totale di cartoni/fardelli acquistati (sommato se su più righe)
   - unitsPerPackage: Numero di pezzi per cartone (default quantity / packageCount)
   - unit: Unità di misura (es. "pz", "lattine", "bottiglie", "brik", "kg")
   - unitCost: Prezzo d'acquisto unitario netto arrotondato a 2 decimali per eccesso o per difetto (es. 0.234 -> 0.23, 0.237 -> 0.24)
   - vatRate: Aliquota IVA applicata (es. 22, 10, 4)
   - totalCostNet: Totale netto imponibile sommato di questo prodotto a 2 decimali
   - batchNumber: Codice lotto se presente, oppure combinazione di lotti se diversi (es. "L2608" o "")
   - expiryDate: Lascia vuoto "" (l'utente inserirà la scadenza manualmente dalla confezione fisica)
   - defaultPrice: Prezzo consigliato di vendita al distributore (es. se costo è 0.24€ -> prezzo vendita 1.00€ o 1.10€).

${existingCatalogInfo}

Restituisci esclusivamente un oggetto JSON valido conforme allo schema richiesto.`;

    const promptText = `Analizza questo documento contabile (Fattura o DDT d'acquisto per distributori automatici) ed estrai tutti i dati di intestazione, fornitore, totali e tutte le righe di prodotti per il carico a magazzino.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        supplierName: { type: Type.STRING, description: "Nome fornitore o ragione sociale" },
        invoiceNumber: { type: Type.STRING, description: "Numero fattura o DDT" },
        invoiceDate: { type: Type.STRING, description: "Data emissione YYYY-MM-DD" },
        dueDate: { type: Type.STRING, description: "Data scadenza pagamento YYYY-MM-DD" },
        paymentMethod: { type: Type.STRING, description: "Metodo di pagamento" },
        paymentStatus: { type: Type.STRING, description: "pagata o da_pagare" },
        taxRate: { type: Type.NUMBER, description: "Aliquota IVA prevalente %" },
        totalTaxable: { type: Type.NUMBER, description: "Totale imponibile netto €" },
        totalTax: { type: Type.NUMBER, description: "Totale IVA €" },
        totalAmount: { type: Type.NUMBER, description: "Totale complessivo fattura €" },
        notes: { type: Type.STRING, description: "Note e annotazioni documento" },
        items: {
          type: Type.ARRAY,
          description: "Elenco righe merce della fattura",
          items: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING, description: "Nome del prodotto" },
              matchedProductId: { type: Type.STRING, description: "ID del prodotto a catalogo se abbinato" },
              isNewProduct: { type: Type.BOOLEAN, description: "Se è un nuovo articolo da creare" },
              category: { type: Type.STRING, description: "bevande_fredde, caffe_calde, snack_dolci, snack_salati, freschi_healthy" },
              quantity: { type: Type.NUMBER, description: "Quantità totale pezzi singoli" },
              packageCount: { type: Type.NUMBER, description: "Numero confezioni/cartoni" },
              unitsPerPackage: { type: Type.NUMBER, description: "Pezzi per confezione" },
              unit: { type: Type.STRING, description: "Unità (pz, lattine, bottiglie, ecc.)" },
              unitCost: { type: Type.NUMBER, description: "Costo unitario netto €" },
              vatRate: { type: Type.NUMBER, description: "Aliquota IVA % riga" },
              totalCostNet: { type: Type.NUMBER, description: "Totale netto imponibile riga €" },
              batchNumber: { type: Type.STRING, description: "Codice lotto" },
              expiryDate: { type: Type.STRING, description: "Data scadenza YYYY-MM-DD" },
              defaultPrice: { type: Type.NUMBER, description: "Prezzo vendita consigliato al distributore €" }
            },
            required: ["productName", "quantity", "unitCost", "vatRate", "category"]
          }
        }
      },
      required: ["supplierName", "invoiceNumber", "invoiceDate", "totalTaxable", "totalAmount", "items"]
    };

    // Catena di fallback sui modelli in caso di 503 (high demand), 429 quota o indisponibilità temporanea
    const candidateModels = [
      "gemini-flash-latest",
      "gemini-3.8-flash",
      "gemini-3.1-pro-preview",
      "gemini-3.1-flash-lite"
    ];

    let response: any = null;
    let lastError: any = null;

    for (let i = 0; i < candidateModels.length; i++) {
      const modelName = candidateModels[i];
      try {
        console.log(`[AI Invoice] Tentativo con modello ${modelName} (${i + 1}/${candidateModels.length}) per file MIME ${effectiveMime}...`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: effectiveMime,
                  data: cleanBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema,
          },
        });

        if (response && response.text) {
          console.log(`[AI Invoice] Successo con modello ${modelName}`);
          break;
        }
      } catch (modelErr: any) {
        lastError = modelErr;
        console.warn(`[AI Invoice] Modello ${modelName} ha restituito errore:`, modelErr?.message?.substring(0, 150));
        // Se c'è un modello successivo, attendi 800ms prima di ritentare
        if (i < candidateModels.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("Nessuna risposta valida dai modelli AI");
    }

    const responseText = response.text || "{}";
    let parsedData: any;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      // Fallback: rimuovi eventuali blocchi markdown ```json ... ```
      const cleanedText = responseText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      parsedData = JSON.parse(cleanedText);
    }

    // Helper per arrotondamento standard a 2 cifre decimali (es. 0.234 -> 0.23, 0.237 -> 0.24)
    const round2 = (num: number): number => {
      const n = Number(num) || 0;
      return Math.round((n + Number.EPSILON) * 100) / 100;
    };

    // Normalizzazione stringa per accorpamento prodotti identici (es. "Oro Ciok", "Oro Ciock", "ORO CIOK")
    const normalizeName = (name: string): string => {
      return (name || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };

    // Accorpamento righe con lo stesso prodotto e ricalcolo sommato
    if (parsedData && Array.isArray(parsedData.items)) {
      const groupedMap = new Map<string, any>();

      for (const item of parsedData.items) {
        if (!item) continue;
        const name = (item.productName || "Prodotto").trim();
        const matchedId = item.matchedProductId ? String(item.matchedProductId).trim() : "";
        
        // Se c'è un ID catalogo abbina per ID, altrimenti per nome normalizzato
        const groupKey = matchedId ? `id:${matchedId}` : `name:${normalizeName(name)}`;

        const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
        const rawUnitCost = Number(item.unitCost) || 0;
        const unitCost = round2(rawUnitCost);
        const totalCostNet = item.totalCostNet && Number(item.totalCostNet) > 0
          ? round2(Number(item.totalCostNet))
          : round2(qty * unitCost);
        const packageCount = Math.max(1, Math.round(Number(item.packageCount) || 1));
        const vatRate = Number(item.vatRate) || 22;

        const normalizedItem = {
          ...item,
          productName: name,
          quantity: qty,
          packageCount,
          unitsPerPackage: item.unitsPerPackage ? Math.round(Number(item.unitsPerPackage)) : Math.round(qty / packageCount) || qty,
          unit: item.unit || "pz",
          unitCost,
          totalCostNet,
          vatRate,
          batchNumber: item.batchNumber || "",
          // La scadenza deve poter essere inserita manualmente dall'utente
          expiryDate: item.expiryDate && item.expiryDate !== "null" ? item.expiryDate : "",
          defaultPrice: item.defaultPrice ? round2(Number(item.defaultPrice)) : round2(unitCost * 2.2),
        };

        if (groupedMap.has(groupKey)) {
          const existing = groupedMap.get(groupKey);
          const combinedQty = existing.quantity + normalizedItem.quantity;
          const combinedPackages = existing.packageCount + normalizedItem.packageCount;
          const combinedTotalNet = round2(existing.totalCostNet + normalizedItem.totalCostNet);
          // Prezzo unitario medio ponderato arrotondato per eccesso o per difetto a 2 cifre
          const combinedUnitCost = combinedQty > 0 ? round2(combinedTotalNet / combinedQty) : existing.unitCost;
          
          let combinedBatch = existing.batchNumber || "";
          if (normalizedItem.batchNumber && normalizedItem.batchNumber !== existing.batchNumber) {
            combinedBatch = combinedBatch ? `${combinedBatch} / ${normalizedItem.batchNumber}` : normalizedItem.batchNumber;
          }

          groupedMap.set(groupKey, {
            ...existing,
            quantity: combinedQty,
            packageCount: combinedPackages,
            totalCostNet: combinedTotalNet,
            unitCost: combinedUnitCost,
            batchNumber: combinedBatch,
            expiryDate: existing.expiryDate || normalizedItem.expiryDate || "",
            // Mantieni il prezzo di vendita più alto impostato
            defaultPrice: Math.max(existing.defaultPrice, normalizedItem.defaultPrice),
          });
        } else {
          groupedMap.set(groupKey, normalizedItem);
        }
      }

      parsedData.items = Array.from(groupedMap.values());

      // Ricalcola totali fattura
      const totalTaxable = round2(parsedData.items.reduce((s: number, i: any) => s + (i.totalCostNet || 0), 0));
      parsedData.totalTaxable = totalTaxable;
      if (!parsedData.totalTax || parsedData.totalTax <= 0) {
        parsedData.totalTax = round2(totalTaxable * ((parsedData.taxRate || 22) / 100));
      }
      parsedData.totalAmount = round2(parsedData.totalTaxable + parsedData.totalTax);
    }

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error("Errore durante l'estrazione AI della fattura:", error);
    const friendlyMessage = formatGeminiError(error);
    return res.status(200).json({
      success: false,
      error: friendlyMessage,
    });
  }
});

async function startServer() {
  const httpServer = http.createServer(app);

  // Vite middleware in sviluppo, file statici in produzione
  if (process.env.NODE_ENV !== "production") {
    const isHmrDisabled = process.env.DISABLE_HMR === "true";
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server gestionale vending avviato con successo sulla porta ${PORT}`);
  });
}

startServer();
