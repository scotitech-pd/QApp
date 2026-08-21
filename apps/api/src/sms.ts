import twilio from "twilio";

/* Customer messaging providers. Selected by env:
 *   NOTIFY_SMS_PROVIDER = twilio | msg91 | preview   (default: auto-detect)
 *   WhatsApp (Meta Cloud API) is tried first for queue alerts when configured.
 * India note: transactional SMS via MSG91 needs DLT-registered templates;
 * WhatsApp Business needs an approved template for out-of-session messages. */

export type DeliveryMode = "twilio" | "msg91" | "whatsapp" | "preview";

export type SendOtpResult = {
  deliveryMode: DeliveryMode;
  sid?: string;
  reason?: string;
};

function twilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

function msg91Configured() {
  return Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_SENDER_ID && process.env.MSG91_TEMPLATE_ID);
}

function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

function resolveSmsProvider(): "twilio" | "msg91" | "preview" {
  const forced = process.env.NOTIFY_SMS_PROVIDER;
  if (forced === "twilio" || forced === "msg91" || forced === "preview") return forced;
  if (twilioConfigured()) return "twilio";
  if (msg91Configured()) return "msg91";
  return "preview";
}

function digitsOnly(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

async function sendViaTwilio(to: string, body: string): Promise<SendOtpResult> {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID as string, process.env.TWILIO_AUTH_TOKEN as string);
  const message = await client.messages.create({ to, from: process.env.TWILIO_FROM_NUMBER as string, body });
  return { deliveryMode: "twilio", sid: message.sid };
}

// MSG91 Flow API — the DLT template carries the copy; we pass variables.
async function sendViaMsg91(to: string, body: string): Promise<SendOtpResult> {
  const response = await fetch("https://control.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: { "content-type": "application/json", authkey: process.env.MSG91_AUTH_KEY as string },
    body: JSON.stringify({
      template_id: process.env.MSG91_TEMPLATE_ID,
      sender: process.env.MSG91_SENDER_ID,
      short_url: "0",
      recipients: [{ mobiles: digitsOnly(to), message: body }]
    })
  });
  const payload = (await response.json().catch(() => ({}))) as { type?: string; message?: string };
  if (!response.ok || payload.type === "error") {
    throw new Error(payload.message ?? `MSG91 responded ${response.status}`);
  }
  return { deliveryMode: "msg91", sid: payload.message };
}

// WhatsApp Cloud API. Uses a template when WHATSAPP_TEMPLATE_NAME is set
// (required outside a 24h customer session), otherwise plain text.
export async function sendWhatsApp(to: string, body: string): Promise<SendOtpResult | null> {
  if (!whatsappConfigured()) return null;
  const template = process.env.WHATSAPP_TEMPLATE_NAME;
  const payload = template
    ? {
        messaging_product: "whatsapp",
        to: digitsOnly(to),
        type: "template",
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "en" },
          components: [{ type: "body", parameters: [{ type: "text", text: body }] }]
        }
      }
    : { messaging_product: "whatsapp", to: digitsOnly(to), type: "text", text: { body } };

  const response = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
    body: JSON.stringify(payload)
  });
  const data = (await response.json().catch(() => ({}))) as { messages?: Array<{ id: string }>; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(data.error?.message ?? `WhatsApp responded ${response.status}`);
  }
  return { deliveryMode: "whatsapp", sid: data.messages?.[0]?.id };
}

export async function sendQueueAlertSms(to: string, body: string): Promise<SendOtpResult> {
  // WhatsApp first for alerts — cheaper and read faster in India.
  if (whatsappConfigured()) {
    try {
      const result = await sendWhatsApp(to, body);
      if (result) return result;
    } catch (error) {
      console.warn("[notify] WhatsApp failed, falling back to SMS:", error instanceof Error ? error.message : error);
    }
  }

  const provider = resolveSmsProvider();
  if (provider === "preview") {
    return { deliveryMode: "preview", reason: "No SMS provider configured. Using local preview." };
  }

  try {
    return provider === "twilio" ? await sendViaTwilio(to, body) : await sendViaMsg91(to, body);
  } catch (error) {
    return {
      deliveryMode: "preview",
      reason: error instanceof Error ? `${provider} send failed: ${error.message}` : `${provider} send failed.`
    };
  }
}

export async function sendOtpSms(to: string, code: string): Promise<SendOtpResult> {
  // OTPs go by SMS only (WhatsApp OTP templates are a separate approval).
  const provider = resolveSmsProvider();
  const body = `Your OnQ verification code is ${code}. It expires in 10 minutes.`;
  if (provider === "preview") {
    return { deliveryMode: "preview", reason: "No SMS provider configured. Using local preview." };
  }
  try {
    return provider === "twilio" ? await sendViaTwilio(to, body) : await sendViaMsg91(to, body);
  } catch (error) {
    return { deliveryMode: "preview", reason: error instanceof Error ? error.message : "SMS send failed." };
  }
}
