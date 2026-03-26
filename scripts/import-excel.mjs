/**
 * One-time import script: reads the Excel file and inserts data into Supabase.
 *
 * Usage:
 *   node scripts/import-excel.mjs
 *
 * Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set
 * in your .env.local file.
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import { config } from "dotenv";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase env vars. Check your .env.local file.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FILE_PATH = "./Alya - Listing Sheet.xlsx";

function formatValue(val) {
  if (val === null || val === undefined || val === "") return "Not Listed";
  const str = String(val).trim();
  if (str === "0" || str === "0.0") return "Not Listed";
  if (/^\d+\.0$/.test(str)) return str.replace(".0", "");
  return str || "Not Listed";
}

async function main() {
  console.log("Reading Excel file...");
  const buffer = readFileSync(FILE_PATH);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  console.log(`Found ${rawData.length} rows in sheet "${sheetName}"`);

  const skus = rawData
    .map((row) => ({
      id: Number(row["SKU"] || row["sku"] || row["Id"] || row["id"] || row["ID"]),
      amazon: formatValue(row["Amazon"] || row["amazon"]),
      flipkart: formatValue(row["Flipkart"] || row["flipkart"]),
      meesho: formatValue(row["Meesho"] || row["meesho"]),
      myntra: formatValue(row["Myntra"] || row["myntra"]),
      stock:
        row["Stock"] !== undefined && row["Stock"] !== ""
          ? Number(row["Stock"])
          : null,
    }))
    .filter((s) => !isNaN(s.id) && s.id > 0);

  console.log(`Importing ${skus.length} valid SKUs...`);

  const { error } = await supabase.from("skus").upsert(skus, { onConflict: "id" });

  if (error) {
    console.error("Import failed:", error.message);
    process.exit(1);
  }

  console.log(`Successfully imported ${skus.length} SKUs!`);
}

main();
