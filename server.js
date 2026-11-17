import express from "express";
import multer from "multer";
import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

app.use(express.json({ limit: "30mb" }));
app.use(express.static(path.join(__dirname, "public")));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  }
});
const upload = multer({
  storage,
  limits: { files: 8, fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Envie somente arquivos de imagem."));
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "Configure OPENAI_API_KEY no arquivo .env para ativar a IA." });
    }
    const { messages = [] } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Envie uma mensagem." });
    }
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const safeMessages = messages.slice(-12).map(m => {
      const role = m.role === "assistant" ? "assistant" : "user";
      const text = String(m.content || "").slice(0, 12000);
      if (role === "user" && Array.isArray(m.images) && m.images.length) {
        const content = [{ type: "input_text", text: text || "Analise as imagens e me ajude com elas." }];
        for (const image of m.images.slice(0, 4)) {
          if (typeof image === "string" && /^data:image\\/(png|jpeg|jpg|webp|gif);base64,/.test(image)) {
            content.push({ type: "input_image", image_url: image });
          }
        }
        return { role, content };
      }
      return { role, content: text };
    });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5",
      instructions: "Você é a SANTS IA, uma assistente amigável que fala português do Brasil. Ajude com Roblox Studio, Lua, criação de jogos, scripts e dúvidas gerais. Explique passo a passo para iniciantes. Analise as imagens recebidas quando houver.",
      input: safeMessages
    });
    res.json({ reply: response.output_text || "Não consegui gerar uma resposta agora." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao falar com a IA. Confira sua chave, modelo e conexão." });
  }
});

app.post("/api/upload", upload.array("images", 8), (req, res) => {
  res.json({
    files: (req.files || []).map(f => ({ name: f.originalname, url: `/uploads/${path.basename(f.filename)}` }))
  });
});
app.use("/uploads", express.static(uploadDir));

app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || "Falha no envio." });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`SANTS IA rodando em http://localhost:${port}`));
