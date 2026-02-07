import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendSMS, isTwilioConfigured } from "@/lib/twilio";

// POST /api/sms/send - Send SMS to one or more recipients
export async function POST(req: NextRequest) {
  // Check Twilio configuration first
  if (!isTwilioConfigured()) {
    return NextResponse.json(
      {
        error: "SMS service is not configured",
        details:
          "Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.",
      },
      { status: 503 }
    );
  }

  // Parse and validate request body
  let recipients: string[];
  let body: string;
  try {
    const json = await req.json();
    recipients = json.recipients;
    body = json.body;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json(
      { error: "At least one recipient phone number is required" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "string" || body.trim().length === 0) {
    return NextResponse.json(
      { error: "Message body is required" },
      { status: 400 }
    );
  }

  if (body.length > 1600) {
    return NextResponse.json(
      { error: "Message body must be 1600 characters or fewer" },
      { status: 400 }
    );
  }

  // Cap recipients to prevent abuse
  if (recipients.length > 500) {
    return NextResponse.json(
      { error: "Cannot send to more than 500 recipients at once" },
      { status: 400 }
    );
  }

  const results = [];
  const trimmedBody = body.trim();

  for (const phone of recipients) {
    try {
      const result = await sendSMS(phone, trimmedBody);

      // Log success
      try {
        await prisma.messageLog.create({
          data: {
            to: phone,
            body: trimmedBody,
            status: result.status,
            sentBy: "system",
          },
        });
      } catch (logError) {
        console.error("Failed to log sent message:", logError);
        // Don't fail the send just because logging failed
      }

      results.push({ phone, status: "sent", sid: result.sid });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`SMS send failed for ${phone}:`, errorMessage);

      // Log failure
      try {
        await prisma.messageLog.create({
          data: {
            to: phone,
            body: trimmedBody,
            status: "failed",
            sentBy: "system",
          },
        });
      } catch (logError) {
        console.error("Failed to log failed message:", logError);
      }

      results.push({ phone, status: "failed", error: errorMessage });
    }
  }

  const sentCount = results.filter((r) => r.status === "sent").length;
  const failedCount = results.filter((r) => r.status === "failed").length;

  return NextResponse.json({
    results,
    summary: {
      total: results.length,
      sent: sentCount,
      failed: failedCount,
    },
  });
}
