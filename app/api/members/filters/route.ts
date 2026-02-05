import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/members/filters - Get unique filter values
export async function GET() {
  const [industries, states, years, tags] = await Promise.all([
    prisma.member.findMany({
      where: { industry: { not: null } },
      select: { industry: true },
      distinct: ["industry"],
      orderBy: { industry: "asc" },
    }),
    prisma.member.findMany({
      where: { state: { not: null } },
      select: { state: true },
      distinct: ["state"],
      orderBy: { state: "asc" },
    }),
    prisma.member.findMany({
      where: { graduationYear: { not: null } },
      select: { graduationYear: true },
      distinct: ["graduationYear"],
      orderBy: { graduationYear: "desc" },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return NextResponse.json({
    industries: industries.map((i: { industry: string | null }) => i.industry).filter(Boolean),
    states: states.map((s: { state: string | null }) => s.state).filter(Boolean),
    years: years.map((y: { graduationYear: number | null }) => y.graduationYear).filter(Boolean),
    tags: tags.map((t: { name: string }) => t.name),
  });
}
