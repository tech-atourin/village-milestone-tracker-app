import "server-only";

import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema as GeminiSchema,
} from "@google/generative-ai";

// =====================================================
// Generic AI provider interface.
// Adapters: Gemini today, Claude / OpenAI tomorrow.
// All AI calls in the app go through this - swapping
// providers later means only this file changes.
// =====================================================

export interface AiProvider {
  readonly name: string;
  readonly modelSummary: string;
  readonly modelReview: string;
  isReady(): boolean;
  generateStructured<T>(args: {
    prompt: string;
    systemPrompt?: string;
    schema: GeminiSchema;
    model?: "summary" | "review";
    maxOutputTokens?: number;
  }): Promise<{
    data: T;
    inputTokens: number;
    outputTokens: number;
  }>;
}

class GeminiProvider implements AiProvider {
  readonly name = "gemini";
  readonly modelSummary: string;
  readonly modelReview: string;
  private client: GoogleGenerativeAI | null;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    this.modelSummary =
      process.env.GEMINI_MODEL_SUMMARY ?? "gemini-2.5-flash";
    this.modelReview =
      process.env.GEMINI_MODEL_REVIEW ?? "gemini-2.5-flash-lite";
    this.client = key ? new GoogleGenerativeAI(key) : null;
  }

  isReady() {
    return this.client !== null;
  }

  async generateStructured<T>({
    prompt,
    systemPrompt,
    schema,
    model = "summary",
    maxOutputTokens = 1500,
  }: {
    prompt: string;
    systemPrompt?: string;
    schema: GeminiSchema;
    model?: "summary" | "review";
    maxOutputTokens?: number;
  }) {
    if (!this.client) {
      throw new Error(
        "GEMINI_API_KEY is not configured - AI features disabled.",
      );
    }
    const modelId = model === "summary" ? this.modelSummary : this.modelReview;
    const m = this.client.getGenerativeModel({
      model: modelId,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        maxOutputTokens,
      },
    });

    const result = await m.generateContent(prompt);
    const text = result.response.text();
    let parsed: T;
    try {
      parsed = JSON.parse(text) as T;
    } catch {
      // Gemini sometimes wraps JSON in ```json fences or adds a preface,
      // even with responseMimeType set. Strip fences and extract the first
      // {...} or [...] block before giving up.
      const cleaned = extractJsonBlock(text);
      if (!cleaned) {
        console.error("[ai] response was not valid JSON. Raw text:", text);
        throw new Error("AI response was not valid JSON");
      }
      try {
        parsed = JSON.parse(cleaned) as T;
      } catch {
        console.error("[ai] response was not valid JSON after cleanup:", cleaned);
        throw new Error("AI response was not valid JSON");
      }
    }

    return {
      data: parsed,
      inputTokens: result.response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens:
        result.response.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}

function extractJsonBlock(raw: string): string | null {
  // Strip leading ```json / ``` and trailing ```
  const fence = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  if (fence.startsWith("{") || fence.startsWith("[")) return fence;

  // Last-ditch: find first { ... last matching } or first [ ... last ].
  const firstObj = raw.indexOf("{");
  const lastObj = raw.lastIndexOf("}");
  if (firstObj >= 0 && lastObj > firstObj) {
    return raw.slice(firstObj, lastObj + 1);
  }
  const firstArr = raw.indexOf("[");
  const lastArr = raw.lastIndexOf("]");
  if (firstArr >= 0 && lastArr > firstArr) {
    return raw.slice(firstArr, lastArr + 1);
  }
  return null;
}

let cached: AiProvider | null = null;

export function aiProvider(): AiProvider {
  if (cached) return cached;
  cached = new GeminiProvider();
  return cached;
}

// Re-export the Gemini SchemaType so consumers don't need to depend on the
// SDK directly when building schemas.
export { SchemaType };
export type { GeminiSchema as AiSchema };
