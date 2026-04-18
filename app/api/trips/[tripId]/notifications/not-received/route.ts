import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ tripId: string }> };

// POST /api/trips/[tripId]/notifications/not-received
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { tripId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { debtorId, amount } = await req.json();

    if (!debtorId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sender = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!sender) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Create notification for the debtor (the one who reported payment)
    await prisma.notification.create({
      data: {
        userId: debtorId,
        message: `⚠️ ${sender.name || sender.email} báo rằng họ vẫn chưa nhận được số tiền ${Number(amount).toLocaleString()}đ. Bạn vui lòng kiểm tra lại giao dịch nhé!`,
        link: `/split-bill?tripId=${tripId}&tab=settle#settlement-section`,
      },
    });

    return NextResponse.json({ message: "Reminder sent" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
