import { DashboardView } from "@/components/dashboard/DashboardView";

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your personalized overview of tasks, campaigns, and activity.
        </p>
      </div>
      <DashboardView />
    </div>
  );
}
