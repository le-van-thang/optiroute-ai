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

    // Online threshold: 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [userCount, tripCount, reportCount, messageCount, onlineUsers] = await Promise.all([
      prisma.user.count(),
      prisma.trip.count(),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.message.count(),
      prisma.user.findMany({
        where: {
          lastActiveAt: { gte: fiveMinutesAgo }
        },
        select: { lastCity: true }
      })
    ]);

    const cityDistribution = onlineUsers.reduce((acc: any, user) => {
      const city = user.lastCity || "Đang xác định...";
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {});

    // Fetch recent events for the Live Stream
    const [recentUsers, recentTrips, recentMsgs] = await Promise.all([
      prisma.user.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { name: true, createdAt: true } }),
      prisma.trip.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { title: true, createdAt: true, user: { select: { name: true } } } }),
      prisma.message.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { sender: { select: { name: true } }, createdAt: true } })
    ]);

    const liveEvents = [
      ...recentUsers.map(u => ({ type: "USER", title: "Người dùng mới", detail: u.name || "Ẩn danh", time: u.createdAt })),
      ...recentTrips.map(t => ({ type: "TRIP", title: "Chuyến đi mới", detail: `${t.title} (${t.user?.name || "Ẩn danh"})`, time: t.createdAt })),
      ...recentMsgs.map(m => ({ type: "MESSAGE", title: "Tin nhắn mới", detail: `Từ ${m.sender?.name || "Ẩn danh"}`, time: m.createdAt }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);

    const recentReports = await prisma.report.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { name: true, email: true } },
        reported: { select: { name: true, email: true } }
      }
    });

    return NextResponse.json({
      stats: {
        userCount,
        tripCount,
        reportCount, // Pending only
        messageCount,
        onlineCount: onlineUsers.length,
        cityDistribution
      },
      recentReports,
      liveEvents
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
