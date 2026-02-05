import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let client: twilio.Twilio | null = null;

function getClient(): twilio.Twilio {
  if (!client) {
    if (!accountSid || !authToken) {
      throw new Error("Twilio credentials are not configured");
    }
    client = twilio(accountSid, authToken);
  }
  return client;
}

// Format phone number to E.164 (e.g. +17202365673)
function formatPhoneNumber(phone: string): string {
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, "");
  // If already has country code (11 digits starting with 1), add +
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  // If 10 digits (US number without country code), add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  // If already has +, return as-is
  if (phone.startsWith("+")) {
    return phone;
  }
  // Fallback: return with + prefix
  return `+${digits}`;
}

export async function sendSMS(
  to: string,
  body: string
): Promise<{ sid: string; status: string }> {
  const twilioClient = getClient();
  const formattedTo = formatPhoneNumber(to);
  const message = await twilioClient.messages.create({
    body,
    from: fromNumber,
    to: formattedTo,
  });
  return { sid: message.sid, status: message.status };
}
