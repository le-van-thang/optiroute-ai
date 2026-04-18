import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ tripId: string }> };

// GET /api/trips/[tripId]/expenses — Lấy tất cả Expense của trip, kèm payer và shares
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

    // Security: chỉ GroupMember mới được xem expense
    const membership = await prisma.groupMember.findUnique({
      where: { tripId_userId: { tripId, userId: sessionUser.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden: not a member of this trip" }, { status: 403 });
    }

    const expenses = await prisma.expense.findMany({
      where: { tripId },
      include: {
        payer: { select: { id: true, name: true } },
        shares: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/trips/[tripId]/expenses — Thêm expense mới với shares
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

    // Security: chỉ GroupMember mới được thêm expense
    const membership = await prisma.groupMember.findUnique({
      where: { tripId_userId: { tripId, userId: sessionUser.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden: not a member of this trip" }, { status: 403 });
    }

    const { title, totalAmount, payerId, participantIds } = await req.json();

    if (!title || !totalAmount || !payerId || !participantIds?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify payerId is a member of this trip
    const payerMembership = await prisma.groupMember.findUnique({
      where: { tripId_userId: { tripId, userId: payerId } },
    });
    if (!payerMembership) {
      return NextResponse.json({ error: "Payer is not a member of this trip" }, { status: 400 });
    }

    const perPerson = parseFloat(totalAmount) / participantIds.length;

    const expense = await prisma.expense.create({
      data: {
        title,
        totalAmount: parseFloat(totalAmount),
        payerId,
        tripId,
        shares: {
          create: participantIds.map((uid: string) => ({
            userId: uid,
            amountOwed: perPerson,
          })),
        },
      },
      include: {
        payer: { select: { id: true, name: true } },
        shares: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    // Tier 3: Create notifications for participants (excluding the payer)
    // Avoid notifying the person who just paid for themselves
    const notifyUserIds = participantIds.filter((uid: string) => uid !== payerId);
    
    if (notifyUserIds.length > 0) {
       const payerName = expense.payer?.name || "Một thành viên";
       
       await prisma.notification.createMany({
          data: notifyUserIds.map((uid: string) => ({
             userId: uid,
             message: `${payerName} đã chi ${totalAmount.toLocaleString("vi-VN")}đ cho "${title}". Bạn nợ ${perPerson.toLocaleString("vi-VN")}đ.`,
             link: `/split-bill?tripId=${tripId}`,
          }))
       });
    }

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
