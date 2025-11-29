import type { TestRunFile } from './storage';
import type { LogEntry } from './test-runner';

export type AttemptStatus = 'pending' | 'running' | 'failed' | 'success' | 'skipped';

export interface StepProgress {
  stepNumber: number;
  stepName: string;
  attempts: AttemptStatus[];
}

export interface RunProgress {
  run: number;
  attempts?: AttemptStatus[];
  steps?: StepProgress[];
  final: 'pending' | 'success' | 'failed' | 'skipped';
}

export interface ScenarioProgress {
  modelId: string;
  modelName: string;
  scenario: number;
  isSequential: boolean;
  isSkipped?: boolean;
  runs: RunProgress[];
  completedRuns: number;
  totalRuns: number;
}

export interface DetailedProgress {
  currentModel: string;
  currentModelName: string;
  currentScenario: number;
  currentRun: number;
  currentStep?: number;
  currentStepName?: string;
  currentAttempt: number;
  currentStatus: 'running' | 'success' | 'failed' | 'retrying';
  statusMessage: string;
  scenarios: ScenarioProgress[];
  totalScenarios: number;
  completedScenarios: number;
  maxAttempts: number;
  logEntries: LogEntry[];
}

export interface ActiveRun {
  status: 'running' | 'complete' | 'cancelled' | 'error';
  progress: DetailedProgress;
  run: TestRunFile;
  error?: string;
}

const globalForActiveRuns = globalThis as unknown as {
  activeRuns: Map<string, ActiveRun> | undefined;
};

export const activeRuns = globalForActiveRuns.activeRuns ?? new Map<string, ActiveRun>();

if (process.env.NODE_ENV !== 'production') {
  globalForActiveRuns.activeRuns = activeRuns;
}
