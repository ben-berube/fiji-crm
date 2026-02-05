import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

export function buildMemberText(member: {
  firstName: string;
  lastName: string;
  graduationYear?: number | null;
  industry?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  city?: string | null;
  state?: string | null;
  major?: string | null;
  bio?: string | null;
  tags?: { name: string }[];
}): string {
  const parts = [
    `${member.firstName} ${member.lastName}`,
    member.graduationYear ? `Class of ${member.graduationYear}` : null,
    member.major ? `Major: ${member.major}` : null,
    member.industry ? `Industry: ${member.industry}` : null,
    member.company ? `Company: ${member.company}` : null,
    member.jobTitle ? `Role: ${member.jobTitle}` : null,
    member.city || member.state
      ? `Location: ${[member.city, member.state].filter(Boolean).join(", ")}`
      : null,
    member.bio ? `Bio: ${member.bio}` : null,
    member.tags && member.tags.length > 0
      ? `Tags: ${member.tags.map((t) => t.name).join(", ")}`
      : null,
  ];
  return parts.filter(Boolean).join(". ");
}
