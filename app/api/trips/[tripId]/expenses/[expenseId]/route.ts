import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ tripId: string; expenseId: string }> };

// DELETE /api/trips/[tripId]/expenses/[expenseId]
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { tripId, expenseId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });
    if (!expense || expense.tripId !== tripId) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Chỉ người tạo expense hoặc LEADER mới được xóa
    const membership = await prisma.groupMember.findUnique({
      where: { tripId_userId: { tripId, userId: user.id } },
    });
    const isLeader = membership?.role === "LEADER";
    const isPayer = expense.payerId === user.id;

    if (!isLeader && !isPayer) {
      return NextResponse.json({ error: "Forbidden: only payer or leader can delete" }, { status: 403 });
    }

    const { reason } = await req.json();

    await prisma.expense.delete({ where: { id: expenseId } });

    // Notify all members except the deleter
    const members = await prisma.groupMember.findMany({
      where: { tripId },
      include: { user: { select: { id: true, name: true } } }
    });

    const notifyList = members.filter(m => m.userId !== user.id);
    if (notifyList.length > 0) {
      await prisma.notification.createMany({
        data: notifyList.map(m => ({
          userId: m.userId,
          message: `🚫 ${user.name || user.email} đã xóa khoản chi "${expense.title}". Lý do: ${reason || "Không rõ lý do"}`,
          link: `/split-bill?tripId=${tripId}`
        }))
      });
    }

    return NextResponse.json({ message: "Deleted and members notified" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/trips/[tripId]/expenses/[expenseId]/settle — Đánh dấu share đã trả
// Body: { debtorId: string }
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { expenseId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { debtorId } = await req.json();

    // Đánh dấu settlementPaid = true cho share của debtorId trong expense này
    const share = await prisma.expenseShare.updateMany({
      where: {
        expenseId,
        userId: debtorId || user.id,
      },
      data: { settlementPaid: true },
    });

    return NextResponse.json({ updated: share.count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
