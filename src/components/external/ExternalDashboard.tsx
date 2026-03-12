"use client";

import { trpc } from "@/lib/trpc";

export function ExternalDashboard() {
  const { data: campaigns, isLoading: campaignsLoading } = trpc.campaign.list.useQuery({
    limit: 50,
  });

  if (campaignsLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    );
  }

  const campaignItems = campaigns?.items ?? [];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Your Campaigns</h2>
        {campaignItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-500">
              You don&apos;t have access to any campaigns yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaignItems.map((campaign) => (
              <a
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="block rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md"
              >
                <h3 className="font-medium text-gray-900">{campaign.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                  {campaign.teaser ?? "No description"}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {campaign.status}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
