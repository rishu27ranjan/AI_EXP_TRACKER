/** Sends an approved WhatsApp template through Twilio or Meta Cloud API. */
export async function sendWhatsAppTemplate(to: string, parameters: string[]) {
  const provider = (process.env.WHATSAPP_PROVIDER || "meta").toLowerCase();
  if (provider === "twilio") {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;
    if (!sid || !authToken || !from || !contentSid) {
      throw new Error("Twilio WhatsApp is not configured with an approved content template.");
    }
    const recipient = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    const sender = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
    const body = new URLSearchParams({
      To: recipient,
      From: sender,
      ContentSid: contentSid,
      ContentVariables: JSON.stringify(Object.fromEntries(parameters.map((value, index) => [String(index + 1), value.slice(0, 500)]))),
    });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error("Twilio WhatsApp rejected the message.");
    return { provider: "twilio-whatsapp", messageId: String(data.sid || "") };
  }
  if (provider !== "meta") throw new Error("Set WHATSAPP_PROVIDER to twilio or meta.");
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_REMINDER_TEMPLATE;
  const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en";
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v22.0";
  if (!token || !phoneNumberId || !templateName) {
    throw new Error("WhatsApp Cloud API is not configured.");
  }
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        components: [{
          type: "body",
          parameters: parameters.map(text => ({ type: "text", text: text.slice(0, 500) })),
        }],
      },
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("WhatsApp provider rejected the message.");
  return { provider: "whatsapp-cloud", messageId: String(data.messages?.[0]?.id || "") };
}
