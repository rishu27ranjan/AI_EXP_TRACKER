import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { database } from "@/lib/db";
import { userId } from "@/lib/auth";

const timezoneSchema = z.string().min(1).max(60).refine(value => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; }
  catch { return false; }
}, "Invalid timezone.");
const schema = z.object({
  inAppEnabled: z.boolean().optional(), smsEnabled: z.boolean().optional(), whatsappEnabled: z.boolean().optional(),
  timezone: timezoneSchema.optional(), quietHoursEnabled: z.boolean().optional(),
  quietStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  quietEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  dailyReminder: z.boolean().optional(), weeklyReview: z.boolean().optional(), monthlyReview: z.boolean().optional(),
  savingsAlerts: z.boolean().optional(), upcomingAlerts: z.boolean().optional(), diwaliAlerts: z.boolean().optional(),
  sharedReminders: z.boolean().optional(),
});

export async function GET() {
  const uid = await userId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const pref = await (await database()).collection("notificationPreferences").findOne({ userId: uid });
    return NextResponse.json(pref || { userId: uid, inAppEnabled: true, smsEnabled: false, whatsappEnabled: false, timezone: "Asia/Kolkata", quietHoursEnabled: true, quietStart: "23:00", quietEnd: "07:00", dailyReminder: true, weeklyReview: true, monthlyReview: true, savingsAlerts: true, upcomingAlerts: true, diwaliAlerts: true, sharedReminders: true });
  } catch { return NextResponse.json({ error: "Unable to load preferences." }, { status: 500 }); }
}

export async function PATCH(req: Request) {
  const uid = await userId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification preferences." }, { status: 400 });
  try {
    const db = await database();
    if (parsed.data.smsEnabled || parsed.data.whatsappEnabled) {
      const user = ObjectId.isValid(uid) ? await db.collection("users").findOne({ _id: new ObjectId(uid) }, { projection: { phoneVerifiedAt: 1 } }) : null;
      if (!user?.phoneVerifiedAt) return NextResponse.json({ error: "Verify your phone before enabling SMS or WhatsApp." }, { status: 400 });
    }
    await db.collection("notificationPreferences").updateOne({ userId: uid }, { $set: { ...parsed.data, updatedAt: new Date() }, $setOnInsert: { userId: uid, createdAt: new Date() } }, { upsert: true });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to update preferences." }, { status: 500 }); }
}
