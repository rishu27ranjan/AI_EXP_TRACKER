import { describe, expect, it } from "vitest";
import { shouldSendWhatsAppPaymentReminder, WHATSAPP_REMINDER_INTERVAL_MS } from "./reminders";

describe("48-hour WhatsApp payment reminder cadence", () => {
  const start = new Date("2026-10-01T12:00:00Z");
  const at = (hours: number) => new Date(start.getTime() + hours * 60 * 60 * 1000);

  it("waits 48 hours before the first reminder", () => {
    expect(WHATSAPP_REMINDER_INTERVAL_MS).toBe(48 * 60 * 60 * 1000);
    expect(shouldSendWhatsAppPaymentReminder({ status: "pending", createdAt: start, now: at(47.99) })).toBe(false);
    expect(shouldSendWhatsAppPaymentReminder({ status: "pending", createdAt: start, now: at(48) })).toBe(true);
  });

  it("waits 48 hours after each successful reminder", () => {
    expect(shouldSendWhatsAppPaymentReminder({ status: "accepted", createdAt: start, lastSentAt: at(48), now: at(95.99) })).toBe(false);
    expect(shouldSendWhatsAppPaymentReminder({ status: "accepted", createdAt: start, lastSentAt: at(48), now: at(96) })).toBe(true);
  });

  it("stops when the request is closed", () => {
    expect(shouldSendWhatsAppPaymentReminder({ status: "settled", createdAt: start, now: at(96) })).toBe(false);
    expect(shouldSendWhatsAppPaymentReminder({ status: "cancelled", createdAt: start, now: at(96) })).toBe(false);
  });
});
