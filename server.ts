import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any;
try {
  db = new Database("cache.db");
  // Initialize database
  db.exec(`
    CREATE TABLE IF NOT EXISTS math_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grade TEXT,
      topic TEXT,
      content TEXT,
      problems TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch (e) {
  console.warn("SQLite database could not be initialized. Caching will be disabled or in-memory only.");
  db = null;
}

export const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API Route for generating problems
app.post("/api/problems", async (req, res) => {
    const { grade, topic, content, count, customApiKey } = req.body;
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: "API Key is missing" });
    }

    // Check cache first
    let cached: any = null;
    if (db) {
      try {
        cached = db.prepare("SELECT problems FROM math_cache WHERE grade = ? AND topic = ? AND content = ?")
          .get(grade, topic, content);
      } catch (e) {
        console.error("Cache read error:", e);
      }
    }

    if (cached) {
      console.log("Serving from cache...");
      const problems = JSON.parse(cached.problems);
      // If we need more than we have, we might need to regenerate, but for now just return what we have
      return res.json(problems.slice(0, count));
    }

    console.log("Generating new problems with Gemini...");
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Генерирај ${count || 10} математички задачи за ${grade} одделение, на тема "${topic}" и содржина "${content}". 
        Задачите треба да бидат на македонски јазик и соодветни за возраста.
        ВАЖНО: Одговорите треба да бидат само бројни вредности (без мерни единици како cm, kg итн.). 
        Користи точка (.) како децимален сепаратор.
        За секоја задача генерирај точно 4 опции за избор (една точна и три неточни).
        Врати ги во JSON формат како низа од објекти со својства: question, answer, options (низа од точно 4 опции), explanation.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                explanation: { type: Type.STRING }
              },
              required: ["question", "answer", "options"]
            }
          }
        }
      });

      const problems = JSON.parse(response.text || "[]");
      
      // Save to cache
      if (db) {
        try {
          db.prepare("INSERT INTO math_cache (grade, topic, content, problems) VALUES (?, ?, ?, ?)")
            .run(grade, topic, content, JSON.stringify(problems));
        } catch (e) {
          console.error("Cache write error:", e);
        }
      }

      res.json(problems.slice(0, count));
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to generate problems" });
    }
  });

// Vite middleware for development
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

// Only listen if not on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
