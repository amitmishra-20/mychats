"use client";

import { useAuth } from "./authprovider";
import { LogOut, User as UserIcon } from "lucide-react";

export default function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-card border-b border-border">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
          <UserIcon size={14} className="text-accent" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={logout}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
