import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [userCount, tripCount, reportCount, messageCount] = await Promise.all([
      prisma.user.count(),
      prisma.trip.count(),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.message.count()
    ]);

    const recentReports = await prisma.report.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { name: true } },
        reported: { select: { name: true } }
      }
    });

    return NextResponse.json({
      stats: {
        userCount,
        tripCount,
        reportCount, // Pending only
        messageCount
      },
      recentReports
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
