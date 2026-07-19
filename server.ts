import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Cloudinary Config
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // Multer for handling file uploads (memory storage)
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  app.use(express.json({ limit: '10mb' }));

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI Wine Tutor - Generate a random multiple choice question
  app.post("/api/ai/tutor/question", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ 
          error: "Gemini API key is not configured. Please add GEMINI_API_KEY in the app settings." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: "Generate a highly engaging, unique, and informative multiple choice question about wine. Topics can include wine history, grape varieties, regions, production techniques, or food pairings. Ensure the options are plausible but only one is correct. Provide a helpful, educational 1-2 sentence 'Did you know?' style explanation. Return only raw JSON without markdown formatting, code blocks, or triple backticks.",
        config: {
          systemInstruction: "You are an expert sommelier and dynamic wine quiz master. Your task is to generate one high-quality multiple choice question about wine in raw JSON format. Do not wrap the JSON output in markdown blocks like ```json ... ```.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              question: { 
                type: Type.STRING,
                description: "The trivia question about wine."
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 4 options."
              },
              correctAnswer: {
                type: Type.STRING,
                description: "The correct option. Must exactly match one of the values in the options array."
              },
              explanation: {
                type: Type.STRING,
                description: "A fascinating 1-2 sentence 'Did you know?' explanation related to the question."
              }
            },
            required: ["question", "options", "correctAnswer", "explanation"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response generated from Gemini");
      }

      // Robust JSON Parsing logic
      let cleanText = text.trim();
      // Remove any leading/trailing markdown code block notation if present
      if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      }

      try {
        const questionData = JSON.parse(cleanText);
        res.json(questionData);
      } catch (parseError: any) {
        console.error("Failed to parse Gemini JSON output, raw text was:", text, parseError);
        // Direct premium fallback question generated server-side if parse fails
        const serverFallbacks = [
          {
            question: "Which red grape variety is famous for being the dominant component of Bordeaux's Right Bank wines (such as Pomerol and Saint-Émilion)?",
            options: ["Cabernet Sauvignon", "Merlot", "Syrah", "Pinot Noir"],
            correctAnswer: "Merlot",
            explanation: "While Cabernet Sauvignon rules the Left Bank of Bordeaux, Merlot is the star of the Right Bank, producing softer, fleshier, plum-scented wines."
          },
          {
            question: "What is the primary white grape variety used in the famous French wine region of Chablis?",
            options: ["Sauvignon Blanc", "Chardonnay", "Chenin Blanc", "Riesling"],
            correctAnswer: "Chardonnay",
            explanation: "All white Chablis is made from 100% Chardonnay, celebrated for its crisp acidity, mineral character, and absence of heavy oak aging."
          }
        ];
        const randomFallback = serverFallbacks[Math.floor(Math.random() * serverFallbacks.length)];
        res.json(randomFallback);
      }
    } catch (error: any) {
      console.error("Quiz generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate wine question" });
    }
  });

  // AI Label Analysis
  app.post("/api/ai/analyze-label", async (req, res) => {
    try {
      const { imageUri } = req.body;
      if (!imageUri) {
        return res.status(400).json({ error: "No image URI provided" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ 
          error: "Gemini API key is not configured. Please add GEMINI_API_KEY in the app settings." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      let base64 = "";
      let mimeType = "image/jpeg";

      if (imageUri.startsWith('data:')) {
        const split = imageUri.split(',');
        if (split.length > 1) {
          base64 = split[1];
          const match = imageUri.match(/^data:([^;]+);/);
          if (match) mimeType = match[1];
        } else {
          return res.status(400).json({ error: "Malformed data URL provided" });
        }
      } else {
        const imgResponse = await fetch(imageUri);
        if (!imgResponse.ok) {
          return res.status(400).json({ error: `Failed to fetch image from URL: ${imgResponse.statusText}` });
        }
        const arrayBuffer = await imgResponse.arrayBuffer();
        base64 = Buffer.from(arrayBuffer).toString('base64');
        mimeType = imgResponse.headers.get('content-type') || 'image/jpeg';
      }

      const systemInstruction = `You are a professional sommelier. Analyze the wine label in the image and extract information into structured JSON.
      Be extremely descriptive and precise with the analytical profile fields:
      - appearance: Describe the appearance, clarity, intensity, and specific color hue.
      - nose: Describe the nose/aromatics (primary fruit characters, secondary fermentation or oak notes, tertiary notes).
      - palate: Describe the palate and structure (body, acidity level, tannin strength, alcohol heat, taste profiles).
      - finish: Describe the finish (length, persistence, and lingering flavors).
      - mainTastingNotes: A concise, poetic 1-2 sentence professional sommelier tasting summary/quote suitable for a list view.
      
      Suggest 3 specific 'foodPairing' ideas that would complement this specific wine.
      Be precise with classifications like (Red, White, Rosé, Sparkling, Orange).`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            { text: "Identify this wine label details. Provide rich tasting notes and food pairings." },
            {
              inlineData: {
                data: base64,
                mimeType: mimeType
              }
            }
          ]
        },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              producer: { type: Type.STRING },
              year: { type: Type.STRING },
              type: { type: Type.STRING },
              region: { type: Type.STRING },
              country: { type: Type.STRING },
              grape: { type: Type.ARRAY, items: { type: Type.STRING } },
              tastingNotes: { type: Type.STRING, description: "Detailed tasting notes (alternative/legacy field)" },
              appearance: { type: Type.STRING, description: "Detailed Appearance & Hue of the wine" },
              nose: { type: Type.STRING, description: "The Nose / Aromatics description of the wine" },
              palate: { type: Type.STRING, description: "Palate & Structure description of the wine" },
              finish: { type: Type.STRING, description: "The Finish / persistence description of the wine" },
              mainTastingNotes: { type: Type.STRING, description: "Concise 1-2 sentence professional sommelier tasting summary" },
              foodPairing: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      });

      const text = result.text;
      if (!text) {
        return res.status(500).json({ error: "No response from AI Sommelier" });
      }

      let cleanText = text.trim();
      if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      }

      try {
        const parsedData = JSON.parse(cleanText);
        res.json(parsedData);
      } catch (parseError: any) {
        console.error("Failed to parse AI Sommelier JSON output, raw text was:", text, parseError);
        res.status(500).json({ error: "AI Sommelier response was invalid or failed to parse. Please try again." });
      }
    } catch (error: any) {
      console.error("AI label analysis error details:", error);
      res.status(500).json({ error: error.message || "Failed to analyze wine label" });
    }
  });

  // API Routes
  app.post("/api/upload", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(500).json({ 
          error: "Cloudinary is not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the app settings." 
        });
      }

      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;

      const result = await cloudinary.uploader.upload(dataURI, {
        resource_type: "auto",
        folder: "wine-diary",
      });

      res.json({ url: result.secure_url });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
