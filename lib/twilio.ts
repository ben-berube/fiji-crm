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

export async function sendSMS(
  to: string,
  body: string
): Promise<{ sid: string; status: string }> {
  const twilioClient = getClient();
  const message = await twilioClient.messages.create({
    body,
    from: fromNumber,
    to,
  });
  return { sid: message.sid, status: message.status };
}
