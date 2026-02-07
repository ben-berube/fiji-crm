import { prisma } from "@/lib/db";
import { generateEmbedding, buildMemberText } from "@/lib/gemini";

/**
 * Infer industry from company name using Gemini.
 * Returns a short industry label or null if it can't determine one.
 */
async function inferIndustry(company: string): Promise<string | null> {
  if (!company || !process.env.GEMINI_API_KEY) return null;

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(
      `Given the company name "${company}", respond with ONLY the industry sector it belongs to. Use a short, standard industry label (e.g., "Technology", "Finance", "Healthcare", "Consulting", "Real Estate", "Education", "Government", "Retail", "Manufacturing", "Legal", "Media", "Energy", "Hospitality", "Transportation", "Nonprofit", "Agriculture"). If you genuinely cannot determine the industry, respond with just "Other". Do not include any explanation, just the industry name.`
    );

    const text = result.response.text().trim();
    // Sanity check: should be a short label, not a paragraph
    if (text && text.length < 50 && !text.includes("\n")) {
      return text;
    }
    return null;
  } catch (error) {
    console.warn("Industry inference failed for company:", company, error);
    return null;
  }
}

/**
 * Index a single member: generate embedding and optionally infer industry.
 * This is safe to call fire-and-forget — errors are caught and logged.
 */
export async function indexMember(memberId: string): Promise<void> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("Skipping member indexing: GEMINI_API_KEY not set");
      return;
    }

    // Fetch the member with tags
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { tags: true },
    });

    if (!member) {
      console.warn(`Member ${memberId} not found for indexing`);
      return;
    }

    // Infer industry from company if industry is missing but company exists
    if (!member.industry && member.company) {
      try {
        const industry = await inferIndustry(member.company);
        if (industry) {
          await prisma.member.update({
            where: { id: memberId },
            data: { industry },
          });
          // Update local reference for embedding text
          member.industry = industry;
        }
      } catch (err) {
        console.warn(`Industry inference failed for member ${memberId}:`, err);
        // Non-fatal — continue with embedding
      }
    }

    // Generate embedding
    const text = buildMemberText(member);
    const embedding = await generateEmbedding(text);
    const embeddingStr = `[${embedding.join(",")}]`;

    await prisma.$executeRawUnsafe(
      `UPDATE "Member" SET embedding = $1::vector WHERE id = $2`,
      embeddingStr,
      memberId
    );

    console.log(`Indexed member ${memberId} (${member.firstName} ${member.lastName})`);
  } catch (error) {
    console.error(`Failed to index member ${memberId}:`, error);
    // Don't throw — this runs in the background
  }
}

/**
 * Index multiple members. Processes sequentially with small delays to avoid rate limits.
 */
export async function indexMembers(memberIds: string[]): Promise<{ indexed: number; failed: number }> {
  let indexed = 0;
  let failed = 0;

  for (let i = 0; i < memberIds.length; i++) {
    try {
      await indexMember(memberIds[i]);
      indexed++;
    } catch {
      failed++;
    }

    // Rate limit: pause every 5 members
    if (i > 0 && i % 5 === 0) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return { indexed, failed };
}

/**
 * Check which member IDs from a list have embeddings.
 * Returns a Set of member IDs that are indexed.
 */
export async function getIndexedMemberIds(memberIds: string[]): Promise<Set<string>> {
  if (memberIds.length === 0) return new Set();

  try {
    const placeholders = memberIds.map((_, i) => `$${i + 1}`).join(", ");
    const results = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "Member" WHERE id IN (${placeholders}) AND embedding IS NOT NULL`,
      ...memberIds
    );
    return new Set(results.map((r) => r.id));
  } catch (error) {
    console.warn("Failed to check indexed member IDs:", error);
    return new Set();
  }
}
