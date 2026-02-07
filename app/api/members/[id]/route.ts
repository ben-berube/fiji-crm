import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { indexMember } from "@/lib/member-indexing";

// GET /api/members/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const member = await prisma.member.findUnique({
    where: { id },
    include: { tags: true, user: { select: { image: true } } },
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json(member);
}

// PUT /api/members/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // Disconnect all existing tags and reconnect
  const member = await prisma.member.update({
    where: { id },
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
      status,
      company,
      jobTitle,
      industry,
      linkedIn,
      bio,
      tags: tags
        ? {
            set: [],
            connectOrCreate: tags.map((tag: string) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          }
        : undefined,
    },
    include: { tags: true },
  });

  // Fire-and-forget: re-index the updated member (refresh embedding + maybe infer industry)
  indexMember(member.id).catch((err) =>
    console.error("Background re-indexing failed for member:", err)
  );

  return NextResponse.json(member);
}

// DELETE /api/members/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.member.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
