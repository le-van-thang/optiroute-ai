import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId, cost } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { points: true, inventory: true }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (user.points < cost) {
      return NextResponse.json({ error: "Không đủ điểm tích lũy" }, { status: 400 });
    }

    const currentInventory = Array.isArray(user.inventory) ? user.inventory : [];
    if (currentInventory.includes(itemId)) {
      return NextResponse.json({ error: "Bạn đã sở hữu vật phẩm này rồi" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        points: user.points - cost,
        inventory: [...currentInventory, itemId]
      }
    });

    return NextResponse.json({ 
      success: true, 
      points: updatedUser.points, 
      inventory: updatedUser.inventory 
    });

  } catch (error: any) {
    console.error("MARKET ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
