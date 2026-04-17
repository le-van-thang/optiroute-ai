import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ tripId: string, settlementId: string }> };

// PATCH /api/trips/[tripId]/settlements/[settlementId] — Xác nhận đã nhận tiền (Dành cho chủ nợ)
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { tripId, settlementId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!sessionUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { payer: true }
    });

    if (!settlement) {
      return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
    }

    // Security: Chỉ người nhận mới được xác nhận
    if (settlement.receiverId !== sessionUser.id) {
      return NextResponse.json({ error: "Only the receiver can confirm this settlement" }, { status: 403 });
    }

    if (settlement.status === "COMPLETED") {
       return NextResponse.json({ message: "Already completed" }, { status: 200 });
    }

    // Update status to COMPLETED
    const updated = await prisma.settlement.update({
      where: { id: settlementId },
      data: { status: "COMPLETED" },
    });

    // Notify payer
    await prisma.notification.create({
      data: {
        userId: settlement.payerId,
        message: `${sessionUser.name || sessionUser.email} đã xác nhận nhận được ${settlement.amount.toLocaleString("vi-VN")}đ. Giao dịch hoàn tất.`,
        link: `/split-bill?tripId=${tripId}`,
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/trips/[tripId]/settlements/[settlementId] — Hủy yêu cầu thanh toán (Dành cho người trả hoặc chủ nhóm)
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { tripId, settlementId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!sessionUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { trip: true }
    });

    if (!settlement) {
      return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
    }

    // Security: Chỉ người trả, người nhận hoặc chủ nhóm mới được xóa
    const isPayer = settlement.payerId === sessionUser.id;
    const isReceiver = settlement.receiverId === sessionUser.id;
    const isLeader = settlement.trip.userId === sessionUser.id;

    if (!isPayer && !isReceiver && !isLeader) {
      return NextResponse.json({ error: "Unauthorized to delete this settlement" }, { status: 403 });
    }

    // Chỉ được xóa nếu đang PENDING
    if (settlement.status === "COMPLETED") {
      return NextResponse.json({ error: "Cannot delete a completed settlement" }, { status: 400 });
    }

    await prisma.settlement.delete({
      where: { id: settlementId },
    });

    return NextResponse.json({ message: "Settlement deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
