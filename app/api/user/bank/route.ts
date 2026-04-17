import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET /api/user/bank?userId=xxx — Lấy bank info của user cụ thể (để tạo QR)
// Chỉ trả về thông tin ngân hàng, không trả về dữ liệu nhạy cảm khác
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Kiểm tra session user có trong cùng Trip với userId không (security check)
    const sessionUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!sessionUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Lấy bank info của target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        bankName: true,
        bankCode: true,
        bankAccountNumber: true,
        bankAccountName: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    return NextResponse.json({
      userId: targetUser.id,
      name: targetUser.name,
      bankName: targetUser.bankName,
      bankCode: targetUser.bankCode,
      bankAccountNumber: targetUser.bankAccountNumber,
      bankAccountName: targetUser.bankAccountName,
      hasBankInfo: !!(targetUser.bankName && targetUser.bankAccountNumber),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/user/bank — Cập nhật bank info của chính mình
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bankName, bankCode, bankAccountNumber, bankAccountName } = await req.json();

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        bankName,
        bankCode,
        bankAccountNumber,
        bankAccountName,
      },
    });

    return NextResponse.json({
      success: true,
      bankName: updatedUser.bankName,
      bankCode: updatedUser.bankCode,
      bankAccountNumber: updatedUser.bankAccountNumber,
      bankAccountName: updatedUser.bankAccountName,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
