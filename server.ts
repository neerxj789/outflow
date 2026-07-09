import express from "express";
import path from "path";
import cors from "cors";
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

  app.use(cors());
  app.use(express.json());

  app.post("/api/search", async (req, res) => {
    try {
      const { keywords, apiKey } = req.body;
      if (!keywords) {
        return res.status(400).json({ error: "Keywords are required" });
      }

      let client = ai;
      if (apiKey) {
        client = new GoogleGenAI({ apiKey });
      }

      const prompt = `Search the internet for business details using the following keywords: "${keywords}".
Extract legitimate business information only.
Return a list of businesses with their name, phone number, website, and email.
If any piece of information is not found, leave it empty or null.
Make sure to search the web and only return real data.`;

      const response = await client.models.generateContent({
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

  
  app.post("/api/analyze", async (req, res) => {
    try {
      const { websiteUrl, topic, businessName, apiKey } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      let client = ai;
      if (apiKey) {
        client = new GoogleGenAI({ apiKey });
      }

      let crawledText = "";
      
      if (websiteUrl) {
        try {
          const response = await fetch(websiteUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
          });
          const html = await response.text();
          const cheerio = await import('cheerio');
          const $ = cheerio.load(html);
          
          // Remove scripts, styles, etc.
          $('script, style, noscript, iframe, img, svg, video').remove();
          
          // Get text and clean it up
          crawledText = $('body').text().replace(/\s+/g, ' ').trim();
          
          // Limit length to avoid huge prompts
          if (crawledText.length > 20000) {
            crawledText = crawledText.substring(0, 20000);
          }
        } catch (fetchErr) {
          console.error("Failed to scrape website:", fetchErr);
        }
      }

      if (!crawledText) {
        crawledText = `Could not extract website content directly. Please analyze based on the business name: ${businessName} and the fact that their website might be down, missing, or inaccessible.`;
      }

      const systemInstruction = `You are a data extraction tool. Analyze text to identify business weaknesses based on the user's topic. 
Rules:
1. Output 2 to 4 concise bullet points.
2. Base findings strictly on text. Do not hallucinate.
3. If insufficient data, output: 'Insufficient data for analysis.'
Output exactly as a JSON object with a 'pain_points' array of strings.`;

      const prompt = `Topic: ${topic} \n\n Input Text: \n ${crawledText}`;

      const aiResponse = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              pain_points: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["pain_points"]
          }
        },
      });

      const jsonStr = aiResponse.text?.trim() || "{}";
      let result = { pain_points: [] };
      try {
        result = JSON.parse(jsonStr);
      } catch (err) {
        console.error("Failed to parse JSON response:", jsonStr);
        return res.status(500).json({ error: "Failed to parse AI response." });
      }

      res.json(result);
    } catch (error) {
      console.error("Analyze API Error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze business." });
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
