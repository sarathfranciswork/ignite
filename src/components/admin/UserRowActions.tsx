"use client";

import * as React from "react";
import { MoreHorizontal, UserX, UserCheck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserRowActionsProps {
  isActive: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
}

export function UserRowActions({ isActive, onEdit, onToggleActive }: UserRowActionsProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(!open)}>
        <MoreHorizontal className="h-4 w-4" />
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
          <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <button
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Shield className="h-4 w-4" />
              Edit User
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onToggleActive();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {isActive ? (
                <>
                  <UserX className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">Deactivate</span>
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Reactivate</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
