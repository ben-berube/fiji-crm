import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/dashboard - Dashboard statistics
export async function GET() {
  const [
    totalMembers,
    activeMembers,
    alumniMembers,
    inactiveMembers,
    industries,
    states,
    recentMembers,
    messageCount,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { status: "ACTIVE" } }),
    prisma.member.count({ where: { status: "ALUMNI" } }),
    prisma.member.count({ where: { status: "INACTIVE" } }),
    prisma.member.groupBy({
      by: ["industry"],
      where: { industry: { not: null } },
      _count: { industry: true },
      orderBy: { _count: { industry: "desc" } },
      take: 10,
    }),
    prisma.member.groupBy({
      by: ["state"],
      where: { state: { not: null } },
      _count: { state: true },
      orderBy: { _count: { state: "desc" } },
      // No limit - return all states for heatmap
    }),
    prisma.member.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.messageLog.count(),
  ]);

  return NextResponse.json({
    counts: {
      total: totalMembers,
      active: activeMembers,
      alumni: alumniMembers,
      inactive: inactiveMembers,
    },
    industries: industries.map((i: { industry: string | null; _count: { industry: number } }) => ({
      name: i.industry ?? "Unknown",
      count: i._count.industry,
    })),
    states: states.map((s: { state: string | null; _count: { state: number } }) => ({
      name: s.state ?? "Unknown",
      count: s._count.state,
    })),
    recentMembers,
    messageCount,
  });
}
