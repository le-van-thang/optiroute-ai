import { NextResponse, NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { generateOTP, sendVerificationEmail } from "@/lib/notifications";
import { validateEmail } from "@/lib/validation";

// GET: Kiểm tra xem tài khoản có bị xóa vĩnh viễn không
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) return NextResponse.json({ isDeleted: false });

  const deletedRecord = await prisma.deletedAccountRecord.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (deletedRecord) {
    return NextResponse.json({ 
      isDeleted: true, 
      reason: deletedRecord.reason 
    });
  }

  return NextResponse.json({ isDeleted: false });
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    // Kiểm tra cấu hình hệ thống xem có cho phép đăng ký không
    const config = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" }
    });

    if (config && !config.allowRegistration) {
      return NextResponse.json(
        { error: "Tính năng đăng ký hiện đang tạm khóa bởi quản trị viên." },
        { status: 403 }
      );
    }

    // Chặn đăng ký nếu tài khoản đã bị Admin xóa vĩnh viễn
    const deletedRecord = await prisma.deletedAccountRecord.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (deletedRecord) {
      return NextResponse.json({ 
        error: `Email này đã bị xóa vĩnh viễn khỏi hệ thống bởi Admin vì lý do: ${deletedRecord.reason}. Bạn không thể đăng ký lại.` 
      }, { status: 403 });
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Strict Email Validation
    const emailResult = validateEmail(email);
    if (!emailResult.isValid) {
      return NextResponse.json(
        { error: emailResult.error },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.emailVerified) {
        return NextResponse.json(
          { error: "Tài khoản với email này đã tồn tại và đã được xác thực." },
          { status: 400 }
        );
      }
      // Nếu user tồn tại nhưng chưa xác thực, chúng ta sẽ cập nhật lại thông tin (cho phép đăng ký lại)
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const otp = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    if (existingUser) {
      await prisma.user.update({
        where: { email },
        data: {
          name,
          passwordHash,
          verificationCode: otp,
          codeExpires: expires,
        }
      });
    } else {
      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          verificationCode: otp,
          codeExpires: expires,
          emailVerified: false,
        },
      });
    }

    // Gửi email xác thực
    await sendVerificationEmail(email, otp);

    return NextResponse.json(
      { 
        message: "Mã xác thực đã được gửi đến email của bạn.",
        email: email,
        requiresVerification: true 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
