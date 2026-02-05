/**
 * One-time seed script to import FIJI Graduate Contact List
 * 
 * Usage: npx tsx scripts/seed-members.ts
 */

import { config } from "dotenv";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1IUaLlB-xhuil8MR9bBgYnN9NYUwNpN1xWbx3we8JjUM/export?format=csv";

// Create Prisma client with adapter
function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

interface MemberData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  graduationYear: number | null;
  industry: string | null;
  status: "ACTIVE" | "ALUMNI";
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

function splitLocation(location: string): { city: string | null; state: string | null } {
  if (!location || !location.trim()) {
    return { city: null, state: null };
  }
  
  const parts = location.split(",").map(s => s.trim());
  if (parts.length >= 2) {
    return { city: parts[0] || null, state: parts[1] || null };
  }
  // If no comma, assume it's just a city
  return { city: parts[0] || null, state: null };
}

function cleanPhone(phone: string): string | null {
  if (!phone || !phone.trim()) return null;
  // Remove any non-digit characters except for leading +
  const cleaned = phone.trim().replace(/[^\d+]/g, "");
  return cleaned || null;
}

function parseGraduationYear(year: string): number | null {
  if (!year || !year.trim()) return null;
  const parsed = parseInt(year.trim(), 10);
  return isNaN(parsed) ? null : parsed;
}

async function main() {
  console.log("🏛️  FIJI Graduate Contact List Import");
  console.log("=====================================\n");

  // Fetch CSV
  console.log("📥 Fetching data from Google Sheets...");
  const response = await fetch(SHEET_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
  }
  const csvText = await response.text();
  console.log("✅ Data fetched successfully\n");

  // Parse CSV
  const records: string[][] = parse(csvText, {
    skip_empty_lines: false, // Keep empty lines to detect sections
    relax_column_count: true,
  });

  console.log(`📊 Total rows in sheet: ${records.length}`);

  // Column indices based on the header
  // Header: Name (first and last), Phone Number, Personal Email, Graduation Year, Current City and State, Profession/Industry, Birthdate, Initiation Date
  const COL_NAME = 0;
  const COL_PHONE = 1;
  const COL_EMAIL = 2;
  const COL_YEAR = 3;
  const COL_LOCATION = 4;
  const COL_INDUSTRY = 5;

  // Skip header row
  const dataRows = records.slice(1);

  let currentStatus: "ALUMNI" | "ACTIVE" = "ALUMNI"; // Start with Alumni section
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const members: MemberData[] = [];

  console.log("\n🔄 Processing rows...\n");

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2; // Account for header and 1-indexing
    const name = row[COL_NAME]?.trim() || "";

    // Skip empty rows
    if (!name) {
      continue;
    }

    // Detect section headers
    if (name === "Alumni" || name.toLowerCase() === "alumni") {
      currentStatus = "ALUMNI";
      console.log(`📌 Section: ALUMNI (row ${rowNum})`);
      continue;
    }
    if (name === "Actives" || name.toLowerCase() === "actives") {
      currentStatus = "ACTIVE";
      console.log(`📌 Section: ACTIVE (row ${rowNum})`);
      continue;
    }

    // Get email - required field
    const email = row[COL_EMAIL]?.trim() || "";
    if (!email || !email.includes("@")) {
      // Skip rows without valid email
      skipped++;
      continue;
    }

    // Parse the row
    const { firstName, lastName } = splitName(name);
    const phone = cleanPhone(row[COL_PHONE] || "");
    const graduationYear = parseGraduationYear(row[COL_YEAR] || "");
    const { city, state } = splitLocation(row[COL_LOCATION] || "");
    const industry = row[COL_INDUSTRY]?.trim() || null;

    // Validate required fields
    if (!firstName) {
      errors.push(`Row ${rowNum}: Could not parse name from "${name}"`);
      skipped++;
      continue;
    }

    members.push({
      firstName,
      lastName: lastName || firstName, // Use firstName as lastName if missing
      email,
      phone,
      city,
      state,
      graduationYear,
      industry,
      status: currentStatus,
    });
  }

  console.log(`\n📝 Found ${members.length} valid members to import\n`);

  // Import to database
  console.log("💾 Importing to database...\n");

  for (const member of members) {
    try {
      const existing = await prisma.member.findUnique({
        where: { email: member.email },
      });

      if (existing) {
        await prisma.member.update({
          where: { email: member.email },
          data: {
            firstName: member.firstName,
            lastName: member.lastName,
            phone: member.phone,
            city: member.city,
            state: member.state,
            graduationYear: member.graduationYear,
            industry: member.industry,
            status: member.status,
          },
        });
        updated++;
      } else {
        await prisma.member.create({
          data: {
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            phone: member.phone,
            city: member.city,
            state: member.state,
            graduationYear: member.graduationYear,
            industry: member.industry,
            status: member.status,
          },
        });
        imported++;
      }

      // Progress indicator every 50 records
      if ((imported + updated) % 50 === 0) {
        console.log(`  Progress: ${imported + updated}/${members.length}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`${member.email}: ${msg}`);
      skipped++;
    }
  }

  // Summary
  console.log("\n=====================================");
  console.log("📊 Import Summary");
  console.log("=====================================");
  console.log(`✅ New members created: ${imported}`);
  console.log(`🔄 Existing members updated: ${updated}`);
  console.log(`⏭️  Skipped (no email): ${skipped}`);
  console.log(`❌ Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log("\n❌ Errors encountered:");
    errors.slice(0, 10).forEach((e) => console.log(`   - ${e}`));
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more`);
    }
  }

  console.log("\n✨ Import complete!");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
