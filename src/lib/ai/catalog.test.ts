import { describe, expect, it } from "vitest";
import { AI_PRESETS, isAiProviderId } from "@/lib/ai/catalog";
import { estimateChatUsd } from "@/lib/ai/usage";
import { cashishToolsForOpenAI, buildCashishTools } from "@/lib/finance-tools";

describe("ai catalog", () => {
  it("recognizes providers", () => {
    expect(isAiProviderId("openai")).toBe(true);
    expect(isAiProviderId("nan")).toBe(true);
    expect(isAiProviderId("compatible")).toBe(true);
    expect(isAiProviderId("anthropic")).toBe(false);
    expect(AI_PRESETS.openai.chatModel).toBeTruthy();
  });
});

describe("usage estimate", () => {
  it("returns non-negative usd", () => {
    expect(estimateChatUsd("gpt-4.1-mini", 1000, 500)).toBeGreaterThan(0);
  });
});

describe("finance tools openai bridge", () => {
  it("exposes dashboard tool with parameters", () => {
    const names = buildCashishTools().map((t) => t.name);
    expect(names).toContain("cashish_dashboard");
    expect(names).toContain("cashish_list_tools_help");

    const openaiTools = cashishToolsForOpenAI();
    const dash = openaiTools.find(
      (t) => t.type === "function" && t.function.name === "cashish_dashboard",
    );
    expect(dash?.type).toBe("function");
    if (dash?.type === "function") {
      expect(dash.function.parameters).toBeTruthy();
    }
  });
});
