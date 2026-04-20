import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const settlements = await prisma.settlement.findMany({
      where: {
        OR: [
          { payerId: userId },
          { receiverId: userId }
        ],
        status: "COMPLETED",
      },
      include: {
        trip: {
          select: { title: true }
        },
        payer: {
          select: { id: true, name: true, email: true, image: true }
        },
        receiver: {
          select: { id: true, name: true, email: true, image: true }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json(settlements);
  } catch (error) {
    console.error("GET transactions settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
