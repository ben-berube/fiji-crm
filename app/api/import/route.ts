import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parse } from "csv-parse/sync";

// Flexible header mapping: lowercased/trimmed header -> Member field
const HEADER_MAP: Record<string, string> = {
  "first name": "firstName",
  firstname: "firstName",
  "first": "firstName",
  "last name": "lastName",
  lastname: "lastName",
  "last": "lastName",
  email: "email",
  "email address": "email",
  phone: "phone",
  "phone number": "phone",
  address: "address",
  city: "city",
  state: "state",
  zip: "zip",
  zipcode: "zip",
  "zip code": "zip",
  "graduation year": "graduationYear",
  "grad year": "graduationYear",
  class: "graduationYear",
  year: "graduationYear",
  major: "major",
  status: "status",
  company: "company",
  "job title": "jobTitle",
  jobtitle: "jobTitle",
  title: "jobTitle",
  position: "jobTitle",
  role: "jobTitle",
  industry: "industry",
  sector: "industry",
  linkedin: "linkedIn",
  "linkedin url": "linkedIn",
  bio: "bio",
  about: "bio",
  tags: "tags",
};

function normalizeHeader(header: string): string | null {
  const key = header.trim().toLowerCase();
  return HEADER_MAP[key] ?? null;
}

function parseStatus(raw: string): "ACTIVE" | "ALUMNI" | "INACTIVE" {
  const val = raw.trim().toUpperCase();
  if (val === "ALUMNI" || val === "ALUMNUS" || val === "ALUM") return "ALUMNI";
  if (val === "INACTIVE") return "INACTIVE";
  return "ACTIVE";
}

// POST /api/import - Import members from a Google Sheets URL
export async function POST(req: NextRequest) {
  const { sheetUrl } = await req.json();

  if (!sheetUrl) {
    return NextResponse.json(
      { error: "sheetUrl is required" },
      { status: 400 }
    );
  }

  // Extract sheet ID from URL
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    return NextResponse.json(
      {
        error:
          "Invalid Google Sheets URL. Expected format: https://docs.google.com/spreadsheets/d/...",
      },
      { status: 400 }
    );
  }

  const sheetId = match[1];
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

  try {
    // Fetch the sheet as CSV
    const csvResponse = await fetch(csvUrl);
    if (!csvResponse.ok) {
      return NextResponse.json(
        {
          error:
            "Failed to fetch the Google Sheet. Make sure it is shared as 'Anyone with the link can view'.",
        },
        { status: 400 }
      );
    }

    const csvText = await csvResponse.text();

    // Parse CSV
    const records: string[][] = parse(csvText, {
      skip_empty_lines: true,
      relax_column_count: true,
    });

    if (records.length < 2) {
      return NextResponse.json(
        { error: "Sheet must have a header row and at least one data row" },
        { status: 400 }
      );
    }

    // Map headers
    const rawHeaders = records[0];
    const columnMap: (string | null)[] = rawHeaders.map(normalizeHeader);

    // Check required fields
    const hasFirstName = columnMap.includes("firstName");
    const hasLastName = columnMap.includes("lastName");
    const hasEmail = columnMap.includes("email");

    if (!hasFirstName || !hasLastName || !hasEmail) {
      const missing = [];
      if (!hasFirstName) missing.push("First Name");
      if (!hasLastName) missing.push("Last Name");
      if (!hasEmail) missing.push("Email");
      return NextResponse.json(
        {
          error: `Missing required columns: ${missing.join(", ")}. Found headers: ${rawHeaders.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const dataRows = records.slice(1);
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2; // 1-indexed, accounting for header

      // Build a record from the row
      const record: Record<string, string> = {};
      for (let j = 0; j < columnMap.length; j++) {
        const field = columnMap[j];
        if (field && row[j]?.trim()) {
          record[field] = row[j].trim();
        }
      }

      // Validate required fields
      if (!record.firstName || !record.lastName || !record.email) {
        errors.push(`Row ${rowNum}: Missing required field (first name, last name, or email)`);
        skipped++;
        continue;
      }

      // Parse tags
      const tagNames = record.tags
        ? record.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      try {
        // Upsert by email
        await prisma.member.upsert({
          where: { email: record.email },
          update: {
            firstName: record.firstName,
            lastName: record.lastName,
            phone: record.phone || undefined,
            address: record.address || undefined,
            city: record.city || undefined,
            state: record.state || undefined,
            zip: record.zip || undefined,
            graduationYear: record.graduationYear
              ? parseInt(record.graduationYear)
              : undefined,
            major: record.major || undefined,
            status: record.status ? parseStatus(record.status) : undefined,
            company: record.company || undefined,
            jobTitle: record.jobTitle || undefined,
            industry: record.industry || undefined,
            linkedIn: record.linkedIn || undefined,
            bio: record.bio || undefined,
            tags: tagNames.length
              ? {
                  set: [],
                  connectOrCreate: tagNames.map((name) => ({
                    where: { name },
                    create: { name },
                  })),
                }
              : undefined,
          },
          create: {
            firstName: record.firstName,
            lastName: record.lastName,
            email: record.email,
            phone: record.phone || null,
            address: record.address || null,
            city: record.city || null,
            state: record.state || null,
            zip: record.zip || null,
            graduationYear: record.graduationYear
              ? parseInt(record.graduationYear)
              : null,
            major: record.major || null,
            status: record.status ? parseStatus(record.status) : "ACTIVE",
            company: record.company || null,
            jobTitle: record.jobTitle || null,
            industry: record.industry || null,
            linkedIn: record.linkedIn || null,
            bio: record.bio || null,
            tags: tagNames.length
              ? {
                  connectOrCreate: tagNames.map((name) => ({
                    where: { name },
                    create: { name },
                  })),
                }
              : undefined,
          },
        });
        imported++;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown error";
        errors.push(`Row ${rowNum} (${record.email}): ${msg}`);
        skipped++;
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      total: dataRows.length,
      errors: errors.slice(0, 20), // Cap error list
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to import from Google Sheets" },
      { status: 500 }
    );
  }
}
