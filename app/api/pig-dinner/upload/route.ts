import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV has no data rows" },
        { status: 400 }
      );
    }

    const allMembers = await prisma.member.findMany({
      where: {
        graduationYear: { gte: 2017, lte: 2024 },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    const membersByEmail = new Map(
      allMembers.map((m) => [m.email.toLowerCase(), m])
    );

    const membersByName = new Map(
      allMembers.map((m) => [
        `${m.firstName.toLowerCase()} ${m.lastName.toLowerCase()}`,
        m,
      ])
    );

    let matched = 0;
    let unmatched = 0;
    const unmatchedNames: string[] = [];

    for (const row of rows) {
      const email = row.email.toLowerCase().trim();
      const name = row.name.trim();

      let memberId: string | null = null;

      const emailMatch = membersByEmail.get(email);
      if (emailMatch) {
        memberId = emailMatch.id;
      } else {
        const nameKey = name.toLowerCase();
        const nameMatch = membersByName.get(nameKey);
        if (nameMatch) {
          memberId = nameMatch.id;
        }
      }

      if (memberId) {
        matched++;
      } else {
        unmatched++;
        unmatchedNames.push(name);
      }

      await prisma.pigDinnerTicket.upsert({
        where: { customerEmail: email },
        create: {
          customerName: name,
          customerEmail: email,
          purchaseDate: row.date,
          memberId,
        },
        update: {
          customerName: name,
          purchaseDate: row.date,
          memberId,
        },
      });
    }

    return NextResponse.json({
      total: rows.length,
      matched,
      unmatched,
      unmatchedNames,
    });
  } catch (error) {
    console.error("Pig dinner upload error:", error);
    const msg = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

interface CSVRow {
  date: Date;
  name: string;
  email: string;
}

function parseCSV(text: string): CSVRow[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 3) continue;

    const dateStr = fields[0].replace(/^"|"$/g, "").trim();
    const name = fields[1].replace(/^"|"$/g, "").trim();
    const email = fields[2].replace(/^"|"$/g, "").trim();

    if (!name || !email) continue;

    const date = parseFlexibleDate(dateStr);
    rows.push({ date, name, email });
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseFlexibleDate(str: string): Date {
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;
  return new Date();
}
