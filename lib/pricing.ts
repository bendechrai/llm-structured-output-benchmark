export const modelPricing: Record<string, { input: number; output: number }> = {
  'openai-gpt5': { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
  'openai-gpt4o': { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
  'anthropic-sonnet': { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
  'anthropic-opus': { input: 15.00 / 1_000_000, output: 75.00 / 1_000_000 },
  'google-flash': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  'google-pro': { input: 1.25 / 1_000_000, output: 10.00 / 1_000_000 },
  'groq-gpt-oss-120b': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  'groq-kimi-k2': { input: 1.00 / 1_000_000, output: 3.00 / 1_000_000 },
  'groq-llama-3.3-70b': { input: 0.59 / 1_000_000, output: 0.79 / 1_000_000 },
  'openrouter-qwen3-235b': { input: 0.20 / 1_000_000, output: 0.60 / 1_000_000 },
};

export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = modelPricing[modelId];
  if (!pricing) return 0;
  return pricing.input * inputTokens + pricing.output * outputTokens;
}
