"use client";

import * as React from "react";
import { Shield, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROLE_LABELS: Record<string, string> = {
  PLATFORM_ADMIN: "Admin",
  INNOVATION_MANAGER: "Manager",
  MEMBER: "Member",
};

interface BulkRoleDropdownProps {
  onSelect: (role: "PLATFORM_ADMIN" | "INNOVATION_MANAGER" | "MEMBER") => void;
}

export function BulkRoleDropdown({ onSelect }: BulkRoleDropdownProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen(!open)}>
        <Shield className="mr-1 h-3.5 w-3.5" />
        Assign Role
        <ChevronDown className="ml-1 h-3.5 w-3.5" />
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            onKeyDown={() => {}}
            role="button"
            tabIndex={-1}
            aria-label="Close menu"
          />
          <div className="absolute left-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {(["PLATFORM_ADMIN", "INNOVATION_MANAGER", "MEMBER"] as const).map((role) => (
              <button
                key={role}
                onClick={() => {
                  setOpen(false);
                  onSelect(role);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
