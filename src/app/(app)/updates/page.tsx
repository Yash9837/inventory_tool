"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  History,
  User,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { UpdateLog, MarketplaceField } from "@/types/database";
import { MARKETPLACES, MARKETPLACE_COLORS } from "@/types/database";
import { cn } from "@/lib/utils";

export default function UpdatesPage() {
  const [updates, setUpdates] = useState<UpdateLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const perPage = 25;
  const supabase = createClient();

  const fetchUpdates = useCallback(async () => {
    const { data, error } = await supabase
      .from("updates")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) console.error("Error:", error);
    else setUpdates(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchUpdates();

    const channel = supabase
      .channel("updates-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "updates" },
        () => fetchUpdates()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUpdates, supabase]);

  const filtered = updates.filter((u) => {
    if (search && !String(u.sku).includes(search)) return false;
    if (fieldFilter !== "all" && u.field !== fieldFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  if (loading) return <UpdatesSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">
          Track all changes to your inventory
        </p>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by SKU number..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10 rounded-xl h-10"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <Select
              value={fieldFilter}
              onValueChange={(val) => {
                setFieldFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px] rounded-xl h-10">
                <SelectValue placeholder="Filter by field" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fields</SelectItem>
                <SelectItem value="stock">Stock</SelectItem>
                {MARKETPLACES.map((mp) => (
                  <SelectItem key={mp} value={mp}>
                    {mp.charAt(0).toUpperCase() + mp.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="rounded-lg">
          <History className="mr-1 h-3 w-3" />
          {filtered.length} records
        </Badge>
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold">Time</TableHead>
                <TableHead className="font-semibold">SKU</TableHead>
                <TableHead className="font-semibold">Field</TableHead>
                <TableHead className="font-semibold">Change</TableHead>
                <TableHead className="font-semibold">User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <History className="h-8 w-8 opacity-50" />
                      <p className="text-sm font-medium">No audit logs found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((update) => (
                  <TableRow key={update.id} className="group">
                    <TableCell>
                      <div>
                        <p className="text-xs font-medium">
                          {formatDistanceToNow(new Date(update.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(update.created_at), "MMM d, yyyy HH:mm")}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-primary">
                        {update.sku}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-md text-[10px] font-bold uppercase",
                          MARKETPLACES.includes(update.field as MarketplaceField)
                            ? MARKETPLACE_COLORS[update.field as MarketplaceField]
                            : update.field === "stock"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-muted"
                        )}
                      >
                        {update.field}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground line-through text-xs">
                          {update.old_value || "empty"}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-medium text-xs">
                          {update.new_value || "empty"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {update.user_email || "System"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm font-medium">{page}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function UpdatesSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-64" />
      </div>
      <Skeleton className="h-14 rounded-xl" />
      <Card className="border-border/50">
        <div className="p-4 space-y-3">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </Card>
    </div>
  );
}
