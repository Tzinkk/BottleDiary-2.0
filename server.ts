import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

  // API Routes
  app.post("/api/upload", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(500).json({ 
          error: "Cloudinary configuration is missing." 
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

  app.post("/api/analyze-label", async (req, res) => {
    try {
      const { imageUrl } = req.body;
      if (!imageUrl) return res.status(400).json({ error: "No image URL provided" });

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }

      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      const systemInstruction = `You are a professional sommelier. Analyze the wine label in the image and extract as much information as possible into a structured JSON format. 
      If you cannot find a piece of information, omit it from the JSON.
      Be precise with the classification (Red, White, Rosé, Sparkling, Natural Red, Natural White, Pet Nat, Orange, Sato, Sake).`;

      const result = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{
          parts: [
            { text: "Analyze this wine label and return JSON matching the schema." },
            {
              inlineData: {
                data: base64,
                mimeType: blob.type
              }
            }
          ]
        }],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              producer: { type: Type.STRING },
              year: { type: Type.STRING, description: "YYYY or NV" },
              type: { type: Type.STRING, description: "Red, White, Rosé, Sparkling, Natural Red, Natural White, Pet Nat, Orange, Sato, Sake" },
              region: { type: Type.STRING },
              country: { type: Type.STRING },
              grape: { type: Type.ARRAY, items: { type: Type.STRING } },
              tastingNotes: { type: Type.STRING, description: "Brief predicted tasting notes based on the wine's identity." }
            }
          }
        }
      });

      const text = result.response.text();
      console.log("AI Analysis result:", text);
      res.json(JSON.parse(text || "{}"));
    } catch (error) {
      console.error("AI Analysis error:", error);
      res.status(500).json({ error: "Failed to analyze wine label" });
    }
  });

  app.post("/api/recommend", async (req, res) => {
    try {
      const { bottles } = req.body;
      if (!bottles) return res.status(400).json({ error: "No bottles provided" });

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }

      const systemInstruction = `You are a world-class sommelier and AI wine recommendation engine. 
      Based on the user's current wine diary (provided in JSON), suggest 3 unique wines they would likely enjoy.
      Focus on: Diversity, Specificity, Personalization, and Scale.`;

      const result = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ text: `User Diary Data: ${JSON.stringify(bottles)}` }],
        config: {
          systemInstruction,
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
                reason: { type: Type.STRING }
              },
              required: ["name", "producer", "type", "region", "country", "grape", "reason"]
            }
          }
        }
      });

      const text = result.response.text();
      console.log("AI Recommendation result:", text);
      res.json(JSON.parse(text || "[]"));
    } catch (error) {
      console.error("AI Recommendation error:", error);
      res.status(500).json({ error: "Failed to get recommendations" });
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

startServer();
