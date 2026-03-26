"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    imported?: number;
    errors?: string[];
    message?: string;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && (dropped.name.endsWith(".xlsx") || dropped.name.endsWith(".xls"))) {
      setFile(dropped);
      setResult(null);
    } else {
      toast.error("Please drop an Excel file (.xlsx or .xls)");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, imported: data.imported });
        toast.success(`Successfully imported ${data.imported} SKUs`);
      } else {
        setResult({
          success: false,
          message: data.error,
          errors: data.details,
        });
        toast.error(data.error || "Import failed");
      }
    } catch {
      setResult({ success: false, message: "Network error" });
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground mt-1">
          Import SKU data from your Excel spreadsheet
        </p>
      </div>

      {/* Info card */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium">One-time import</p>
            <p className="text-xs mt-1 opacity-80">
              Upload your Excel file with columns: SKU (id), Amazon, Flipkart, Meesho, Myntra, Stock.
              This will insert or update existing SKUs in the database.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upload area */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            Upload Excel File
          </CardTitle>
          <CardDescription>
            Supported formats: .xlsx, .xls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all duration-200",
              dragOver
                ? "border-primary bg-primary/5 scale-[1.02]"
                : "border-border hover:border-primary/50 hover:bg-accent/30"
            )}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload Excel file"
            />
            <div
              className={cn(
                "mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors",
                dragOver
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">
              {dragOver
                ? "Drop your file here"
                : "Click to upload or drag and drop"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Excel files up to 10MB
            </p>
          </div>

          {/* Selected file */}
          {file && (
            <div className="flex items-center gap-3 rounded-xl bg-accent/50 p-3">
              <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setResult(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Upload button */}
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full rounded-xl h-11 shadow-lg shadow-primary/25"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Data
              </>
            )}
          </Button>

          {/* Result */}
          {result && (
            <div
              className={cn(
                "rounded-xl p-4",
                result.success
                  ? "bg-emerald-500/10 border border-emerald-500/20"
                  : "bg-red-500/10 border border-red-500/20"
              )}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      result.success
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-red-700 dark:text-red-300"
                    )}
                  >
                    {result.success
                      ? `Successfully imported ${result.imported} SKUs`
                      : result.message || "Import failed"}
                  </p>
                  {result.errors && result.errors.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {result.errors.map((err, i) => (
                        <li
                          key={i}
                          className="text-xs text-red-600 dark:text-red-400"
                        >
                          {err}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
