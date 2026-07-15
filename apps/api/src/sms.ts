import twilio from "twilio";

type SendOtpResult = {
  deliveryMode: "twilio" | "preview";
  sid?: string;
  reason?: string;
};

function isConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
  );
}

export async function sendQueueAlertSms(to: string, body: string): Promise<SendOtpResult> {
  if (!isConfigured()) {
    return {
      deliveryMode: "preview",
      reason: "Twilio is not fully configured. Using local SMS preview."
    };
  }

  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID as string,
      process.env.TWILIO_AUTH_TOKEN as string
    );

    const message = await client.messages.create({
      to,
      from: process.env.TWILIO_FROM_NUMBER as string,
      body
    });

    return {
      deliveryMode: "twilio",
      sid: message.sid
    };
  } catch (error) {
    return {
      deliveryMode: "preview",
      reason: error instanceof Error ? error.message : "Twilio send failed. Using preview mode."
    };
  }
}

export async function sendOtpSms(to: string, code: string): Promise<SendOtpResult> {
  return sendQueueAlertSms(to, `Your Q-App verification code is ${code}. It expires in 10 minutes.`);
}
