import {
  createTestRun,
  calculateScenarioSummary,
  updateRunSummary,
  saveTestRun,
  loadTestRun,
  loadIndex,
  deleteTestRun,
  listRecentRuns,
  type TestRunConfig,
  type RunResult,
  type AttemptResult,
  type TestRunFile,
} from '../lib/storage';
import * as fs from 'fs';

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

describe('Storage Utils', () => {
  describe('createTestRun', () => {
    const mockConfig: TestRunConfig = {
      models: ['openai-gpt4o', 'anthropic-sonnet'],
      scenarios: [1, 2],
      runsPerScenario: 5,
      temperature: 0.1,
      maxRetries: 3,
    };

    it('should create a new test run with valid structure', () => {
      const testRun = createTestRun(mockConfig);

      expect(testRun).toHaveProperty('id');
      expect(testRun).toHaveProperty('timestamp');
      expect(testRun).toHaveProperty('duration');
      expect(testRun).toHaveProperty('config');
      expect(testRun).toHaveProperty('summary');
      expect(testRun).toHaveProperty('results');

      expect(typeof testRun.id).toBe('string');
      expect(testRun.id).toBe('test-uuid-1234');
      expect(new Date(testRun.timestamp)).toBeInstanceOf(Date);
      expect(testRun.duration).toBe(0);
      expect(testRun.config).toEqual(mockConfig);
      expect(testRun.results).toEqual({});
    });

    it('should create initial empty summary', () => {
      const testRun = createTestRun(mockConfig);

      expect(testRun.summary).toEqual({
        totalTests: 0,
        passed: 0,
        failed: 0,
        successRate: 0,
      });
    });
  });

  describe('calculateScenarioSummary', () => {
    const createMockAttempt = (success: boolean, inputTokens = 100, outputTokens = 50): AttemptResult => ({
      attemptNumber: 1,
      timestamp: new Date().toISOString(),
      success,
      durationMs: 1000,
      inputTokens,
      outputTokens,
      prompt: 'mock prompt',
      rawResponse: 'mock response',
      parsedResponse: success ? { test: 'data' } : null,
      validationErrors: [],
      errorMessage: null,
    });

    const createMockRun = (attempts: AttemptResult[]): RunResult => ({
      runNumber: 1,
      success: attempts.some(a => a.success),
      attempts,
      totalDurationMs: 5000,
      finalResponse: attempts.some(a => a.success) ? { test: 'data' } : null,
    });

    it('should handle empty runs', () => {
      const summary = calculateScenarioSummary([]);

      expect(summary).toEqual({
        successRate: 0,
        firstAttemptSuccessRate: 0,
        afterRetry1SuccessRate: 0,
        afterRetry2SuccessRate: 0,
        afterRetry3SuccessRate: 0,
        averageDurationMs: 0,
        averageAttempts: 0,
        averageAttemptsPerSuccess: 0,
        averageTokensPerSuccess: 0,
        totalTokensUsed: 0,
      });
    });

    it('should calculate correct success rates', () => {
      const runs = [
        // First run: success on first attempt
        createMockRun([createMockAttempt(true)]),
        // Second run: success on second attempt
        createMockRun([createMockAttempt(false), createMockAttempt(true)]),
        // Third run: failure on all attempts
        createMockRun([createMockAttempt(false), createMockAttempt(false)]),
        // Fourth run: success on third attempt
        createMockRun([createMockAttempt(false), createMockAttempt(false), createMockAttempt(true)]),
      ];

      const summary = calculateScenarioSummary(runs);

      expect(summary.successRate).toBe(75); // 3/4 successful
      expect(summary.firstAttemptSuccessRate).toBe(25); // 1/4 on first attempt
      expect(summary.afterRetry1SuccessRate).toBe(50); // 2/4 after 1 retry
      expect(summary.afterRetry2SuccessRate).toBe(75); // 3/4 after 2 retries
      expect(summary.afterRetry3SuccessRate).toBe(75); // 3/4 after 3 retries
    });

    it('should calculate token usage correctly', () => {
      const runs = [
        createMockRun([createMockAttempt(true, 100, 50)]),
        createMockRun([createMockAttempt(false, 80, 40), createMockAttempt(true, 120, 60)]),
      ];

      const summary = calculateScenarioSummary(runs);

      // Total tokens: (100+50) + (80+40) + (120+60) = 450
      expect(summary.totalTokensUsed).toBe(450);
    });

    it('should calculate average duration and attempts', () => {
      const runs = [
        createMockRun([createMockAttempt(true)]), // 1 attempt, 5000ms
        createMockRun([createMockAttempt(false), createMockAttempt(true)]), // 2 attempts, 5000ms
      ];

      const summary = calculateScenarioSummary(runs);

      expect(summary.averageDurationMs).toBe(5000);
      expect(summary.averageAttempts).toBe(1.5); // (1+2)/2
    });

    it('should calculate averageAttemptsPerSuccess for successful runs', () => {
      const runs = [
        createMockRun([createMockAttempt(true)]), // 1 attempt, success
        createMockRun([createMockAttempt(false), createMockAttempt(true)]), // 2 attempts, success
        createMockRun([createMockAttempt(false), createMockAttempt(false)]), // 2 attempts, failure
      ];

      const summary = calculateScenarioSummary(runs);

      expect(summary.averageAttemptsPerSuccess).toBe(1.5); // (1+2)/2 successful runs
    });

    it('should calculate averageTokensPerSuccess for successful runs', () => {
      const runs = [
        createMockRun([createMockAttempt(true, 100, 50)]), // 150 tokens, success
        createMockRun([createMockAttempt(false, 50, 25), createMockAttempt(true, 100, 50)]), // 225 tokens, success
        createMockRun([createMockAttempt(false, 200, 100)]), // 300 tokens, failure (not counted)
      ];

      const summary = calculateScenarioSummary(runs);

      expect(summary.averageTokensPerSuccess).toBe(187.5); // (150+225)/2
    });

    it('should handle fourth attempt success', () => {
      const runs = [
        createMockRun([
          createMockAttempt(false),
          createMockAttempt(false),
          createMockAttempt(false),
          createMockAttempt(true),
        ]),
      ];

      const summary = calculateScenarioSummary(runs);

      expect(summary.successRate).toBe(100);
      expect(summary.firstAttemptSuccessRate).toBe(0);
      expect(summary.afterRetry1SuccessRate).toBe(0);
      expect(summary.afterRetry2SuccessRate).toBe(0);
      expect(summary.afterRetry3SuccessRate).toBe(100);
    });

    describe('sequential runs with steps', () => {
      const createMockStep = (stepNumber: number, attempts: AttemptResult[]): {
        stepNumber: number;
        stepName: string;
        success: boolean;
        attempts: AttemptResult[];
      } => ({
        stepNumber,
        stepName: `Step ${stepNumber}`,
        success: attempts.some(a => a.success),
        attempts,
      });

      const createSequentialRun = (steps: Array<{ stepNumber: number; stepName: string; success: boolean; attempts: AttemptResult[] }>): RunResult => ({
        runNumber: 1,
        success: steps.every(s => s.success),
        attempts: [],
        steps,
        totalDurationMs: 5000,
        finalResponse: steps.every(s => s.success) ? { test: 'data' } : null,
      });

      it('should calculate success rates for sequential runs - all first attempt', () => {
        const runs = [
          createSequentialRun([
            createMockStep(1, [createMockAttempt(true)]),
            createMockStep(2, [createMockAttempt(true)]),
            createMockStep(3, [createMockAttempt(true)]),
          ]),
        ];

        const summary = calculateScenarioSummary(runs, true);

        expect(summary.successRate).toBe(100);
        expect(summary.firstAttemptSuccessRate).toBe(100);
        expect(summary.afterRetry1SuccessRate).toBe(100);
      });

      it('should calculate success rates for sequential runs - with retries', () => {
        const runs = [
          createSequentialRun([
            createMockStep(1, [createMockAttempt(false), createMockAttempt(true)]),
            createMockStep(2, [createMockAttempt(true)]),
            createMockStep(3, [createMockAttempt(true)]),
          ]),
        ];

        const summary = calculateScenarioSummary(runs, true);

        expect(summary.successRate).toBe(100);
        expect(summary.firstAttemptSuccessRate).toBe(0); // not all first attempts
        expect(summary.afterRetry1SuccessRate).toBe(100); // 1 retry total
      });

      it('should calculate success rates for sequential runs - multiple retries', () => {
        const runs = [
          createSequentialRun([
            createMockStep(1, [createMockAttempt(false), createMockAttempt(false), createMockAttempt(true)]),
            createMockStep(2, [createMockAttempt(false), createMockAttempt(true)]),
            createMockStep(3, [createMockAttempt(true)]),
          ]),
        ];

        const summary = calculateScenarioSummary(runs, true);

        expect(summary.successRate).toBe(100);
        expect(summary.firstAttemptSuccessRate).toBe(0);
        expect(summary.afterRetry1SuccessRate).toBe(0); // max retries per step = 2 > 1
        expect(summary.afterRetry2SuccessRate).toBe(100); // max retries per step = 2 <= 2
      });

      it('should calculate token usage for sequential runs', () => {
        const runs = [
          createSequentialRun([
            createMockStep(1, [createMockAttempt(true, 100, 50)]),
            createMockStep(2, [createMockAttempt(true, 100, 50)]),
            createMockStep(3, [createMockAttempt(true, 100, 50)]),
          ]),
        ];

        const summary = calculateScenarioSummary(runs, true);

        expect(summary.totalTokensUsed).toBe(450); // 3 steps * 150 tokens each
      });

      it('should calculate attempts for sequential runs', () => {
        const runs = [
          createSequentialRun([
            createMockStep(1, [createMockAttempt(false), createMockAttempt(true)]),
            createMockStep(2, [createMockAttempt(true)]),
            createMockStep(3, [createMockAttempt(false), createMockAttempt(false), createMockAttempt(true)]),
          ]),
        ];

        const summary = calculateScenarioSummary(runs, true);

        expect(summary.averageAttempts).toBe(6); // 2 + 1 + 3 = 6 attempts
        expect(summary.averageAttemptsPerSuccess).toBe(6); // same for successful run
      });

      it('should handle failed sequential runs', () => {
        const runs = [
          createSequentialRun([
            createMockStep(1, [createMockAttempt(true)]),
            createMockStep(2, [createMockAttempt(false), createMockAttempt(false)]),
            createMockStep(3, [createMockAttempt(false)]),
          ]),
        ];

        const summary = calculateScenarioSummary(runs, true);

        expect(summary.successRate).toBe(0);
        expect(summary.firstAttemptSuccessRate).toBe(0);
        expect(summary.averageAttemptsPerSuccess).toBe(0); // no successful runs
        expect(summary.averageTokensPerSuccess).toBe(0);
      });
    });
  });

  describe('updateRunSummary', () => {
    it('should calculate correct summary from results', () => {
      const testRun = createTestRun({
        models: ['model1'],
        scenarios: [1],
        runsPerScenario: 2,
        temperature: 0.1,
        maxRetries: 3,
      });

      // Add mock results
      testRun.results = {
        model1: {
          '1': {
            runs: [
              createMockRun([createMockAttempt(true)]),
              createMockRun([createMockAttempt(false)]),
            ],
            summary: calculateScenarioSummary([
              createMockRun([createMockAttempt(true)]),
              createMockRun([createMockAttempt(false)]),
            ]),
          },
        },
      };

      updateRunSummary(testRun);

      expect(testRun.summary).toEqual({
        totalTests: 2,
        passed: 1,
        failed: 1,
        successRate: 50,
      });
    });

    it('should handle empty results', () => {
      const testRun = createTestRun({
        models: [],
        scenarios: [],
        runsPerScenario: 0,
        temperature: 0.1,
        maxRetries: 3,
      });

      updateRunSummary(testRun);

      expect(testRun.summary).toEqual({
        totalTests: 0,
        passed: 0,
        failed: 0,
        successRate: 0,
      });
    });
  });

  // Helper function for tests
  const createMockAttempt = (success: boolean, inputTokens = 100, outputTokens = 50): AttemptResult => ({
    attemptNumber: 1,
    timestamp: new Date().toISOString(),
    success,
    durationMs: 1000,
    inputTokens,
    outputTokens,
    prompt: 'mock prompt',
    rawResponse: 'mock response',
    parsedResponse: success ? { test: 'data' } : null,
    validationErrors: [],
    errorMessage: null,
  });

  const createMockRun = (attempts: AttemptResult[]): RunResult => ({
    runNumber: 1,
    success: attempts.some(a => a.success),
    attempts,
    totalDurationMs: 5000,
    finalResponse: attempts.some(a => a.success) ? { test: 'data' } : null,
  });
});

describe('Storage File I/O', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadIndex', () => {
    it('should return empty runs array when index file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const index = loadIndex();

      expect(index).toEqual({ runs: [] });
    });

    it('should return parsed index when file exists', () => {
      mockFs.existsSync.mockReturnValue(true);
      const mockIndex = {
        runs: [
          { id: 'test-1', timestamp: '2024-01-01', filename: 'test.json', summary: { models: [], totalTests: 10, successRate: 90 } }
        ]
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockIndex));

      const index = loadIndex();

      expect(index).toEqual(mockIndex);
    });

    it('should return empty runs array on parse error', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');

      const index = loadIndex();

      expect(index).toEqual({ runs: [] });
    });
  });

  describe('saveTestRun', () => {
    it('should create directories if they do not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ runs: [] }));

      const testRun = createTestRun({
        models: ['model1'],
        scenarios: [1],
        runsPerScenario: 5,
        temperature: 0.1,
        maxRetries: 3,
      });

      saveTestRun(testRun);

      expect(mockFs.mkdirSync).toHaveBeenCalled();
    });

    it('should write test run to file', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ runs: [] }));

      const testRun = createTestRun({
        models: ['model1'],
        scenarios: [1],
        runsPerScenario: 5,
        temperature: 0.1,
        maxRetries: 3,
      });

      saveTestRun(testRun);

      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    it('should update index with new entry', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ runs: [] }));

      const testRun = createTestRun({
        models: ['model1'],
        scenarios: [1],
        runsPerScenario: 5,
        temperature: 0.1,
        maxRetries: 3,
      });

      saveTestRun(testRun);

      const indexWriteCall = mockFs.writeFileSync.mock.calls.find(
        call => typeof call[0] === 'string' && call[0].includes('index.json')
      );
      expect(indexWriteCall).toBeDefined();

      const writtenIndex = JSON.parse(indexWriteCall![1] as string);
      expect(writtenIndex.runs).toHaveLength(1);
      expect(writtenIndex.runs[0].id).toBe('test-uuid-1234');
    });
  });

  describe('loadTestRun', () => {
    it('should return null when run not found in index', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ runs: [] }));

      const result = loadTestRun('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return null when file does not exist', () => {
      mockFs.existsSync
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        runs: [{ id: 'test-1', filename: 'test.json' }]
      }));

      const result = loadTestRun('test-1');

      expect(result).toBeNull();
    });

    it('should return parsed test run when found', () => {
      const mockTestRun: TestRunFile = {
        id: 'test-1',
        timestamp: '2024-01-01',
        duration: 1000,
        config: { models: [], scenarios: [], runsPerScenario: 5, temperature: 0.1, maxRetries: 3 },
        summary: { totalTests: 10, passed: 8, failed: 2, successRate: 80 },
        results: {},
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify({ runs: [{ id: 'test-1', filename: 'test.json' }] }))
        .mockReturnValueOnce(JSON.stringify(mockTestRun));

      const result = loadTestRun('test-1');

      expect(result).toEqual(mockTestRun);
    });
  });

  describe('deleteTestRun', () => {
    it('should return false when run not found', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ runs: [] }));

      const result = deleteTestRun('non-existent');

      expect(result).toBe(false);
    });

    it('should delete file and update index', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        runs: [{ id: 'test-1', filename: 'test.json' }]
      }));

      const result = deleteTestRun('test-1');

      expect(result).toBe(true);
      expect(mockFs.unlinkSync).toHaveBeenCalled();

      const indexWriteCall = mockFs.writeFileSync.mock.calls.find(
        call => typeof call[0] === 'string' && call[0].includes('index.json')
      );
      const writtenIndex = JSON.parse(indexWriteCall![1] as string);
      expect(writtenIndex.runs).toHaveLength(0);
    });
  });

  describe('listRecentRuns', () => {
    it('should return limited number of runs', () => {
      const mockRuns = Array.from({ length: 20 }, (_, i) => ({
        id: `test-${i}`,
        timestamp: '2024-01-01',
        filename: `test-${i}.json`,
        summary: { models: [], totalTests: 10, successRate: 90 }
      }));

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ runs: mockRuns }));

      const result = listRecentRuns(5);

      expect(result).toHaveLength(5);
    });

    it('should return all runs when limit exceeds count', () => {
      const mockRuns = [
        { id: 'test-1', timestamp: '2024-01-01', filename: 'test.json', summary: { models: [], totalTests: 10, successRate: 90 } }
      ];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ runs: mockRuns }));

      const result = listRecentRuns(10);

      expect(result).toHaveLength(1);
    });
  });
});