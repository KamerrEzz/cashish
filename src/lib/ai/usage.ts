/** Rough USD estimate for BYOK transparency (OpenAI-ish rates). */
export function estimateChatUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const m = model.toLowerCase();
  // per 1M tokens
  let inRate = 0.15;
  let outRate = 0.6;
  if (m.includes("gpt-4.1") && !m.includes("mini")) {
    inRate = 2;
    outRate = 8;
  } else if (m.includes("gpt-4o") && !m.includes("mini")) {
    inRate = 2.5;
    outRate = 10;
  } else if (m.includes("qwen")) {
    inRate = 0.1;
    outRate = 0.3;
  }
  return (promptTokens * inRate + completionTokens * outRate) / 1_000_000;
}
