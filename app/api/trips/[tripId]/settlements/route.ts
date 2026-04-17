import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ tripId: string }> };

// GET /api/trips/[tripId]/settlements — Lấy danh sách giao dịch trả nợ trong chuyến đi
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { tripId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!sessionUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Security: Phải là thành viên mới được xem
    const membership = await prisma.groupMember.findUnique({
      where: { tripId_userId: { tripId, userId: sessionUser.id } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const settlements = await prisma.settlement.findMany({
      where: { tripId },
      include: {
        payer: { select: { id: true, name: true, email: true } },
        receiver: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(settlements);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/trips/[tripId]/settlements — Báo cáo đã trả nợ (Tạo settlement PENDING)
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { tripId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!sessionUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const receiverId = body.receiverId;
    const rawAmount = body.amount;
    const receiptUrl = body.receiptUrl;

    if (!receiverId || rawAmount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const amount = typeof rawAmount === "string" ? parseFloat(rawAmount.replace(/[^0-9.-]+/g, "")) : parseFloat(rawAmount);

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Security: Cả 2 phải trong trip
    const [payerMem, receiverMem] = await Promise.all([
      prisma.groupMember.findUnique({ where: { tripId_userId: { tripId, userId: sessionUser.id } } }),
      prisma.groupMember.findUnique({ where: { tripId_userId: { tripId, userId: receiverId } } }),
    ]);

    if (!payerMem || !receiverMem) {
        return NextResponse.json({ error: "Invalid members for this trip" }, { status: 400 });
    }

    const settlement = await prisma.settlement.create({
      data: {
        tripId,
        payerId: sessionUser.id,
        receiverId,
        amount: amount,
        receiptUrl,
        status: "PENDING",
      },
      include: {
        payer: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
      }
    });

    // Fetch trip title for better notification context
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { title: true }
    });

    // Notify receiver
    await prisma.notification.create({
      data: {
        userId: receiverId,
        message: `Vui lòng kiểm tra tài khoản, ${sessionUser.name || sessionUser.email} đã báo cáo chuyển khoản ${amount.toLocaleString("vi-VN")}đ cho hành trình "${trip?.title || "Hành trình"}".`,
        link: `/split-bill?tripId=${tripId}&tab=settle#settlement-section`,
      }
    });

    return NextResponse.json(settlement, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
