export type AiProviderId = "openai" | "nan" | "compatible";

export type AiPreset = {
  id: AiProviderId;
  label: string;
  baseUrl: string;
  chatModel: string;
  hint: string;
};

export const AI_PRESETS: Record<AiProviderId, AiPreset> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    chatModel: "gpt-4.1-mini",
    hint: "api.openai.com",
  },
  nan: {
    id: "nan",
    label: "NaN",
    baseUrl: "https://api.nan.builders/v1",
    chatModel: "qwen3.6",
    hint: "Cluster EU, compatible con OpenAI.",
  },
  compatible: {
    id: "compatible",
    label: "Compatible (URL propia)",
    baseUrl: "",
    chatModel: "",
    hint: "Cualquier endpoint /v1 con el contrato de OpenAI (Ollama, vLLM, Helmcode, etc.).",
  },
};

export const AI_PROVIDER_IDS = Object.keys(AI_PRESETS) as AiProviderId[];

export function isAiProviderId(value: string): value is AiProviderId {
  return value in AI_PRESETS;
}
