import "server-only";

import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema as GeminiSchema,
} from "@google/generative-ai";

// =====================================================
// Generic AI provider interface.
// Adapters: Gemini today, Claude / OpenAI tomorrow.
// All AI calls in the app go through this — swapping
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
        "GEMINI_API_KEY is not configured — AI features disabled.",
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
      throw new Error("AI response was not valid JSON");
    }

    return {
      data: parsed,
      inputTokens: result.response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens:
        result.response.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
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
