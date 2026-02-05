import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendSMS } from "@/lib/twilio";

// POST /api/sms/send - Send SMS to one or more recipients
export async function POST(req: NextRequest) {
  const { recipients, body } = await req.json();

  if (!recipients?.length || !body) {
    return NextResponse.json(
      { error: "recipients and body are required" },
      { status: 400 }
    );
  }

  const results = [];

  for (const phone of recipients) {
    try {
      const result = await sendSMS(phone, body);
      await prisma.messageLog.create({
        data: {
          to: phone,
          body,
          status: result.status,
          sentBy: "system",
        },
      });
      results.push({ phone, status: "sent", sid: result.sid });
    } catch (error) {
      await prisma.messageLog.create({
        data: {
          to: phone,
          body,
          status: "failed",
          sentBy: "system",
        },
      });
      results.push({
        phone,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ results });
}
