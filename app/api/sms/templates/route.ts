import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/sms/templates
export async function GET() {
  try {
    const templates = await prisma.messageTemplate.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/sms/templates
export async function POST(req: NextRequest) {
  let name: string;
  let body: string;
  try {
    const json = await req.json();
    name = json.name;
    body = json.body;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Template name is required" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "string" || body.trim().length === 0) {
    return NextResponse.json(
      { error: "Template body is required" },
      { status: 400 }
    );
  }

  try {
    const template = await prisma.messageTemplate.create({
      data: {
        name: name.trim(),
        body: body.trim(),
        createdBy: "system",
      },
    });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Failed to create template:", error);
    const isDuplicate =
      error instanceof Error && error.message.includes("Unique constraint");
    return NextResponse.json(
      {
        error: isDuplicate
          ? `A template named "${name.trim()}" already exists`
          : "Failed to create template",
      },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
