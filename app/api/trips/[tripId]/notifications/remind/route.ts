import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ tripId: string }> };

// POST /api/trips/[tripId]/notifications/remind
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { tripId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { debtorId, amount, currency = "₫" } = await req.json();

    if (!debtorId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sender = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!sender) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Verify debtor is a member of the trip
    const debtorMembership = await prisma.groupMember.findUnique({
      where: { tripId_userId: { tripId, userId: debtorId } },
    });
    if (!debtorMembership) {
      return NextResponse.json({ error: "Debtor is not a member of this trip" }, { status: 400 });
    }

    // Create notification for the debtor
    await prisma.notification.create({
      data: {
        userId: debtorId,
        message: `🔔 ${sender.name || sender.email} đã nhắc bạn thanh toán số tiền ${Number(amount).toLocaleString()} ${currency} cho các khoản chi của nhóm.`,
        link: `/split-bill?tripId=${tripId}&tab=settle#settlement-section`,
      },
    });

    return NextResponse.json({ message: "Reminder sent" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
