import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { sendResetPasswordEmail } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // For security, don't reveal if user exists or not
      return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
    }

    // Generate token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    
    // Set expiry (1 hour)
    const expires = new Date(Date.now() + 3600000);

    await prisma.user.update({
      where: { email },
      data: {
        resetToken: hashedToken,
        resetTokenExpires: expires,
      },
    });

    // Send email
    await sendResetPasswordEmail(email, rawToken);

    return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
  } catch (error: any) {
    console.error("Reset password request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
