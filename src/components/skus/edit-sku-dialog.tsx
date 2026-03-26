"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Package } from "lucide-react";
import { toast } from "sonner";
import type { SKU } from "@/types/database";
import { MARKETPLACES, MARKETPLACE_COLORS } from "@/types/database";
import { cn } from "@/lib/utils";

interface SKUFormData {
  stock: number | null;
  amazon: string;
  flipkart: string;
  meesho: string;
  myntra: string;
}

interface EditSKUDialogProps {
  sku: SKU | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditSKUDialog({
  sku,
  open,
  onOpenChange,
  onSaved,
}: EditSKUDialogProps) {
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SKUFormData>({
    values: sku
      ? {
          stock: sku.stock,
          amazon: sku.amazon || "Not Listed",
          flipkart: sku.flipkart || "Not Listed",
          meesho: sku.meesho || "Not Listed",
          myntra: sku.myntra || "Not Listed",
        }
      : undefined,
  });

  const onSubmit = async (data: SKUFormData) => {
    if (!sku) return;
    setSaving(true);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Determine changed fields
      const changes: {
        field: string;
        old_value: string;
        new_value: string;
      }[] = [];

      if (sku.stock !== data.stock) {
        changes.push({
          field: "stock",
          old_value: String(sku.stock ?? ""),
          new_value: String(data.stock ?? ""),
        });
      }

      for (const mp of MARKETPLACES) {
        if ((sku[mp] || "Not Listed") !== data[mp]) {
          changes.push({
            field: mp,
            old_value: sku[mp] || "Not Listed",
            new_value: data[mp],
          });
        }
      }

      if (changes.length === 0) {
        toast.info("No changes detected");
        setSaving(false);
        return;
      }

      // Update the SKU
      const { error: updateError } = await supabase
        .from("skus")
        .update({
          stock: data.stock,
          amazon: data.amazon,
          flipkart: data.flipkart,
          meesho: data.meesho,
          myntra: data.myntra,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sku.id);

      if (updateError) throw updateError;

      // Insert audit logs
      const auditLogs = changes.map((change) => ({
        user_id: user?.id,
        user_email: user?.email,
        sku: sku.id,
        field: change.field,
        old_value: change.old_value,
        new_value: change.new_value,
      }));

      const { error: logError } = await supabase
        .from("updates")
        .insert(auditLogs);

      if (logError) console.error("Audit log error:", logError);

      toast.success(`SKU ${sku.id} updated successfully`);
      onSaved();
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update SKU";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!sku) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <span>Edit SKU {sku.id}</span>
              <DialogDescription className="mt-0.5">
                Update stock and marketplace listing status
              </DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-2">
          {/* Stock */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Stock Quantity
            </Label>
            <Input
              type="number"
              {...register("stock", { valueAsNumber: true })}
              className="rounded-xl h-11 text-lg font-semibold"
              placeholder="Enter stock quantity"
            />
            {errors.stock && (
              <p className="text-xs text-destructive">{errors.stock.message}</p>
            )}
          </div>

          <Separator />

          {/* Marketplaces */}
          <div className="space-y-4">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Marketplace Listings
            </Label>

            {MARKETPLACES.map((mp) => {
              const currentValue = watch(mp);
              const isListed = currentValue !== "Not Listed";

              return (
                <div key={mp} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-md text-[10px] font-bold uppercase",
                          MARKETPLACE_COLORS[mp]
                        )}
                      >
                        {mp}
                      </Badge>
                    </div>
                    <Select
                      value={isListed ? "listed" : "not_listed"}
                      onValueChange={(val) => {
                        if (val === "not_listed") {
                          setValue(mp, "Not Listed");
                        } else {
                          setValue(
                            mp,
                            sku[mp] !== "Not Listed" ? sku[mp] || "" : ""
                          );
                        }
                      }}
                    >
                      <SelectTrigger className="w-[140px] rounded-lg h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="listed">Listed</SelectItem>
                        <SelectItem value="not_listed">Not Listed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {isListed && (
                    <Input
                      {...register(mp)}
                      placeholder={`${mp} listing ID`}
                      className="rounded-lg h-9 text-sm"
                    />
                  )}
                  {errors[mp] && (
                    <p className="text-xs text-destructive">
                      {errors[mp]?.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl shadow-lg shadow-primary/25"
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
