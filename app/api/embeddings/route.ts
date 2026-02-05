import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateEmbedding, buildMemberText } from "@/lib/gemini";

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
    let errors = 0;

    // Process in smaller batches with delays to avoid rate limits
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      try {
        const text = buildMemberText(member);
        const embedding = await generateEmbedding(text);
        const embeddingStr = `[${embedding.join(",")}]`;

        await prisma.$executeRawUnsafe(
          `UPDATE "Member" SET embedding = $1::vector WHERE id = $2`,
          embeddingStr,
          member.id
        );
        updated++;
        
        // Add small delay every 10 requests to avoid rate limits
        if (i > 0 && i % 10 === 0) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      } catch (err) {
        console.error(`Error embedding member ${member.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({ updated, errors, total: members.length });
  } catch (error) {
    console.error("Embedding generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate embeddings" },
      { status: 500 }
    );
  }
}
