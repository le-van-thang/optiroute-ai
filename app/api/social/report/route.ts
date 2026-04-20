import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { reportedId, conversationId, reason, content, proofImage } = await req.json();

    if (!reportedId || !reason) return NextResponse.json({ error: "Missing information" }, { status: 400 });

    const report = await prisma.report.create({
      data: {
        reporterId: session.user.id,
        reportedId,
        conversationId,
        reason,
        content,
        proofImage
      }
    });

    // Thông báo cho Admin nếu bật tính năng Red Alert
    const config = await prisma.systemConfig.findUnique({ where: { id: "GLOBAL_CONFIG" } });
    if (config?.adminNotifications) {
      const message = `[RED ALERT] Có báo cáo vi phạm mới: ${reason}`;
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
      
      await Promise.all(admins.map(admin => 
        prisma.notification.create({
          data: {
            userId: admin.id,
            message,
            link: "/admin/reports",
            isRead: false
          }
        })
      ));

      // Kích hoạt thông báo Real-time qua Pusher
      await pusherServer.trigger("admin-channel", "new-report", {
        message,
        reportId: report.id
      });
    }

    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
