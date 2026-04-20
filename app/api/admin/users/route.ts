import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

// Lấy danh sách người dùng
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { id: { contains: query, mode: "insensitive" } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        _count: {
          select: { trips: true, reportsReceived: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Cập nhật vai trò người dùng
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId, role } = await req.json();

    if (!userId || !role) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role }
    });

    // Kích hoạt đồng bộ Real-time cho người dùng bị thay đổi vai trò (Sử dụng kênh private)
    try {
      await pusherServer.trigger(`private-user-${userId}`, "role-updated", {
        role: updated.role,
        message: "Quyền hạn của bạn đã được cập nhật."
      });
    } catch (pushError) {
      console.error("Pusher Error:", pushError);
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Xóa tài khoản người dùng
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId, reason } = await req.json();

    if (!userId || !reason) return NextResponse.json({ error: "Missing data (userId/reason)" }, { status: 400 });
    
    if (userId === session.user.id) {
       return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true }
    });

    if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (targetUser.role === "ADMIN") {
       return NextResponse.json({ error: "Cannot delete another administrator" }, { status: 400 });
    }

    // Ghi lại lý do xóa trước khi xóa vĩnh viễn user
    await prisma.deletedAccountRecord.upsert({
      where: { email: targetUser.email },
      update: {
        reason,
        adminName: session.user.name || "Admin",
        deletedAt: new Date()
      },
      create: {
        email: targetUser.email,
        reason,
        adminName: session.user.name || "Admin"
      }
    });

    // Xóa vĩnh viễn user
    await prisma.user.delete({
      where: { id: userId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
