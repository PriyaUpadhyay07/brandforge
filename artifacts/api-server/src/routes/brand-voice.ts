import { Router, type IRouter } from "express";
import {
  GenerateBrandVoiceBody,
  GenerateBrandVoiceResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const fallbackVoice = (brandName: string, industry: string) => ({
  tagline: `${brandName}, made to matter.`,
  toneGuidelines: [
    "Be clear, human, and specific before being clever.",
    "Lead with the useful idea and let the personality follow.",
    `Sound like a confident guide in ${industry}, never a distant expert.`,
  ],
  brandDescription: `${brandName} helps people move through ${industry} with a point of view that feels clear, useful, and memorable.`,
});

router.post("/brand-voice", async (req, res): Promise<void> => {
  const parsed = GenerateBrandVoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { brandName, industry, personality } = parsed.data;
  const fallback = fallbackVoice(brandName, industry);
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    res.status(503).json({ error: "AI brand voice is not configured", fallback });
    return;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 8192,
        system:
          "You are a concise brand strategist. Return only valid JSON with exactly the keys tagline (string), toneGuidelines (array of exactly 3 short strings), and brandDescription (1-2 sentences). No markdown.",
        messages: [
          {
            role: "user",
            content: `Create a brand voice for ${brandName}, an ${industry} brand. Personality: ${personality}.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      res.status(503).json({ error: "AI provider unavailable", fallback });
      return;
    }

    const payload = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = payload.content?.find((item) => item.type === "text")?.text;
    if (!text) {
      res.status(503).json({ error: "AI returned no content", fallback });
      return;
    }

    const clean = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    const result = GenerateBrandVoiceResponse.safeParse(JSON.parse(clean));
    if (!result.success) {
      res.status(503).json({ error: "AI returned an invalid voice guide", fallback });
      return;
    }

    res.json(result.data);
  } catch (error) {
    req.log.warn({ err: error }, "Brand voice generation failed");
    res.status(503).json({ error: "AI brand voice failed", fallback });
  }
});

export default router;