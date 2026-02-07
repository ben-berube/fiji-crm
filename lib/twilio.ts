import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let client: twilio.Twilio | null = null;

/** Check if Twilio is fully configured */
export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && fromNumber);
}

function getClient(): twilio.Twilio {
  if (!client) {
    if (!accountSid || !authToken) {
      throw new Error(
        "Twilio credentials are not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables."
      );
    }
    client = twilio(accountSid, authToken);
  }
  return client;
}

/** Format phone number to E.164 (e.g. +17202365673). Returns null if invalid. */
export function formatPhoneNumber(phone: string): string | null {
  if (!phone || typeof phone !== "string") return null;

  // Strip all non-digit characters except leading +
  const cleaned = phone.trim();
  const digits = cleaned.replace(/\D/g, "");

  // Must have at least 10 digits
  if (digits.length < 10) return null;

  // If already has country code (11 digits starting with 1), add +
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  // If 10 digits (US number without country code), add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  // If already has +, return as-is
  if (cleaned.startsWith("+") && digits.length >= 10) {
    return `+${digits}`;
  }

  // Can't determine format
  return null;
}

export async function sendSMS(
  to: string,
  body: string
): Promise<{ sid: string; status: string }> {
  // Validate configuration
  if (!isTwilioConfigured()) {
    throw new Error(
      "Twilio is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER."
    );
  }

  // Validate inputs
  if (!to || !body) {
    throw new Error("Both 'to' phone number and message 'body' are required.");
  }

  const formattedTo = formatPhoneNumber(to);
  if (!formattedTo) {
    throw new Error(
      `Invalid phone number: "${to}". Must be a valid US phone number (10+ digits).`
    );
  }

  if (body.length > 1600) {
    throw new Error(
      `Message too long (${body.length} chars). SMS messages must be 1600 characters or fewer.`
    );
  }

  try {
    const twilioClient = getClient();
    const message = await twilioClient.messages.create({
      body,
      from: fromNumber,
      to: formattedTo,
    });
    return { sid: message.sid, status: message.status };
  } catch (error) {
    // Provide clearer error messages for common Twilio errors
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("authenticate") || msg.includes("credentials")) {
        throw new Error(
          "Twilio authentication failed. Please verify your Account SID and Auth Token."
        );
      }
      if (msg.includes("unverified") || msg.includes("not a valid phone")) {
        throw new Error(
          `Cannot send to "${to}". The number may be invalid or your Twilio account may need to verify it first (trial accounts can only send to verified numbers).`
        );
      }
      if (msg.includes("from") && msg.includes("not a valid")) {
        throw new Error(
          `The sending phone number (${fromNumber}) is not valid. Please verify TWILIO_PHONE_NUMBER.`
        );
      }
    }
    throw error;
  }
}
