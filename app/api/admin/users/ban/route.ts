import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId, type, reason } = await req.json();

    if (!userId || !type || !reason) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    if (userId === session.user.id) {
       return NextResponse.json({ error: "Cannot ban yourself" }, { status: 400 });
    }

    // Protect other admins
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (targetUser?.role === "ADMIN") {
      return NextResponse.json({ error: "Cannot ban another administrator" }, { status: 400 });
    }

    let bannedUntil: Date | null = null;
    const now = new Date();

    switch (type) {
      case "3_DAYS":
        bannedUntil = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        break;
      case "1_WEEK":
        bannedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case "1_MONTH":
        bannedUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case "1_YEAR":
        bannedUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        break;
      case "PERMANENT":
        bannedUntil = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years
        break;
      default:
        return NextResponse.json({ error: "Invalid ban type" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        bannedUntil,
        banReason: reason
      }
    });

    return NextResponse.json({ success: true, bannedUntil });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
