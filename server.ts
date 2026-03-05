import express from "express";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any = null;

// Initialize database only if not on Vercel (SQLite doesn't work well there)
if (!process.env.VERCEL) {
  try {
    // Dynamic import to avoid issues in environments where better-sqlite3 isn't available
    const Database = (await import("better-sqlite3")).default;
    db = new Database("cache.db");
    db.exec(`
      CREATE TABLE IF NOT EXISTS math_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grade TEXT,
        topic TEXT,
        content TEXT,
        problems TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        xp INTEGER DEFAULT 0,
        total_score INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        game_type TEXT,
        score INTEGER,
        xp_gained INTEGER,
        grade TEXT,
        topic TEXT,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {
    console.warn("SQLite database could not be initialized. Caching and user progress will be disabled.");
  }
}

export const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API Route for user progress
app.get("/api/user/:username", (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not available" });
  
  const { username } = req.params;
  try {
    let user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (!user) {
      // Create user if not exists
      db.prepare("INSERT INTO users (username) VALUES (?)").run(username);
      user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    }
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/user/progress", (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not available" });
  
  const { username, xp, total_score, level } = req.body;
  try {
    db.prepare(`
      UPDATE users 
      SET xp = ?, total_score = ?, level = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE username = ?
    `).run(xp, total_score, level, username);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Database error" });
  }
});

// API Route for game history
app.post("/api/history", (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not available" });
  
  const { username, game_type, score, xp_gained, grade, topic, content } = req.body;
  try {
    db.prepare(`
      INSERT INTO history (username, game_type, score, xp_gained, grade, topic, content)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(username, game_type, score, xp_gained, grade, topic, content);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/history/:username", (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not available" });
  
  const { username } = req.params;
  try {
    const history = db.prepare("SELECT * FROM history WHERE username = ? ORDER BY created_at DESC LIMIT 20").all();
    res.json(history);
  } catch (e) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/leaderboard", (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not available" });
  
  try {
    const topUsers = db.prepare("SELECT username, xp, level, total_score FROM users ORDER BY xp DESC LIMIT 10").all();
    res.json(topUsers);
  } catch (e) {
    res.status(500).json({ error: "Database error" });
  }
});

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
  const { createServer: createViteServer } = await import("vite");
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
