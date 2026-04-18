import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const requests = await prisma.friendship.findMany({
      where: {
        receiverId: session.user.id,
        status: "PENDING"
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const formatted = requests.map(r => ({
      id: r.id,
      sender: r.sender,
      createdAt: r.createdAt
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
