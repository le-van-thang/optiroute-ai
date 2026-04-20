import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateOTP, sendVerificationEmail } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Không tìm thấy người dùng với email này." },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Tài khoản này đã được xác thực." },
        { status: 400 }
      );
    }

    const otp = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { email },
      data: {
        verificationCode: otp,
        codeExpires: expires,
      },
    });

    // Send verification email
    await sendVerificationEmail(email, otp);

    return NextResponse.json(
      { message: "Mã xác thực mới đã được gửi." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi gửi lại mã." },
      { status: 500 }
    );
  }
}
