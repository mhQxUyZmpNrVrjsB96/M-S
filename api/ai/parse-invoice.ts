import { GoogleGenAI, Type } from "@google/genai";

function formatGeminiError(error: any): string {
  if (!error) return "Errore sconosciuto durante l'elaborazione del documento con AI.";
  const msg = error.message || String(error);
  if (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE")) {
    return "I server AI di Google stanno riscontrando un picco temporaneo di traffico (503). Riprova tra 1-2 minuti o usa una fattura d'esempio.";
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
    return "Limite temporaneo di richieste raggiunto sui server AI (429). Attendi qualche istante e riprova.";
  }
  return msg;
}

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileBase64, mimeType, fileName, existingProducts } = req.body || {};

    if (!fileBase64) {
      return res.status(400).json({ error: "File base64 mancante" });
    }

    const apiKey = process.env.GEMINI_API_KEY || (req.headers["x-gemini-key"] as string) || req.body?.customApiKey;
    if (!apiKey) {
      return res.status(200).json({ 
        success: false, 
        error: "Chiave GEMINI_API_KEY non trovata. Inserisci la tua chiave Gemini nelle impostazioni o nelle Environment Variables di Vercel." 
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    let effectiveMime = mimeType || "application/pdf";
    const base64MarkerIndex = fileBase64.indexOf(";base64,");
    let cleanBase64 = "";
    if (base64MarkerIndex !== -1) {
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
${existingProducts.map((p: any) => `- ID: "${p.id}" | Nome: "${p.name}" | Categoria: "${p.category}" | Unità: "${p.unit}" | Costo: €${p.unitCost} | Prezzo: €${p.defaultPrice}`).join("\n")}`
      : "Nessun prodotto attualmente a catalogo.";

    const systemInstruction = `Sei un esperto contabile e gestore di magazzino per distributori automatici in Italia.
Analizza con precisione la fattura o DDT d'acquisto fornita.
Regole:
1. Arrotonda SEMPRE il prezzo unitario al centesimo (2 cifre decimali).
2. Accorpa righe dello stesso identico prodotto.
3. Lascia expiryDate vuota se non indicata esplicitamente.
${existingCatalogInfo}
Restituisci esclusivamente un oggetto JSON conforme allo schema.`;

    const promptText = `Analizza questo documento contabile (Fattura o DDT d'acquisto per distributori automatici) ed estrai intestazione, fornitore e righe merce.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        supplierName: { type: Type.STRING },
        invoiceNumber: { type: Type.STRING },
        invoiceDate: { type: Type.STRING },
        dueDate: { type: Type.STRING },
        paymentMethod: { type: Type.STRING },
        paymentStatus: { type: Type.STRING },
        taxRate: { type: Type.NUMBER },
        totalTaxable: { type: Type.NUMBER },
        totalTax: { type: Type.NUMBER },
        totalAmount: { type: Type.NUMBER },
        notes: { type: Type.STRING },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              matchedProductId: { type: Type.STRING },
              isNewProduct: { type: Type.BOOLEAN },
              category: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              packageCount: { type: Type.NUMBER },
              unitsPerPackage: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              unitCost: { type: Type.NUMBER },
              vatRate: { type: Type.NUMBER },
              totalCostNet: { type: Type.NUMBER },
              batchNumber: { type: Type.STRING },
              expiryDate: { type: Type.STRING },
              defaultPrice: { type: Type.NUMBER }
            },
            required: ["productName", "quantity", "unitCost", "vatRate", "category"]
          }
        }
      },
      required: ["supplierName", "invoiceNumber", "invoiceDate", "totalTaxable", "totalAmount", "items"]
    };

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
          break;
        }
      } catch (modelErr: any) {
        lastError = modelErr;
        if (i < candidateModels.length - 1) {
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("Nessuna risposta valida dai modelli AI");
    }

    let parsedData = JSON.parse(response.text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim());

    const round2 = (num: number): number => {
      const n = Number(num) || 0;
      return Math.round((n + Number.EPSILON) * 100) / 100;
    };

    const normalizeName = (name: string): string => {
      return (name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
    };

    if (parsedData && Array.isArray(parsedData.items)) {
      const groupedMap = new Map<string, any>();
      for (const item of parsedData.items) {
        if (!item) continue;
        const name = (item.productName || "Prodotto").trim();
        const matchedId = item.matchedProductId ? String(item.matchedProductId).trim() : "";
        const groupKey = matchedId ? `id:${matchedId}` : `name:${normalizeName(name)}`;
        const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
        const unitCost = round2(Number(item.unitCost) || 0);
        const totalCostNet = item.totalCostNet && Number(item.totalCostNet) > 0 ? round2(Number(item.totalCostNet)) : round2(qty * unitCost);
        const packageCount = Math.max(1, Math.round(Number(item.packageCount) || 1));

        const normalizedItem = {
          ...item,
          productName: name,
          quantity: qty,
          packageCount,
          unitsPerPackage: item.unitsPerPackage ? Math.round(Number(item.unitsPerPackage)) : Math.round(qty / packageCount) || qty,
          unit: item.unit || "pz",
          unitCost,
          totalCostNet,
          vatRate: Number(item.vatRate) || 22,
          batchNumber: item.batchNumber || "",
          expiryDate: item.expiryDate && item.expiryDate !== "null" ? item.expiryDate : "",
          defaultPrice: item.defaultPrice ? round2(Number(item.defaultPrice)) : round2(unitCost * 2.2),
        };

        if (groupedMap.has(groupKey)) {
          const existing = groupedMap.get(groupKey);
          const combinedQty = existing.quantity + normalizedItem.quantity;
          const combinedTotalNet = round2(existing.totalCostNet + normalizedItem.totalCostNet);
          groupedMap.set(groupKey, {
            ...existing,
            quantity: combinedQty,
            packageCount: existing.packageCount + normalizedItem.packageCount,
            totalCostNet: combinedTotalNet,
            unitCost: combinedQty > 0 ? round2(combinedTotalNet / combinedQty) : existing.unitCost,
            batchNumber: existing.batchNumber || normalizedItem.batchNumber,
            defaultPrice: Math.max(existing.defaultPrice, normalizedItem.defaultPrice),
          });
        } else {
          groupedMap.set(groupKey, normalizedItem);
        }
      }

      parsedData.items = Array.from(groupedMap.values());
      parsedData.totalTaxable = round2(parsedData.items.reduce((s: number, i: any) => s + (i.totalCostNet || 0), 0));
      if (!parsedData.totalTax || parsedData.totalTax <= 0) {
        parsedData.totalTax = round2(parsedData.totalTaxable * ((parsedData.taxRate || 22) / 100));
      }
      parsedData.totalAmount = round2(parsedData.totalTaxable + parsedData.totalTax);
    }

    return res.status(200).json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error("Errore parse-invoice serverless:", error);
    return res.status(200).json({
      success: false,
      error: formatGeminiError(error),
    });
  }
}
