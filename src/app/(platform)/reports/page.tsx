import { ReportsView } from "@/components/reports/ReportsView";

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Portfolio analysis, campaign KPIs, idea funnels, and platform-wide metrics.
        </p>
      </div>
      <ReportsView />
    </div>
  );
}
