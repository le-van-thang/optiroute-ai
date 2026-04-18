import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "Thiếu mã xác thực" }, { status: 400 });
    }

    // Tìm user theo ID hoặc Email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: session.user.id },
          { email: session.user.email as string }
        ]
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Kiểm tra mã OTP
    if (!user.verificationCode || user.verificationCode !== code) {
      return NextResponse.json({ error: "Mã xác thực không chính xác" }, { status: 400 });
    }

    // Kiểm tra hết hạn (10 phút)
    if (user.codeExpires && new Date() > user.codeExpires) {
      return NextResponse.json({ error: "Mã xác thực đã hết hạn" }, { status: 400 });
    }

    // Kích hoạt 2FA thành công
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        verificationCode: null, // Xóa mã sau khi dùng
        codeExpires: null
      },
      select: {
        twoFactorEnabled: true,
        twoFactorMethod: true
      }
    });

    return NextResponse.json({
      success: true,
      message: "Kích hoạt bảo mật 2 lớp thành công!",
      user: updated
    });

  } catch (error: any) {
    console.error("VERIFY 2FA ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
