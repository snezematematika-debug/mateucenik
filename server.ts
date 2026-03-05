import express from "express";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any = null;

// Initialize database only if not on Vercel
if (!process.env.VERCEL) {
  try {
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
    console.warn("SQLite database could not be initialized.");
  }
}

export const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API Router
const apiRouter = express.Router();

apiRouter.get("/health", (req, res) => {
  res.json({ status: "ok", vercel: !!process.env.VERCEL });
});

apiRouter.get("/user/:username", (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not available" });
  const { username } = req.params;
  try {
    let user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (!user) {
      db.prepare("INSERT INTO users (username) VALUES (?)").run(username);
      user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    }
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.post("/user/progress", (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not available" });
  const { username, xp, total_score, level } = req.body;
  try {
    db.prepare("UPDATE users SET xp = ?, total_score = ?, level = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?")
      .run(xp, total_score, level, username);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.post("/history", (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not available" });
  const { username, game_type, score, xp_gained, grade, topic, content } = req.body;
  try {
    db.prepare("INSERT INTO history (username, game_type, score, xp_gained, grade, topic, content) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(username, game_type, score, xp_gained, grade, topic, content);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.get("/history/:username", (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not available" });
  const { username } = req.params;
  try {
    const history = db.prepare("SELECT * FROM history WHERE username = ? ORDER BY created_at DESC LIMIT 20").all();
    res.json(history);
  } catch (e) {
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.get("/leaderboard", (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not available" });
  try {
    const topUsers = db.prepare("SELECT username, xp, level, total_score FROM users ORDER BY xp DESC LIMIT 10").all();
    res.json(topUsers);
  } catch (e) {
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.post("/problems", async (req, res) => {
  const { grade, topic, content, count, customApiKey } = req.body;
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(400).json({ error: "API Key is missing" });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Генерирај ${count || 10} математички задачи за ${grade} одделение, на тема "${topic}" и содржина "${content}". Врати ги во JSON формат.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              answer: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              explanation: { type: Type.STRING }
            },
            required: ["question", "answer", "options"]
          }
        }
      }
    });
    res.json(JSON.parse(response.text || "[]"));
  } catch (error) {
    res.status(500).json({ error: "Failed to generate problems" });
  }
});

// Mount API routes
app.use("/api", apiRouter);

// Serve static files in production
if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
