import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/sms/history
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const [messages, total] = await Promise.all([
    prisma.messageLog.findMany({
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.messageLog.count(),
  ]);

  return NextResponse.json({
    messages,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
