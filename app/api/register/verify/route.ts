import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Thiếu email hoặc mã xác thực" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json({ error: "Người dùng không tồn tại" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Tài khoản này đã được xác thực trước đó" }, { status: 400 });
    }

    // Kiểm tra mã OTP
    if (!user.verificationCode || user.verificationCode !== code) {
      return NextResponse.json({ error: "Mã xác thực không chính xác" }, { status: 400 });
    }

    // Kiểm tra hết hạn (10 phút)
    if (user.codeExpires && new Date() > user.codeExpires) {
      return NextResponse.json({ error: "Mã xác thực đã hết hạn" }, { status: 400 });
    }

    // Xác thực thành công
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        verificationCode: null, // Xóa mã sau khi dùng
        codeExpires: null
      }
    });

    return NextResponse.json({
      success: true,
      message: "Xác thực email thành công! Bây giờ bạn có thể đăng nhập."
    });

  } catch (error: any) {
    console.error("VERIFY REGISTRATION ERROR:", error);
    return NextResponse.json({ error: "Đã có lỗi xảy ra trong quá trình xác thực" }, { status: 500 });
  }
}
