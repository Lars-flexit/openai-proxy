import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

app.post("/rag_search_reasoner", async (req, res) => {
  try {
    const query = req.body.query || "";
    if (!query) {
      return res.status(400).json({ ok: false, error: "Missing query text" });
    }

    // 1. Generate embedding
    const embedResp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query
      })
    });

    const embedData = await embedResp.json();
    const embedding = embedData.data?.[0]?.embedding;
    if (!embedding) {
      return res.status(500).json({ ok: false, error: "No embedding returned" });
    }

    // 2. Fetch your stored documents
    const pubmedResp = await fetch("https://x2wq-lcoa-medm.f2.xano.io/api:YOURSOURCEID/pubmed_content");
    const pubmedData = await pubmedResp.json();

    // 3. Compute cosine similarity
    function cosineSim(a, b) {
      const dot = a.reduce((s, v, i) => s + v * b[i], 0);
      const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
      const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
      return dot / (magA * magB);
    }

    const scored = pubmedData.map(r => ({
      id: r.id,
      source_id: r.source_id,
      content: r.content,
      similarity: cosineSim(embedding, r.embedding)
    }));

    const sorted = scored.sort((a, b) => b.similarity - a.similarity).slice(0, 3);

    res.json({
      ok: true,
      query,
      matches: sorted,
      count: sorted.length
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/ping", (req, res) => res.json({ ok: true, message: "Proxy alive" }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Proxy running on port ${port}`));