"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Edit2,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  AlertTriangle,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import type { SKU, MarketplaceField } from "@/types/database";
import { MARKETPLACES, MARKETPLACE_COLORS } from "@/types/database";
import { cn } from "@/lib/utils";
import { EditSKUDialog } from "@/components/skus/edit-sku-dialog";

type FilterType = "all" | "low_stock" | `not_listed_${MarketplaceField}`;

export default function SKUsPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [editingSku, setEditingSku] = useState<SKU | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const supabase = createClient();

  const fetchSkus = useCallback(async () => {
    const { data, error } = await supabase
      .from("skus")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching SKUs:", error);
    } else {
      setSkus(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchSkus();

    // Real-time subscription
    const channel = supabase
      .channel("skus-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "skus" },
        () => {
          fetchSkus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSkus, supabase]);

  // Filter and search
  const filteredSkus = skus.filter((sku) => {
    // Search filter
    if (search && !String(sku.id).includes(search)) return false;

    // Type filter
    if (filter === "low_stock") return sku.stock !== null && sku.stock < 5;
    if (filter.startsWith("not_listed_")) {
      const mp = filter.replace("not_listed_", "") as MarketplaceField;
      return !sku[mp] || sku[mp] === "Not Listed";
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredSkus.length / perPage);
  const paginatedSkus = filteredSkus.slice(
    (page - 1) * perPage,
    page * perPage
  );

  const handleEdit = (sku: SKU) => {
    setEditingSku(sku);
    setEditOpen(true);
  };

  const activeFilterCount =
    (search ? 1 : 0) + (filter !== "all" ? 1 : 0);

  const handleExport = () => {
    const exportData = skus.map((sku) => ({
      "SKU Alya Site": sku.id,
      "Amazone Active Listing": sku.amazon || "Not Listed",
      "Flipkart": sku.flipkart || "Not Listed",
      "Meesho": sku.meesho || "Not Listed",
      "Myntra": sku.myntra || "Not Listed",
      "Stock": sku.stock ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
      wch: Math.max(
        key.length,
        ...exportData.map((row) => String(row[key as keyof typeof row]).length)
      ) + 2,
    }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `Alya - Listing Sheet ${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  if (loading) return <SKUsSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SKU Inventory</h1>
          <p className="text-muted-foreground mt-1">
            {filteredSkus.length} of {skus.length} SKUs
          </p>
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          className="rounded-xl h-10 gap-2 shadow-sm"
          disabled={skus.length === 0}
        >
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
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

            {/* Filter dropdown */}
            <Select
              value={filter}
              onValueChange={(val) => {
                setFilter(val as FilterType);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px] rounded-xl h-10">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Filter..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All SKUs</SelectItem>
                <SelectItem value="low_stock">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    Low Stock (&lt; 5)
                  </span>
                </SelectItem>
                {MARKETPLACES.map((mp) => (
                  <SelectItem key={mp} value={`not_listed_${mp}`}>
                    Not Listed on {mp.charAt(0).toUpperCase() + mp.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Per page */}
            <Select
              value={String(perPage)}
              onValueChange={(val) => {
                setPerPage(Number(val));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[120px] rounded-xl h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                  setPage(1);
                }}
                className="rounded-xl text-muted-foreground"
              >
                Clear
                <Badge variant="secondary" className="ml-1 rounded-md text-[10px]">
                  {activeFilterCount}
                </Badge>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[100px] font-semibold">SKU</TableHead>
                <TableHead className="font-semibold">
                  <span className="flex items-center gap-1.5">
                    Stock
                  </span>
                </TableHead>
                {MARKETPLACES.map((mp) => (
                  <TableHead key={mp} className="font-semibold">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-md text-[10px] font-bold uppercase",
                        MARKETPLACE_COLORS[mp]
                      )}
                    >
                      {mp}
                    </Badge>
                  </TableHead>
                ))}
                <TableHead className="w-[80px] text-right font-semibold">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSkus.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 opacity-50" />
                      <p className="text-sm font-medium">No SKUs found</p>
                      <p className="text-xs">Try adjusting your search or filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSkus.map((sku) => (
                  <TableRow
                    key={sku.id}
                    className="group cursor-pointer transition-colors"
                    onClick={() => handleEdit(sku)}
                  >
                    <TableCell className="font-bold text-primary">
                      {sku.id}
                    </TableCell>
                    <TableCell>
                      <StockBadge stock={sku.stock} />
                    </TableCell>
                    {MARKETPLACES.map((mp) => (
                      <TableCell key={mp}>
                        <ListingBadge
                          value={sku[mp]}
                          marketplace={mp}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(sku);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
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
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "ghost"}
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-lg text-xs",
                        page === pageNum && "shadow-md shadow-primary/25"
                      )}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Dialog */}
      <EditSKUDialog
        sku={editingSku}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={fetchSkus}
      />
    </div>
  );
}

function StockBadge({ stock }: { stock: number | null }) {
  if (stock === null)
    return (
      <span className="text-xs text-muted-foreground/50 italic">N/A</span>
    );

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-lg font-mono text-xs font-semibold tabular-nums",
        stock === 0 && "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        stock > 0 && stock < 5 && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        stock >= 5 && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      )}
    >
      {stock}
    </Badge>
  );
}

function ListingBadge({
  value,
  marketplace,
}: {
  value: string | null;
  marketplace: MarketplaceField;
}) {
  const isListed = value && value !== "Not Listed";

  if (!isListed) {
    return (
      <span className="text-xs text-muted-foreground/50">Not Listed</span>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-lg text-xs font-medium",
        MARKETPLACE_COLORS[marketplace]
      )}
    >
      {value}
    </Badge>
  );
}

function SKUsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-40" />
      </div>
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 w-[200px] rounded-xl" />
            <Skeleton className="h-10 w-[120px] rounded-xl" />
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/50">
        <div className="p-4 space-y-3">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </Card>
    </div>
  );
}
