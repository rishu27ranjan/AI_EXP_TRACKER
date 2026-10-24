import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { MongoServerError } from "mongodb";
import { z } from "zod";
import { database } from "@/lib/db";
import { createSession } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  let body: unknown;

  let insertedUserId: import("mongodb").ObjectId | undefined;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a name, valid email and password with at least 8 characters." },
      { status: 400 },
    );
  }

  const { name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  try {
    const db = await database();
    const users = db.collection("users");

    if (await users.findOne({ email }, { projection: { _id: 1 } })) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const now = new Date();
    const result = await users.insertOne({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      currency: "INR",
      createdAt: now,
      updatedAt: now,
    });
    insertedUserId = result.insertedId;

    await db.collection("profiles").insertOne({
      userId: String(result.insertedId),
      monthlyIncome: 120000,
      savingsTarget: 65000,
      emergencyBuffer: 5000,
      createdAt: now,
      updatedAt: now,
    });

    const token = await createSession(String(result.insertedId));
    const response = NextResponse.json({ ok: true });
    response.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    // Do not leave an account that can never finish onboarding if profile setup fails.
    if (insertedUserId) {
      try {
        await (await database()).collection("users").deleteOne({ _id: insertedUserId });
      } catch (cleanupError) {
        console.error("Could not clean up incomplete registration:", cleanupError);
      }
    }

    // The unique email index is the source of truth when two registrations race.
    if (error instanceof MongoServerError && error.code === 11000) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    console.error("Registration failed:", error);
    return NextResponse.json(
      { error: "Unable to create account. Check the server logs and database configuration." },
      { status: 500 },
    );
  }
}
