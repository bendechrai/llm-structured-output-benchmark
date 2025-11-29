import { calculateCost, modelPricing } from '../components/CostTimeScatterChart';

describe('Pricing Utils', () => {
  describe('modelPricing', () => {
    it('should have pricing for all expected models', () => {
      const expectedModels = [
        'openai-gpt5',
        'openai-gpt4o',
        'anthropic-sonnet',
        'anthropic-opus',
        'google-flash',
        'google-pro',
        'groq-gpt-oss-120b',
        'groq-kimi-k2',
        'groq-llama-3.3-70b',
        'openrouter-qwen3-235b',
      ];

      expectedModels.forEach(modelId => {
        expect(modelPricing[modelId]).toBeDefined();
        expect(modelPricing[modelId]).toHaveProperty('input');
        expect(modelPricing[modelId]).toHaveProperty('output');
      });
    });

    it('should have positive pricing values', () => {
      Object.values(modelPricing).forEach((pricing) => {
        expect(pricing.input).toBeGreaterThan(0);
        expect(pricing.output).toBeGreaterThan(0);
      });
    });

    it('should have output pricing >= input pricing (standard pattern)', () => {
      Object.values(modelPricing).forEach((pricing) => {
        expect(pricing.output).toBeGreaterThanOrEqual(pricing.input);
      });
    });

    it('should have pricing in per-token format (very small numbers)', () => {
      Object.values(modelPricing).forEach((pricing) => {
        expect(pricing.input).toBeLessThan(0.001);
        expect(pricing.output).toBeLessThan(0.001);
      });
    });
  });

  describe('calculateCost', () => {
    it('should return 0 for unknown model', () => {
      const cost = calculateCost('unknown-model', 1000, 500);
      expect(cost).toBe(0);
    });

    it('should return 0 for zero tokens', () => {
      const cost = calculateCost('openai-gpt4o', 0, 0);
      expect(cost).toBe(0);
    });

    it('should calculate cost correctly for GPT-4o', () => {
      const inputTokens = 1000;
      const outputTokens = 500;
      const pricing = modelPricing['openai-gpt4o'];

      const expectedCost = inputTokens * pricing.input + outputTokens * pricing.output;
      const actualCost = calculateCost('openai-gpt4o', inputTokens, outputTokens);

      expect(actualCost).toBeCloseTo(expectedCost, 10);
    });

    it('should calculate cost correctly for Claude Opus (most expensive)', () => {
      const inputTokens = 1000;
      const outputTokens = 500;
      const pricing = modelPricing['anthropic-opus'];

      const expectedCost = inputTokens * pricing.input + outputTokens * pricing.output;
      const actualCost = calculateCost('anthropic-opus', inputTokens, outputTokens);

      expect(actualCost).toBeCloseTo(expectedCost, 10);
    });

    it('should calculate cost correctly for Gemini Flash (cheapest)', () => {
      const inputTokens = 1000;
      const outputTokens = 500;
      const pricing = modelPricing['google-flash'];

      const expectedCost = inputTokens * pricing.input + outputTokens * pricing.output;
      const actualCost = calculateCost('google-flash', inputTokens, outputTokens);

      expect(actualCost).toBeCloseTo(expectedCost, 10);
    });

    it('should scale linearly with token count', () => {
      const baseCost = calculateCost('openai-gpt4o', 1000, 500);
      const doubleCost = calculateCost('openai-gpt4o', 2000, 1000);

      expect(doubleCost).toBeCloseTo(baseCost * 2, 10);
    });

    it('should handle large token counts', () => {
      const cost = calculateCost('openai-gpt4o', 100000, 50000);
      expect(cost).toBeGreaterThan(0);
      expect(isFinite(cost)).toBe(true);
    });

    it('should have Opus significantly more expensive than Sonnet', () => {
      const sonnetCost = calculateCost('anthropic-sonnet', 1000, 500);
      const opusCost = calculateCost('anthropic-opus', 1000, 500);

      expect(opusCost).toBeGreaterThan(sonnetCost * 3);
    });

    it('should have Flash significantly cheaper than Pro', () => {
      const flashCost = calculateCost('google-flash', 1000, 500);
      const proCost = calculateCost('google-pro', 1000, 500);

      expect(proCost).toBeGreaterThan(flashCost * 5);
    });
  });

  describe('pricing sanity checks', () => {
    const standardTokens = { input: 10000, output: 5000 };

    it('should produce reasonable costs for typical usage', () => {
      Object.keys(modelPricing).forEach(modelId => {
        const cost = calculateCost(modelId, standardTokens.input, standardTokens.output);
        expect(cost).toBeGreaterThan(0.0001);
        expect(cost).toBeLessThan(10);
      });
    });

    it('should rank models by cost as expected', () => {
      const costs = Object.keys(modelPricing).map(modelId => ({
        modelId,
        cost: calculateCost(modelId, standardTokens.input, standardTokens.output),
      }));

      costs.sort((a, b) => a.cost - b.cost);

      expect(costs[0].modelId).toBe('google-flash');
      expect(costs[costs.length - 1].modelId).toBe('anthropic-opus');
    });
  });
});
