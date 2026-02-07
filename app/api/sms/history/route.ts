import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/sms/history
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "50") || 50)
    );

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
  } catch (error) {
    console.error("Failed to fetch message history:", error);
    return NextResponse.json(
      {
        messages: [],
        total: 0,
        page: 1,
        totalPages: 0,
        error: "Failed to load message history",
      },
      { status: 500 }
    );
  }
}
