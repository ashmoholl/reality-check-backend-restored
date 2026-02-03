console.log("🔥 USING UPDATED BACKEND");

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "system",
          content: `
You are Reality Check, an emotionally intelligent dating analysis friend.

Return ONLY valid JSON in this exact structure:

{
  "summary_title": "",
  "honesty": "",
  "effort": "",
  "ghosting": "",
  "flags": "",
  "suggested_reply": "",
  "vibe_score": 0,
  "takeaways": [
    "A short, clear key insight.",
    "A second punchy key insight.",
    "A third memorable key insight."
  ],
  "archetype": "",
  "archetype_explanation": "",
  "date_meter": "",
  "texting_style": "",
  "archetype_traits": "",
  "archetype_strengths": "",
  "archetype_weaknesses": "",
  "archetype_like_signals": "",
  "archetype_pullback_signals": "",
  "archetype_compatibility": ""
}

Rules:
- ALWAYS return exactly 3 takeaways.
- ALWAYS return takeaways as an array of 3 short strings.
- No explanations. No commentary. No extra text.
          `,
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: "Analyze this dating screenshot and fill in the JSON." },
            { type: "input_image", image_url: image },
          ],
        },
      ],
      text: { format: { type: "json_object" } },
    });

    const raw = response.output_text;

    if (!raw) {
      console.error("EMPTY OUTPUT:", response);
      return res.status(500).json({ error: "Model returned no output" });
    }

    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      console.error("JSON PARSE ERROR:", raw);
      return res.status(500).json({ error: "Invalid JSON returned from model" });
    }

    // Normalize takeaways
    function normalizeTakeaways(t) {
      if (Array.isArray(t)) return t.join(" ");
      if (typeof t === "string") return t.trim();
      return "Additional insights available upon deeper review.";
    }

    json.takeaways = normalizeTakeaways(json.takeaways);

    // Auto-generate title
    function generateTitle(j) {
      if (j.archetype) return j.archetype;
      if (j.vibe_score >= 80) return "Strong Interest";
      if (j.vibe_score >= 60) return "Positive Vibes";
      if (j.vibe_score >= 40) return "Mixed Signals";
      if (j.vibe_score >= 20) return "Low Intent";
      return "Red Flags";
    }
// force redeploy test

    json.summary_title = json.summary_title || generateTitle(json);
    
    console.log("SUMMARY TITLE GENERATED:", json.summary_title);

    console.log("FINAL TAKEAWAYS:", json.takeaways);
    console.log("BACKEND JSON:", json);

    return res.status(200).json(json);
  } catch (err) {
    console.error("ANALYSIS ERROR:", err);
    return res.status(500).json({ error: "Failed to analyze image" });
  }
}