'use client';

import type { RunResult, StepResult, AttemptResult } from '@/lib/storage';

interface RunProgressBarsProps {
  runs: RunResult[];
  maxRetries: number;
  isSequential: boolean;
}

function AttemptCell({
  attempt,
  isFirst,
  isLast,
  title,
}: {
  attempt: AttemptResult | undefined;
  isFirst: boolean;
  isLast: boolean;
  title: string;
}) {
  let color = 'bg-gray-300 dark:bg-gray-600';

  if (attempt) {
    color = attempt.success ? 'bg-green-500' : 'bg-red-500';
  }

  return (
    <div
      className={`h-5 flex-1 ${color} ${isFirst ? 'rounded-l' : ''} ${isLast ? 'rounded-r' : ''}`}
      title={title}
    />
  );
}

function OneShotRunRow({
  runResult,
  runIdx,
  maxAttempts,
}: {
  runResult: RunResult;
  runIdx: number;
  maxAttempts: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-12 shrink-0">Run {runIdx + 1}</span>
      <div className="flex-1 flex gap-px">
        {Array.from({ length: maxAttempts }, (_, attemptIdx) => {
          const attempt = runResult.attempts[attemptIdx];
          const status = attempt
            ? attempt.success
              ? 'Success'
              : 'Failed'
            : 'Skipped';

          return (
            <AttemptCell
              key={attemptIdx}
              attempt={attempt}
              isFirst={attemptIdx === 0}
              isLast={attemptIdx === maxAttempts - 1}
              title={`Run ${runIdx + 1}, Attempt ${attemptIdx + 1}: ${status}`}
            />
          );
        })}
      </div>
      <span
        className={`text-xs w-12 text-right ${runResult.success ? 'text-green-600' : 'text-red-600'}`}
      >
        {runResult.success ? 'Pass' : 'Fail'}
      </span>
    </div>
  );
}

function StepAttempts({
  step,
  stepIdx,
  maxAttempts,
  runIdx,
}: {
  step: StepResult;
  stepIdx: number;
  maxAttempts: number;
  runIdx: number;
}) {
  return (
    <div className="flex-1">
      <div className="flex gap-px">
        {Array.from({ length: maxAttempts }, (_, attemptIdx) => {
          const attempt = step.attempts[attemptIdx];
          const status = attempt
            ? attempt.success
              ? 'Success'
              : 'Failed'
            : 'Skipped';

          return (
            <AttemptCell
              key={attemptIdx}
              attempt={attempt}
              isFirst={attemptIdx === 0}
              isLast={attemptIdx === maxAttempts - 1}
              title={`Run ${runIdx + 1}, Step ${stepIdx + 1} (${step.stepName}), Attempt ${attemptIdx + 1}: ${status}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function SequentialRunRow({
  runResult,
  runIdx,
  maxAttempts,
}: {
  runResult: RunResult;
  runIdx: number;
  maxAttempts: number;
}) {
  const steps = runResult.steps || [];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-12 shrink-0">Run {runIdx + 1}</span>
      <div className="flex-1 flex gap-1">
        {steps.map((step, stepIdx) => (
          <StepAttempts
            key={stepIdx}
            step={step}
            stepIdx={stepIdx}
            maxAttempts={maxAttempts}
            runIdx={runIdx}
          />
        ))}
        {steps.length === 0 && (
          <div className="flex-1 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
        )}
      </div>
      <span
        className={`text-xs w-12 text-right ${runResult.success ? 'text-green-600' : 'text-red-600'}`}
      >
        {runResult.success ? 'Pass' : 'Fail'}
      </span>
    </div>
  );
}

export function RunProgressBars({ runs, maxRetries, isSequential }: RunProgressBarsProps) {
  const maxAttempts = maxRetries + 1;

  return (
    <div className="space-y-1">
      {isSequential && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-500 w-12 shrink-0"></span>
          <div className="flex-1 flex gap-1">
            <div className="flex-1 text-xs text-gray-500 text-center">Step 1</div>
            <div className="flex-1 text-xs text-gray-500 text-center">Step 2</div>
            <div className="flex-1 text-xs text-gray-500 text-center">Step 3</div>
          </div>
          <span className="text-xs w-12"></span>
        </div>
      )}
      {runs.map((runResult, runIdx) =>
        isSequential ? (
          <SequentialRunRow
            key={runIdx}
            runResult={runResult}
            runIdx={runIdx}
            maxAttempts={maxAttempts}
          />
        ) : (
          <OneShotRunRow
            key={runIdx}
            runResult={runResult}
            runIdx={runIdx}
            maxAttempts={maxAttempts}
          />
        )
      )}
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
          <span>Success</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
          <span>Failed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-sm"></div>
          <span>Skipped</span>
        </div>
      </div>
    </div>
  );
}
