"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function InvitationManagement() {
  const [email, setEmail] = useState("");
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);

  const utils = trpc.useUtils();

  const { data: campaigns } = trpc.campaign.list.useQuery({ limit: 100 });
  const { data: invitations, isLoading } = trpc.externalInvitation.list.useQuery({
    limit: 50,
  });

  const createMutation = trpc.externalInvitation.create.useMutation({
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      setEmail("");
      setSelectedCampaignIds([]);
      void utils.externalInvitation.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const revokeMutation = trpc.externalInvitation.revoke.useMutation({
    onSuccess: () => {
      toast.success("Invitation revoked");
      void utils.externalInvitation.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || selectedCampaignIds.length === 0) return;
    createMutation.mutate({ email, campaignIds: selectedCampaignIds });
  }

  function handleCampaignToggle(campaignId: string) {
    setSelectedCampaignIds((prev) =>
      prev.includes(campaignId) ? prev.filter((id) => id !== campaignId) : [...prev, campaignId],
    );
  }

  const campaignItems = campaigns?.items ?? [];
  const invitationItems = invitations?.items ?? [];

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    ACCEPTED: "bg-green-100 text-green-800",
    EXPIRED: "bg-gray-100 text-gray-800",
    REVOKED: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Invite External User</h2>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 p-4">
          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Campaign Access</label>
            <div className="mt-2 space-y-2">
              {campaignItems.map((campaign) => (
                <label key={campaign.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedCampaignIds.includes(campaign.id)}
                    onChange={() => handleCampaignToggle(campaign.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{campaign.title}</span>
                </label>
              ))}
              {campaignItems.length === 0 && (
                <p className="text-sm text-gray-500">No campaigns available</p>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending || !email || selectedCampaignIds.length === 0}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createMutation.isPending ? "Sending..." : "Send Invitation"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Invitations</h2>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-gray-200" />
            ))}
          </div>
        ) : invitationItems.length === 0 ? (
          <p className="text-sm text-gray-500">No invitations yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Invited By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Campaigns
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {invitationItems.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {invitation.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[invitation.status] ?? "bg-gray-100 text-gray-800"}`}
                      >
                        {invitation.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {invitation.inviter?.name ?? invitation.inviter?.email ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {invitation.campaignIds.length} campaign(s)
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {invitation.status === "PENDING" && (
                        <button
                          onClick={() => revokeMutation.mutate({ id: invitation.id })}
                          disabled={revokeMutation.isPending}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
