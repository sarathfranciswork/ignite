import { InvitationManagement } from "@/components/external/InvitationManagement";

export default function AdminInvitationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">External User Invitations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Invite external users and manage their campaign access.
        </p>
      </div>
      <InvitationManagement />
    </div>
  );
}
