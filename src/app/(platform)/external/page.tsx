import { ExternalDashboard } from "@/components/external/ExternalDashboard";

export default function ExternalDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome</h1>
        <p className="mt-1 text-sm text-gray-500">
          Access your campaigns and manage your submissions.
        </p>
      </div>
      <ExternalDashboard />
    </div>
  );
}
