import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read the Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

    if (!rawData || rawData.length === 0) {
      return NextResponse.json(
        { error: "No data found in spreadsheet" },
        { status: 400 }
      );
    }

    // Map the data
    const skus = rawData.map((row) => {
      // Try different column name patterns
      const id =
        row["SKU"] || row["sku"] || row["Id"] || row["id"] || row["ID"];
      const amazon =
        row["Amazon"] || row["amazon"] || row["AMAZON"] || "";
      const flipkart =
        row["Flipkart"] || row["flipkart"] || row["FLIPKART"] || "";
      const meesho =
        row["Meesho"] || row["meesho"] || row["MEESHO"] || "";
      const myntra =
        row["Myntra"] || row["myntra"] || row["MYNTRA"] || "";
      const stock =
        row["Stock"] || row["stock"] || row["STOCK"] || null;

      // Format values
      const formatValue = (val: unknown): string => {
        if (val === null || val === undefined || val === "") return "Not Listed";
        const str = String(val).trim();
        if (str === "0" || str === "0.0") return "Not Listed";
        // Remove trailing .0 from numeric strings
        if (/^\d+\.0$/.test(str)) return str.replace(".0", "");
        return str || "Not Listed";
      };

      return {
        id: Number(id),
        amazon: formatValue(amazon),
        flipkart: formatValue(flipkart),
        meesho: formatValue(meesho),
        myntra: formatValue(myntra),
        stock: stock !== null && stock !== "" ? Number(stock) : null,
      };
    });

    // Filter out invalid rows
    const validSkus = skus.filter(
      (s: { id: number }) => !isNaN(s.id) && s.id > 0
    );

    if (validSkus.length === 0) {
      return NextResponse.json(
        { error: "No valid SKU rows found. Make sure there is an 'SKU' or 'id' column." },
        { status: 400 }
      );
    }

    // Upsert into Supabase
    const { error } = await supabase
      .from("skus")
      .upsert(validSkus, { onConflict: "id" });

    if (error) {
      console.error("Supabase upsert error:", error);
      return NextResponse.json(
        { error: "Database error: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: validSkus.length,
    });
  } catch (error: unknown) {
    console.error("Import error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Import failed: " + message },
      { status: 500 }
    );
  }
}
