"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ScenarioData {
  firstAttempt: number;
  afterRetry1: number;
  afterRetry2: number;
  afterRetry3: number;
}

interface ModelData {
  modelId: string;
  modelName: string;
  scenarios: Record<number, ScenarioData>;
}

interface SuccessRateChartProps {
  data: ModelData[];
  scenariosToShow: number[];
}

const scenarioLabels: Record<number, string> = {
  1: "One-Shot Non-Strict",
  2: "One-Shot Strict",
  3: "Sequential Non-Strict",
  4: "Sequential Strict",
};

const scenarioColors: Record<
  number,
  { first: string; r1: string; r2: string; r3: string }
> = {
  1: { first: "#3b82f6", r1: "#60a5fa", r2: "#93c5fd", r3: "#bfdbfe" },
  2: { first: "#22c55e", r1: "#4ade80", r2: "#86efac", r3: "#bbf7d0" },
  3: { first: "#a855f7", r1: "#c084fc", r2: "#d8b4fe", r3: "#e9d5ff" },
  4: { first: "#f97316", r1: "#fb923c", r2: "#fdba74", r3: "#fed7aa" },
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    dataKey: string;
    color: string;
    payload: Record<string, unknown>;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const modelName = data.model as string;

  const scenariosInPayload = new Set<number>();
  payload.forEach((p) => {
    const match = p.dataKey.match(/^s(\d+)_/);
    if (match) scenariosInPayload.add(parseInt(match[1]));
  });

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="font-medium text-gray-900 dark:text-white mb-2">
        {modelName}
      </p>
      <div className="space-y-3">
        {Array.from(scenariosInPayload).sort().map((scenario) => {
          const first = (data[`s${scenario}_first`] as number) || 0;
          const r1 = (data[`s${scenario}_r1`] as number) || 0;
          const r2 = (data[`s${scenario}_r2`] as number) || 0;
          const r3 = (data[`s${scenario}_r3`] as number) || 0;
          const total = first + r1 + r2 + r3;

          return (
            <div key={scenario} className="text-sm">
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-1" style={{ color: scenarioColors[scenario]?.first }}>
                {scenarioLabels[scenario]}
              </p>
              <div className="space-y-0.5 pl-2">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-600 dark:text-gray-400">1st attempt:</span>
                  <span className="font-medium">{first.toFixed(0)}%</span>
                </div>
                {r1 > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600 dark:text-gray-400">+Retry 1:</span>
                    <span className="font-medium">+{r1.toFixed(0)}%</span>
                  </div>
                )}
                {r2 > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600 dark:text-gray-400">+Retry 2:</span>
                    <span className="font-medium">+{r2.toFixed(0)}%</span>
                  </div>
                )}
                {r3 > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600 dark:text-gray-400">+Retry 3:</span>
                    <span className="font-medium">+{r3.toFixed(0)}%</span>
                  </div>
                )}
                <div className="flex justify-between gap-4 font-medium">
                  <span className="text-gray-900 dark:text-white">Total:</span>
                  <span>{total.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SuccessRateChart({
  data,
  scenariosToShow,
}: SuccessRateChartProps) {
  const groupedByModel = data.map((model) => {
    const entry: Record<string, unknown> = { model: model.modelName };

    scenariosToShow.forEach((scenario) => {
      const scenarioData = model.scenarios[scenario];
      if (!scenarioData) return;

      const first = scenarioData.firstAttempt;
      const r1 = scenarioData.afterRetry1 - first;
      const r2 = scenarioData.afterRetry2 - scenarioData.afterRetry1;
      const r3 = scenarioData.afterRetry3 - scenarioData.afterRetry2;

      entry[`s${scenario}_first`] = first;
      entry[`s${scenario}_r1`] = Math.max(0, r1);
      entry[`s${scenario}_r2`] = Math.max(0, r2);
      entry[`s${scenario}_r3`] = Math.max(0, r3);
    });

    return entry;
  });

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={600}>
        <BarChart
          data={groupedByModel}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="model"
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value}%`}
            label={{
              value: "Success Rate",
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle" },
            }}
          />
          <Tooltip content={<CustomTooltip />} />

          {scenariosToShow.map((scenario) => (
            <Bar
              key={`s${scenario}`}
              dataKey={`s${scenario}_first`}
              stackId={`s${scenario}`}
              fill={scenarioColors[scenario].first}
              name={`s${scenario}_first`}
            />
          ))}
          {scenariosToShow.map((scenario) => (
            <Bar
              key={`s${scenario}_r1`}
              dataKey={`s${scenario}_r1`}
              stackId={`s${scenario}`}
              fill={scenarioColors[scenario].r1}
              name={`s${scenario}_r1`}
            />
          ))}
          {scenariosToShow.map((scenario) => (
            <Bar
              key={`s${scenario}_r2`}
              dataKey={`s${scenario}_r2`}
              stackId={`s${scenario}`}
              fill={scenarioColors[scenario].r2}
              name={`s${scenario}_r2`}
            />
          ))}
          {scenariosToShow.map((scenario) => (
            <Bar
              key={`s${scenario}_r3`}
              dataKey={`s${scenario}_r3`}
              stackId={`s${scenario}`}
              fill={scenarioColors[scenario].r3}
              name={`s${scenario}_r3`}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap justify-center gap-6 mt-4">
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">Attempt:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm bg-gray-800 dark:bg-gray-200" />
            <span>1st request</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm bg-gray-600 dark:bg-gray-400" />
            <span>1st retry</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm bg-gray-400 dark:bg-gray-500" />
            <span>2nd retry</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-sm bg-gray-300 dark:bg-gray-600" />
            <span>3rd retry</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs">
        <span className="font-medium">Scenario:</span>
        {scenariosToShow.map((scenario) => (
          <div key={scenario} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-sm"
              style={{ backgroundColor: scenarioColors[scenario].first }}
            />
            <span className="text-gray-600 dark:text-gray-400">
              {scenarioLabels[scenario]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
