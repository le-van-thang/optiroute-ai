import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Lấy các chi phí mà user đã trả, kèm shares
    const expenses = await prisma.expense.findMany({
      where: { payerId: user.id },
      include: {
        shares: true
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, totalAmount, tripId } = await req.json();

    if (!title || !totalAmount) {
      return NextResponse.json({ error: "Title and Amount are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Tìm Trip gần nhất của user nếu không truyền tripId
    let targetTripId = tripId;
    if (!targetTripId) {
      const recentTrip = await prisma.trip.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });
      if (!recentTrip) {
        return NextResponse.json({ error: "You must create a trip first before adding expenses." }, { status: 400 });
      }
      targetTripId = recentTrip.id;
    }

    // Tạo khoản chi và tự chia cho chính mình (Tạm thời)
    const expense = await prisma.expense.create({
      data: {
        title,
        totalAmount: parseFloat(totalAmount),
        payerId: user.id,
        tripId: targetTripId,
        shares: {
          create: [
            {
              userId: user.id,
              amountOwed: parseFloat(totalAmount) // Khởi đầu tự chịu 100%
            }
          ]
        }
      },
      include: {
        shares: true
      }
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
