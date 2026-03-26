"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  Boxes,
  ShoppingCart,
  Clock,
  User,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { UpdateLog, MarketplaceField } from "@/types/database";
import { MARKETPLACE_COLORS, MARKETPLACES } from "@/types/database";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalSkus: number;
  totalStock: number;
  lowStockCount: number;
  marketplaceCounts: Record<MarketplaceField, number>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentUpdates, setRecentUpdates] = useState<UpdateLog[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    // Fetch all SKUs for stats
    const { data: skus } = await supabase.from("skus").select("*");

    if (skus) {
      const totalSkus = skus.length;
      const totalStock = skus.reduce((sum, s) => sum + (s.stock || 0), 0);
      const lowStockCount = skus.filter(
        (s) => s.stock !== null && s.stock < 5
      ).length;

      const marketplaceCounts: Record<MarketplaceField, number> = {
        amazon: 0,
        flipkart: 0,
        meesho: 0,
        myntra: 0,
      };

      for (const sku of skus) {
        for (const mp of MARKETPLACES) {
          if (sku[mp] && sku[mp] !== "Not Listed") {
            marketplaceCounts[mp]++;
          }
        }
      }

      setStats({ totalSkus, totalStock, lowStockCount, marketplaceCounts });
    }

    // Fetch recent updates
    const { data: updates } = await supabase
      .from("updates")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);

    if (updates) setRecentUpdates(updates);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();

    // Real-time subscription for updates
    const channel = supabase
      .channel("dashboard-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "updates" },
        () => {
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "skus" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, supabase]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your inventory and marketplace listings
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total SKUs"
          value={stats?.totalSkus ?? 0}
          icon={Package}
          description="Products in inventory"
          color="text-primary"
          bgColor="bg-primary/10"
        />
        <StatsCard
          title="Total Stock"
          value={stats?.totalStock ?? 0}
          icon={Boxes}
          description="Units available"
          color="text-emerald-600 dark:text-emerald-400"
          bgColor="bg-emerald-500/10"
        />
        <StatsCard
          title="Low Stock"
          value={stats?.lowStockCount ?? 0}
          icon={AlertTriangle}
          description="Less than 5 units"
          color="text-amber-600 dark:text-amber-400"
          bgColor="bg-amber-500/10"
          alert={!!stats && stats.lowStockCount > 0}
        />
        <StatsCard
          title="Active Listings"
          value={
            stats
              ? Object.values(stats.marketplaceCounts).reduce((a, b) => a + b, 0)
              : 0
          }
          icon={ShoppingCart}
          description="Across all platforms"
          color="text-violet-600 dark:text-violet-400"
          bgColor="bg-violet-500/10"
        />
      </div>

      {/* Marketplace Breakdown */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MARKETPLACES.map((mp) => (
          <Card
            key={mp}
            className="group overflow-hidden border-border/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {mp}
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {stats?.marketplaceCounts[mp] ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    listed SKUs
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl border text-lg font-bold transition-transform duration-300 group-hover:scale-110",
                    MARKETPLACE_COLORS[mp]
                  )}
                >
                  {mp.charAt(0).toUpperCase()}
                </div>
              </div>
              {stats && (
                <div className="mt-3">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        mp === "amazon" && "bg-orange-500",
                        mp === "flipkart" && "bg-blue-500",
                        mp === "meesho" && "bg-pink-500",
                        mp === "myntra" && "bg-purple-500"
                      )}
                      style={{
                        width: `${
                          stats.totalSkus > 0
                            ? (stats.marketplaceCounts[mp] / stats.totalSkus) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest changes to inventory</CardDescription>
            </div>
            <Badge variant="secondary" className="rounded-lg">
              {recentUpdates.length} updates
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {recentUpdates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm font-medium">No recent activity</p>
              <p className="text-xs">Changes will appear here</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentUpdates.map((update, i) => (
                <div
                  key={update.id}
                  className="group flex items-start gap-4 rounded-xl p-3 transition-colors hover:bg-accent/50"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        SKU {update.sku}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] rounded-md",
                          MARKETPLACES.includes(
                            update.field as MarketplaceField
                          )
                            ? MARKETPLACE_COLORS[
                                update.field as MarketplaceField
                              ]
                            : "bg-muted"
                        )}
                      >
                        {update.field}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="line-through opacity-60">
                        {update.old_value || "empty"}
                      </span>
                      {" → "}
                      <span className="font-medium text-foreground">
                        {update.new_value || "empty"}
                      </span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span className="max-w-[120px] truncate">
                        {update.user_email || "System"}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {formatDistanceToNow(new Date(update.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  color,
  bgColor,
  alert,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  bgColor: string;
  alert?: boolean;
}) {
  return (
    <Card
      className={cn(
        "group overflow-hidden border-border/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
        alert && "border-amber-500/30"
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
              bgColor
            )}
          >
            <Icon className={cn("h-6 w-6", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-5">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-12 w-12 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Card className="border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
