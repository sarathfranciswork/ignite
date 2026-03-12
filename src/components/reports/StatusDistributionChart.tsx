"use client";

interface StatusCounts {
  ACTIVE: number;
  ON_HOLD: number;
  COMPLETED: number;
  TERMINATED: number;
}

interface StatusDistributionChartProps {
  statusCounts: StatusCounts;
}

const STATUS_CONFIG: {
  key: keyof StatusCounts;
  label: string;
  color: string;
}[] = [
  { key: "ACTIVE", label: "Active", color: "#3B82F6" },
  { key: "ON_HOLD", label: "On Hold", color: "#F59E0B" },
  { key: "COMPLETED", label: "Completed", color: "#10B981" },
  { key: "TERMINATED", label: "Terminated", color: "#EF4444" },
];

export function StatusDistributionChart({ statusCounts }: StatusDistributionChartProps) {
  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-900">Status Distribution</h3>

      {total === 0 ? (
        <p className="mt-4 text-sm text-gray-400">No projects to display</p>
      ) : (
        <>
          <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-gray-100">
            {STATUS_CONFIG.map(({ key, color }) => {
              const count = statusCounts[key];
              if (count === 0) return null;
              const widthPercent = (count / total) * 100;
              return (
                <div
                  key={key}
                  className="transition-all"
                  style={{ width: `${widthPercent}%`, backgroundColor: color }}
                  title={`${key}: ${count}`}
                />
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {STATUS_CONFIG.map(({ key, label, color }) => (
              <div key={key} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-gray-600">{label}</span>
                <span className="ml-auto text-xs font-semibold text-gray-900">
                  {statusCounts[key]}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
