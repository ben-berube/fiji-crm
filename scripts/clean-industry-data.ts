/**
 * One-time data cleanup: populate industry field for members with known companies.
 *
 * Uses a hardcoded mapping based on common knowledge of company industries.
 * Members with no company remain NULL (unknown professional info).
 * Members with unclassifiable companies get "N/A".
 *
 * Usage: npx tsx scripts/clean-industry-data.ts
 */

import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const COMPANY_TO_INDUSTRY: Record<string, string> = {
  "KPMG": "Professional Services",
  "CBRE": "Real Estate",
  "DoorDash, In.": "Technology",
  "Flexport": "Technology",
  "Colliers": "Real Estate",
  "Excelerate Energy": "Energy",
  "MIG Real Estate": "Real Estate",
  "YipitData": "Technology",
  "bttn": "Technology",
  "Verkada": "Technology",
  "Charles Schwab": "Finance",
  "Eastdil Secured": "Real Estate",
  "ASSA ABLOY": "Manufacturing",
  "Experian": "Finance",
  "Micron Technology": "Technology",
  "McDonald's Corporation": "Food & Beverage",
  "Bixby Capital Management": "Finance",
  "Springfield Farms": "Agriculture",
  "Menlo Equities": "Real Estate",
  "NTT Data": "Technology",
  "Jones Day": "Legal",
  "Cursor": "Technology",
  "Oracle": "Technology",
  "Booz Allen Hamilton": "Consulting",
  "Charter comm.": "Telecommunications",
  "ResMed": "Healthcare",
  "Ashton Thomas PWM": "Finance",
  "Endo Pharmaceuticals": "Healthcare",
  "Cushman & Wakefield": "Real Estate",
  "Reebok": "Retail",
  "CriticalPoint": "Consulting",
  "Salon Republic": "Real Estate",
  "StoreIT": "Technology",
  "Mission insurance Santa Barbara": "Insurance",
  "Westcord": "N/A",
  "WorldCast Anglers": "Outdoors & Recreation",
  "MBA Candidate - Berkeley Haas": "Education",
  "USC Law School": "Education",
  "University of Washington School of Medicine": "Education",
  "Law School (TBD where)": "Education",
  "Stealth Startup": "N/A",
  "Test": "N/A",
  "Straticon (land development/finance/construction)": "Real Estate",
};

async function main() {
  console.log("FIJI CRM - Industry Data Cleanup");
  console.log("=================================\n");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not set. Check .env.local");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    // Show current state
    const beforeResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(company) as with_company,
        COUNT(industry) as with_industry
      FROM "Member"
    `);
    const before = beforeResult.rows[0];
    console.log("Before cleanup:");
    console.log(`  Total members: ${before.total}`);
    console.log(`  With company: ${before.with_company}`);
    console.log(`  With industry: ${before.with_industry}`);
    console.log();

    // Get all members with a company but no industry (or wrong industry)
    const membersResult = await pool.query(`
      SELECT id, company, industry
      FROM "Member"
      WHERE company IS NOT NULL AND company != ''
      ORDER BY company
    `);

    let updated = 0;
    let skipped = 0;
    let alreadyCorrect = 0;

    for (const member of membersResult.rows) {
      const company = member.company?.trim();
      if (!company) {
        skipped++;
        continue;
      }

      const expectedIndustry = COMPANY_TO_INDUSTRY[company];
      if (!expectedIndustry) {
        console.log(`  [UNMAPPED] "${company}" - no mapping found, skipping`);
        skipped++;
        continue;
      }

      if (member.industry === expectedIndustry) {
        alreadyCorrect++;
        continue;
      }

      await pool.query(
        `UPDATE "Member" SET industry = $1, "updatedAt" = NOW() WHERE id = $2`,
        [expectedIndustry, member.id]
      );
      console.log(`  [UPDATED] "${company}" -> ${expectedIndustry}${member.industry ? ` (was: ${member.industry})` : ""}`);
      updated++;
    }

    console.log();
    console.log("=================================");
    console.log("Cleanup Summary:");
    console.log(`  Updated: ${updated}`);
    console.log(`  Already correct: ${alreadyCorrect}`);
    console.log(`  Skipped (no mapping): ${skipped}`);
    console.log();

    // Show final state
    const afterResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(company) as with_company,
        COUNT(industry) as with_industry
      FROM "Member"
    `);
    const after = afterResult.rows[0];
    console.log("After cleanup:");
    console.log(`  Total members: ${after.total}`);
    console.log(`  With company: ${after.with_company}`);
    console.log(`  With industry: ${after.with_industry}`);
    console.log();

    // Show industry distribution
    const distResult = await pool.query(`
      SELECT industry, COUNT(*) as cnt
      FROM "Member"
      WHERE industry IS NOT NULL
      GROUP BY industry
      ORDER BY cnt DESC
    `);
    console.log("Industry distribution:");
    for (const row of distResult.rows) {
      console.log(`  ${row.industry}: ${row.cnt}`);
    }

    console.log("\nDone!");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
