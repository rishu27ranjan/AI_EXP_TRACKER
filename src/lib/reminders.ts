export const WHATSAPP_REMINDER_INTERVAL_MS = 48 * 60 * 60 * 1000;

export function shouldSendWhatsAppPaymentReminder(input: {
  status: string;
  createdAt: Date;
  lastSentAt?: Date | null;
  now: Date;
}) {
  if (input.status !== "pending" && input.status !== "accepted") return false;
  if (input.now.getTime() - input.createdAt.getTime() < WHATSAPP_REMINDER_INTERVAL_MS) return false;
  return !input.lastSentAt || input.now.getTime() - input.lastSentAt.getTime() >= WHATSAPP_REMINDER_INTERVAL_MS;
}
