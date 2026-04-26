import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PATCH /api/expenses/[expenseId]/shares — Cập nhật trạng thái thanh toán của từng người trong khoản chi
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const { expenseId } = await params;
    const { userId, settlementPaid } = await req.json();

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!sessionUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Kiểm tra quyền: Chỉ người trả tiền (Payer) hoặc Leader mới được đánh dấu đã thanh toán cho người khác
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { trip: { include: { groupMembers: true } } }
    });

    if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    const isPayer = expense.payerId === sessionUser.id;
    const isLeader = expense.trip.userId === sessionUser.id;

    if (!isPayer && !isLeader && sessionUser.id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedShare = await prisma.expenseShare.updateMany({
      where: {
        expenseId,
        userId,
      },
      data: {
        settlementPaid
      }
    });

    return NextResponse.json({ success: true, updatedShare });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
