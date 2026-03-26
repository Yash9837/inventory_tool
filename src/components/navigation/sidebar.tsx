"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  History,
  Upload,
  LogOut,
  ChevronLeft,
  Menu,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "SKU Inventory",
    href: "/skus",
    icon: Package,
  },
  {
    title: "Audit Logs",
    href: "/updates",
    icon: History,
  },
  {
    title: "Import Data",
    href: "/import",
    icon: Upload,
  },
];

function NavContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-6", collapsed && "justify-center px-2")}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
          <Boxes className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold tracking-tight">Alya</h1>
            <p className="text-[11px] font-medium text-muted-foreground">Inventory Manager</p>
          </div>
        )}
      </div>

      <Separator className="mb-4" />

      {/* Nav Items */}
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-4.5 w-4.5 shrink-0 transition-transform duration-200",
                  !isActive && "group-hover:scale-110"
                )}
              />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className={cn("space-y-2 p-3", collapsed && "px-2")}>
        <Separator className="mb-3" />
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between px-1")}>
          {!collapsed && (
            <span className="text-xs font-medium text-muted-foreground">Theme</span>
          )}
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            "w-full justify-start gap-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r bg-card/50 backdrop-blur-sm transition-all duration-300 ease-in-out",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        <div className="relative flex-1 overflow-hidden">
          <NavContent collapsed={collapsed} />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-8 z-10 h-6 w-6 rounded-full border bg-card shadow-md"
          >
            <ChevronLeft
              className={cn(
                "h-3 w-3 transition-transform duration-300",
                collapsed && "rotate-180"
              )}
            />
          </Button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 glass border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[260px] p-0">
                <NavContent collapsed={false} />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Boxes className="h-4 w-4" />
              </div>
              <span className="font-bold">Alya</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </>
  );
}
