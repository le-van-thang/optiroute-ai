import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

// DELETE /api/notifications/[id] — Xóa một thông báo
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Verify notification belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== user.id) {
      return NextResponse.json({ error: "Notification not found or access denied" }, { status: 404 });
    }

    await prisma.notification.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Notification deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
