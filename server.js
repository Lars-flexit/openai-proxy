import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json()); // ✅ this enables JSON body parsing

app.get("/ping", (req, res) => {
  res.json({ ok: true, message: "OpenAI proxy is online" });
});

app.post("/rag_search_reasoner", async (req, res) => {
  try {
    const query = req.body.query;
    if (!query) {
      return res.status(400).json({ ok: false, error: "Missing query text" });
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
      }),
    });

    const data = await openaiResponse.json();
    res.json({ ok: true, query, embedding: data });
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ OpenAI proxy running on port ${PORT}`));
