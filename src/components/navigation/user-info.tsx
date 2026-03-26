"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { User } from "@supabase/supabase-js";

export function UserInfo() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, [supabase.auth]);

  if (!user) return null;

  const initials = user.email
    ? user.email.substring(0, 2).toUpperCase()
    : "U";

  return (
    <div className="flex items-center gap-3 rounded-xl bg-accent/50 px-3 py-2">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.email}</p>
        <p className="text-[11px] text-muted-foreground">Authenticated</p>
      </div>
    </div>
  );
}
