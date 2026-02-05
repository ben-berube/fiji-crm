import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateEmbedding, buildMemberText } from "@/lib/openai";

// POST /api/embeddings - Generate embeddings for a specific member or all members
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const memberId = body.memberId;

  try {
    const members = memberId
      ? await prisma.member.findMany({
          where: { id: memberId },
          include: { tags: true },
        })
      : await prisma.member.findMany({ include: { tags: true } });

    let updated = 0;

    for (const member of members) {
      const text = buildMemberText(member);
      const embedding = await generateEmbedding(text);
      const embeddingStr = `[${embedding.join(",")}]`;

      await prisma.$executeRawUnsafe(
        `UPDATE "Member" SET embedding = $1::vector WHERE id = $2`,
        embeddingStr,
        member.id
      );
      updated++;
    }

    return NextResponse.json({ updated });
  } catch (error) {
    console.error("Embedding generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate embeddings" },
      { status: 500 }
    );
  }
}
