"use client";

interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

interface FunnelChartProps {
  steps: FunnelStep[];
}

export function FunnelChart({ steps }: FunnelChartProps) {
  const maxValue = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const widthPercent = Math.max((step.value / maxValue) * 100, 8);
        return (
          <div key={step.label} className="flex items-center gap-3">
            <div className="w-24 text-right text-xs font-medium text-gray-600">{step.label}</div>
            <div className="flex-1">
              <div
                className="flex h-8 items-center rounded-md px-3 text-xs font-bold text-white transition-all"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: step.color,
                  opacity: 1 - index * 0.1,
                }}
              >
                {step.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
