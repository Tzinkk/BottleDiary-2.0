import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Lazy initializer for GoogleGenAI to prevent crashing on startup if key is missing
function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Robust fallback mechanism for model execution
async function generateContentWithFallback(ai: any, options: {
  model: string;
  contents: any;
  config?: any;
}) {
  // Always try the requested model first, then fall back to the ultra-reliable gemini-3.1-flash-lite
  const modelsToTry = [options.model, "gemini-3.1-flash-lite", "gemini-1.5-flash", "gemini-2.0-flash-lite"];
  const uniqueModels = Array.from(new Set(modelsToTry));

  let lastError: any = null;
  for (const model of uniqueModels) {
    try {
      console.log(`[Gemini API] Requesting generation using model: ${model}`);
      const result = await ai.models.generateContent({
        ...options,
        model,
      });
      console.log(`[Gemini API] Success using model: ${model}`);
      return result;
    } catch (err: any) {
      console.warn(`[Gemini API] Model ${model} failed: ${err.message || err}`);
      lastError = err;
    }
  }
  throw lastError || new Error("All fallback Gemini models failed to generate content.");
}

// API Routes FIRST

// Endpoint 1: Analyze label image
app.post("/api/gemini/analyze-label", async (req, res) => {
  try {
    const { imageUri } = req.body;
    if (!imageUri || typeof imageUri !== "string") {
      res.status(400).json({ error: "Invalid image URI" });
      return;
    }

    let base64 = "";
    let mimeType = "image/jpeg";

    if (imageUri.startsWith("data:")) {
      const split = imageUri.split(",");
      if (split.length > 1) {
        base64 = split[1];
        const match = imageUri.match(/^data:([^;]+);/);
        if (match) mimeType = match[1];
      } else {
        res.status(400).json({ error: "Malformed data URL provided" });
        return;
      }
    } else {
      // Fetch image from blob/remote URL
      const imgResponse = await fetch(imageUri);
      if (!imgResponse.ok) {
        res.status(400).json({ error: `Failed to fetch image: ${imgResponse.statusText}` });
        return;
      }
      const arrayBuffer = await imgResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      base64 = buffer.toString("base64");
      mimeType = imgResponse.headers.get("content-type") || "image/jpeg";
    }

    const ai = getAIClient();

    const systemInstruction = `You are a professional sommelier. Analyze the wine label in the image and extract information into structured JSON.
  Be extremely descriptive and precise with the analytical profile fields:
  - wineName: The full, complete name of the wine.
  - producer: The estate, winery, or producer name.
  - vintage: The harvest year (e.g., '2020') or 'NV' if Non-Vintage.
  - region: The wine region (e.g., 'Napa Valley', 'Bordeaux').
  - grapeVarieties: List of grape varieties (e.g., ['Cabernet Sauvignon', 'Merlot']).
  - tastingNotes: A rich, poetic 1-2 sentence professional sommelier tasting summary/quote.
  - type: Guessed wine classification (Red, White, Rosé, Sparkling, Orange, Natural Red, Natural White, Pet Nat).
  - country: The country of origin.
  - appearance: Detailed appearance and color.
  - nose: The nose/aromatics description.
  - palate: Palate and structural profile.
  - finish: The finish and persistence.
  - foodPairing: Array of 2-4 perfect food pairing dishes or components.
  - additionalNote: A short, elegant note with serving recommendation, potential cellaring time, or background details.`;

    const result = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: [
        "Identify this wine label details. Provide rich tasting notes and food pairings.",
        {
          inlineData: {
            data: base64,
            mimeType: mimeType,
          },
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            wineName: { type: Type.STRING },
            producer: { type: Type.STRING },
            vintage: { type: Type.STRING },
            region: { type: Type.STRING },
            grapeVarieties: { type: Type.ARRAY, items: { type: Type.STRING } },
            tastingNotes: { type: Type.STRING },
            type: { type: Type.STRING },
            country: { type: Type.STRING },
            appearance: { type: Type.STRING },
            nose: { type: Type.STRING },
            palate: { type: Type.STRING },
            finish: { type: Type.STRING },
            foodPairing: { type: Type.ARRAY, items: { type: Type.STRING } },
            additionalNote: { type: Type.STRING },
          },
          required: ["wineName", "producer", "vintage", "region", "grapeVarieties", "tastingNotes"],
        },
      },
    });

    const text = result.text;
    if (!text) {
      res.status(500).json({ error: "No response from AI Sommelier" });
      return;
    }

    let cleanText = text.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }

    const parsedData = JSON.parse(cleanText);
    res.json(parsedData);
  } catch (error: any) {
    console.error("Analyze label error:", error);
    res.status(500).json({ error: error.message || "Label analysis failed" });
  }
});

// Endpoint 2: Generate quiz question
app.post("/api/gemini/generate-quiz", async (req, res) => {
  try {
    const ai = getAIClient();
    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: "Generate a highly engaging, unique, and informative multiple choice question about wine. Topics can include wine history, grape varieties, regions, production techniques, or food pairings. Ensure the options are plausible but only one is correct. Provide a helpful, educational 1-2 sentence 'Did you know?' style explanation.",
      config: {
        systemInstruction: "You are an expert sommelier and dynamic wine quiz master. Your task is to generate one high-quality multiple choice question about wine in raw JSON format.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ["question", "options", "correctAnswer", "explanation"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      res.status(500).json({ error: "No response from AI" });
      return;
    }

    let cleanText = text.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }

    res.json(JSON.parse(cleanText));
  } catch (error: any) {
    console.error("Quiz generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate quiz question" });
  }
});

// Endpoint 3: Recommendations
app.post("/api/gemini/recommendations", async (req, res) => {
  try {
    const { bottles } = req.body;
    if (!bottles || !Array.isArray(bottles)) {
      res.status(400).json({ error: "Invalid bottles format" });
      return;
    }

    const ai = getAIClient();
    const prompt = `Based on my current wine diary containing these bottles: ${JSON.stringify(
      bottles
    )}, suggest 3 wine recommendations that I would love. For each recommendation, provide name, producer, type, region, country, grape varieties, and a concise reason.`;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              producer: { type: Type.STRING },
              type: { type: Type.STRING },
              region: { type: Type.STRING },
              country: { type: Type.STRING },
              grape: { type: Type.ARRAY, items: { type: Type.STRING } },
              reason: { type: Type.STRING },
            },
            required: ["name", "producer", "type", "region", "country", "grape", "reason"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) {
      res.json([]);
      return;
    }

    let cleanText = text.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }

    res.json(JSON.parse(cleanText));
  } catch (error: any) {
    console.error("Recommendations error:", error);
    res.status(500).json({ error: error.message || "Failed to generate recommendations" });
  }
});

// Endpoint 4: Refine notes
app.post("/api/gemini/refine-notes", async (req, res) => {
  try {
    const { rawNotes } = req.body;
    if (!rawNotes || typeof rawNotes !== "string") {
      res.status(400).json({ error: "Invalid raw notes" });
      return;
    }

    const ai = getAIClient();
    const prompt = `Rewrite the following rough, raw bullet-point wine tasting notes into a single, cohesive, professional, and elegant paragraph suitable for an editorial wine diary. Do not add any conversational text or explanation; return only the refined paragraph.

Rough notes:
${rawNotes}`;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const text = response.text;
    if (!text) {
      res.status(500).json({ error: "No response from AI" });
      return;
    }
    res.json({ refinedText: text.trim() });
  } catch (error: any) {
    console.error("Refine notes error:", error);
    res.status(500).json({ error: error.message || "Failed to refine notes" });
  }
});

// Endpoint 5: Generate tasting notes for bottle
app.post("/api/gemini/generate-notes", async (req, res) => {
  try {
    const { bottle } = req.body;
    if (!bottle) {
      res.status(400).json({ error: "Invalid bottle data" });
      return;
    }

    const ai = getAIClient();
    const prompt = `You are an expert sommelier. Based on the following wine details, generate a comprehensive tasting profile including tasting notes, appearance, nose, palate, finish, food pairing, and additional elegant serving notes:
  - Name: ${bottle.name}
  - Producer: ${bottle.producer}
  - Vintage: ${bottle.year}
  - Type: ${bottle.type}
  - Region: ${bottle.region}
  - Country: ${bottle.country}
  - Grape Varieties: ${bottle.grape ? (Array.isArray(bottle.grape) ? bottle.grape.join(', ') : bottle.grape) : 'Unknown'}`;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert sommelier. Generate detailed wine tasting profiles in raw JSON format.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tastingNotes: { type: Type.STRING },
            appearance: { type: Type.STRING },
            nose: { type: Type.STRING },
            palate: { type: Type.STRING },
            finish: { type: Type.STRING },
            foodPairing: { type: Type.ARRAY, items: { type: Type.STRING } },
            additionalNote: { type: Type.STRING },
          },
          required: ["tastingNotes", "appearance", "nose", "palate", "finish"],
        }
      }
    });

    const text = response.text;
    if (!text) {
      res.status(500).json({ error: "No response from AI" });
      return;
    }

    let cleanText = text.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }

    res.json(JSON.parse(cleanText));
  } catch (error: any) {
    console.error("Generate notes error:", error);
    res.status(500).json({ error: error.message || "Failed to generate notes" });
  }
});

// Vite middleware and fallbacks setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
