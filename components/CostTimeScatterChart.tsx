'use client';

import { useState, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { modelPricing, calculateCost } from '@/lib/pricing';

export { modelPricing, calculateCost };

interface DataPoint {
  modelId: string;
  modelName: string;
  scenario: number;
  scenarioLabel: string;
  timeSeconds: number;
  costDollars: number;
  efficiency: number;
  tokens: number;
}

interface CostTimeScatterChartProps {
  data: DataPoint[];
}


const scenarioFullLabels: Record<number, string> = {
  1: 'One-Shot Non-Strict',
  2: 'One-Shot Strict',
  3: 'Sequential Non-Strict',
  4: 'Sequential Strict',
};

const modelColors = [
  '#3b82f6',
  '#22c55e',
  '#f97316',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#eab308',
  '#ef4444',
  '#6366f1',
  '#84cc16',
  '#06b6d4',
  '#f43f5e',
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: DataPoint;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="font-medium text-gray-900 dark:text-white mb-2">
        {data.modelName}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        {scenarioFullLabels[data.scenario]}
      </p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-gray-600 dark:text-gray-400">Time:</span>
          <span className="font-medium">{data.timeSeconds.toFixed(2)}s</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600 dark:text-gray-400">Cost:</span>
          <span className="font-medium">${data.costDollars.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600 dark:text-gray-400">Tokens:</span>
          <span className="font-medium">{data.tokens.toLocaleString()}</span>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-1 mt-1 flex justify-between gap-4">
          <span className="text-gray-900 dark:text-white font-medium">Efficiency:</span>
          <span className="font-bold">${data.efficiency.toFixed(4)}/s</span>
        </div>
      </div>
    </div>
  );
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: DataPoint;
  modelColorMap: Record<string, string>;
}

function ScenarioShape({ cx, cy, scenario, color, size = 6 }: { cx: number; cy: number; scenario: number; color: string; size?: number }) {
  const strokeWidth = 2;
  const isStrict = scenario === 2 || scenario === 4;
  const isTriangle = scenario === 3 || scenario === 4;

  if (isTriangle) {
    const h = size * 1.8;
    const w = size * 1.6;
    const points = `${cx},${cy - h * 0.6} ${cx - w},${cy + h * 0.4} ${cx + w},${cy + h * 0.4}`;

    return (
      <polygon
        points={points}
        fill={isStrict ? color : 'transparent'}
        stroke={color}
        strokeWidth={strokeWidth}
        style={{ cursor: 'pointer' }}
      />
    );
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={size}
      fill={isStrict ? color : 'transparent'}
      stroke={color}
      strokeWidth={strokeWidth}
      style={{ cursor: 'pointer' }}
    />
  );
}

function CustomDot({ cx, cy, payload, modelColorMap }: Omit<DotProps, 'hiddenModels' | 'hiddenScenarios'>) {
  if (!cx || !cy || !payload) return null;

  const color = modelColorMap[payload.modelId] || '#888';

  return <ScenarioShape cx={cx} cy={cy} scenario={payload.scenario} color={color} />;
}

export function CostTimeScatterChart({ data }: CostTimeScatterChartProps) {
  const models = useMemo(() => [...new Set(data.map(d => d.modelId))], [data]);
  const modelNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    data.forEach(d => { map[d.modelId] = d.modelName; });
    return map;
  }, [data]);
  const scenarios = useMemo(() => [...new Set(data.map(d => d.scenario))].sort(), [data]);

  const modelColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    models.forEach((modelId, i) => {
      map[modelId] = modelColors[i % modelColors.length];
    });
    return map;
  }, [models]);

  const [hiddenModels, setHiddenModels] = useState<string[]>([]);
  const [hiddenScenarios, setHiddenScenarios] = useState<number[]>([]);

  const toggleModel = (modelId: string) => {
    setHiddenModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const toggleScenario = (scenario: number) => {
    setHiddenScenarios(prev =>
      prev.includes(scenario)
        ? prev.filter(s => s !== scenario)
        : [...prev, scenario]
    );
  };

  const hiddenModelsSet = useMemo(() => new Set(hiddenModels), [hiddenModels]);
  const hiddenScenariosSet = useMemo(() => new Set(hiddenScenarios), [hiddenScenarios]);

  const filteredData = useMemo(() =>
    data.filter(d => !hiddenModelsSet.has(d.modelId) && !hiddenScenariosSet.has(d.scenario)),
    [data, hiddenModelsSet, hiddenScenariosSet]
  );

  const maxTime = useMemo(() => {
    if (filteredData.length === 0) return 1;
    return Math.max(...filteredData.map(d => d.timeSeconds), 0.1) * 1.1;
  }, [filteredData]);

  const maxCost = useMemo(() => {
    if (filteredData.length === 0) return 0.001;
    return Math.max(...filteredData.map(d => d.costDollars), 0.0001) * 1.1;
  }, [filteredData]);

  const avgEfficiency = useMemo(() => {
    if (filteredData.length === 0) return 0;
    return filteredData.reduce((sum, d) => sum + d.efficiency, 0) / filteredData.length;
  }, [filteredData]);

  const referenceLineData: [{ x: number; y: number }, { x: number; y: number }] = [
    { x: 0, y: 0 },
    { x: maxTime, y: avgEfficiency * maxTime },
  ];

  const chartKey = `${maxTime.toFixed(6)}-${maxCost.toFixed(6)}`;

  return (
    <div className="w-full">
      <div className="flex flex-wrap justify-center gap-3 mb-4 text-xs">
        <span className="font-medium text-gray-600 dark:text-gray-400 self-center">Models:</span>
        {models.map((modelId) => {
          const isHidden = hiddenModelsSet.has(modelId);
          return (
            <button
              key={modelId}
              onClick={() => toggleModel(modelId)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-all ${
                isHidden
                  ? 'border-gray-300 dark:border-gray-600 opacity-40'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: isHidden ? '#ccc' : modelColorMap[modelId] }}
              />
              <span className={isHidden ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}>
                {modelNameMap[modelId]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-4 text-xs">
        <span className="font-medium text-gray-600 dark:text-gray-400 self-center">Scenarios:</span>
        {scenarios.map((scenario) => {
          const isHidden = hiddenScenariosSet.has(scenario);
          return (
            <button
              key={scenario}
              onClick={() => toggleScenario(scenario)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-all ${
                isHidden
                  ? 'border-gray-300 dark:border-gray-600 opacity-40'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16">
                <ScenarioShape cx={8} cy={8} scenario={scenario} color={isHidden ? '#ccc' : '#666'} size={5} />
              </svg>
              <span className={isHidden ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}>
                {scenarioFullLabels[scenario]}
              </span>
            </button>
          );
        })}
      </div>

      <ResponsiveContainer key={chartKey} width="100%" height={500}>
        <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            type="number"
            dataKey="timeSeconds"
            name="Time"
            domain={[0, maxTime]}
            allowDataOverflow={true}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value.toFixed(1)}s`}
            label={{
              value: 'Average Time per Run (seconds)',
              position: 'insideBottom',
              offset: -10,
              style: { textAnchor: 'middle', fontSize: 12 },
            }}
          />
          <YAxis
            type="number"
            dataKey="costDollars"
            name="Cost"
            domain={[0, maxCost]}
            allowDataOverflow={true}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${value.toFixed(3)}`}
            label={{
              value: 'Average Cost per Run ($)',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: 12 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          {avgEfficiency > 0 && (
            <ReferenceLine
              segment={referenceLineData}
              stroke="#9ca3af"
              strokeDasharray="5 5"
              strokeWidth={1}
            />
          )}
          <Scatter
            data={filteredData}
            isAnimationActive={false}
            shape={(props: unknown) => {
              const dotProps = props as DotProps;
              return <CustomDot {...dotProps} modelColorMap={modelColorMap} />;
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>

      <div className="flex flex-col items-center gap-3 mt-4">
        {avgEfficiency > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="w-8 border-t-2 border-dashed border-gray-400" />
            <span>Average efficiency (${avgEfficiency.toFixed(4)}/s)</span>
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Bottom-left = fast &amp; cheap (best) • Top-right = slow &amp; expensive
        </div>

      </div>
    </div>
  );
}
