import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { indexMember, getIndexedMemberIds } from "@/lib/member-indexing";

// GET /api/members - List all members with optional filters
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const industry = searchParams.get("industry") ?? "";
  const state = searchParams.get("state") ?? "";
  const year = searchParams.get("year") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
      { jobTitle: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (industry) {
    where.industry = { contains: industry, mode: "insensitive" };
  }

  if (state) {
    where.state = { contains: state, mode: "insensitive" };
  }

  if (year) {
    where.graduationYear = parseInt(year);
  }

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      include: { tags: true },
      orderBy: { lastName: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.member.count({ where }),
  ]);

  // Annotate members with embedding/indexing status
  const memberIds = members.map((m) => m.id);
  const indexedIds = await getIndexedMemberIds(memberIds);

  const membersWithStatus = members.map((m) => ({
    ...m,
    isIndexed: indexedIds.has(m.id),
  }));

  return NextResponse.json({
    members: membersWithStatus,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// POST /api/members - Create a new member
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    firstName,
    lastName,
    email,
    phone,
    address,
    city,
    state,
    zip,
    graduationYear,
    major,
    status,
    company,
    jobTitle,
    industry,
    linkedIn,
    bio,
    tags,
  } = body;

  if (!firstName || !lastName || !email) {
    return NextResponse.json(
      { error: "firstName, lastName, and email are required" },
      { status: 400 }
    );
  }

  const member = await prisma.member.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      zip,
      graduationYear: graduationYear ? parseInt(graduationYear) : null,
      major,
      status: status || "ACTIVE",
      company,
      jobTitle,
      industry,
      linkedIn,
      bio,
      tags: tags?.length
        ? {
            connectOrCreate: tags.map((tag: string) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          }
        : undefined,
    },
    include: { tags: true },
  });

  // Fire-and-forget: auto-index the new member (generate embedding + infer industry)
  indexMember(member.id).catch((err) =>
    console.error("Background indexing failed for new member:", err)
  );

  return NextResponse.json({ ...member, isIndexed: false }, { status: 201 });
}
