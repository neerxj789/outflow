import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/search", async (req, res) => {
    try {
      const { keywords } = req.body;
      if (!keywords) {
        return res.status(400).json({ error: "Keywords are required" });
      }

      const prompt = `Search the internet for business details using the following keywords: "${keywords}".
Extract legitimate business information only.
Return a list of businesses with their name, phone number, website, and email.
If any piece of information is not found, leave it empty or null.
Make sure to search the web and only return real data.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "A list of business details found on the web.",
            items: {
              type: Type.OBJECT,
              properties: {
                name: {
                  type: Type.STRING,
                  description: "Name of the business",
                },
                number: {
                  type: Type.STRING,
                  description: "Phone number of the business",
                },
                website: {
                  type: Type.STRING,
                  description: "Website URL of the business",
                },
                email: {
                  type: Type.STRING,
                  description: "Email address of the business",
                },
              },
              required: ["name"],
            },
          },
        },
      });

      const jsonStr = response.text?.trim() || "[]";
      let businesses = [];
      try {
        businesses = JSON.parse(jsonStr);
      } catch (err) {
        console.error("Failed to parse JSON response:", jsonStr);
        return res.status(500).json({ error: "Failed to parse search results." });
      }

      res.json({ businesses });
    } catch (error: any) {
      console.error("Search API Error:", error);
      if (error?.status === 429 || error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED') {
        return res.status(429).json({ error: "Gemini API quota exceeded. Please check your API key billing details or try again later." });
      }
      res.status(500).json({ error: error?.message || "Failed to search for businesses." });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
