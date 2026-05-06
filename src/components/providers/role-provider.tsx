"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database";

interface RoleContextType {
  role: UserRole | null;
  isAdmin: boolean;
  loading: boolean;
}

const RoleContext = createContext<RoleContextType>({
  role: null,
  isAdmin: false,
  loading: true,
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        console.log("[RoleProvider] user id:", user.id, "email:", user.email);

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        console.log("[RoleProvider] profile query result:", { profile, error });

        if (error || !profile) {
          // Profile doesn't exist yet — create one with default 'user' role
          await supabase
            .from("profiles")
            .upsert({ id: user.id, role: "user" }, { onConflict: "id" });
          setRole("user");
        } else {
          console.log("[RoleProvider] setting role to:", profile.role);
          setRole(profile.role ?? "user");
        }
      }
      setLoading(false);
    }

    fetchRole();
  }, [supabase]);

  return (
    <RoleContext.Provider
      value={{ role, isAdmin: role === "admin", loading }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
