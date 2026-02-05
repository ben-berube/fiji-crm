import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/sms/templates
export async function GET() {
  const templates = await prisma.messageTemplate.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(templates);
}

// POST /api/sms/templates
export async function POST(req: NextRequest) {
  const { name, body } = await req.json();

  if (!name || !body) {
    return NextResponse.json(
      { error: "name and body are required" },
      { status: 400 }
    );
  }

  const template = await prisma.messageTemplate.create({
    data: {
      name,
      body,
      createdBy: "system",
    },
  });

  return NextResponse.json(template, { status: 201 });
}
