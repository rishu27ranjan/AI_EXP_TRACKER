/** Sends an approved WhatsApp Business Cloud API template message. */
export async function sendWhatsAppTemplate(to: string, parameters: string[]) {
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
