import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

// Gửi lời mời kết bạn
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { receiverId } = await req.json();
    if (session.user.id === receiverId) return NextResponse.json({ error: "Không thể kết bạn với chính mình" }, { status: 400 });

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: session.user.id, receiverId },
          { senderId: receiverId, receiverId: session.user.id }
        ]
      }
    });

    if (existing) return NextResponse.json({ error: "Yêu cầu đã tồn tại" }, { status: 400 });

    const friendship = await prisma.friendship.create({
      data: {
        senderId: session.user.id,
        receiverId,
        status: "PENDING"
      }
    });

    // Thông báo real-time cho người nhận qua kênh riêng tư
    await pusherServer.trigger(`private-user-${receiverId}`, "friend-request", {
      fromName: session.user.name,
      fromId: session.user.id
    });

    return NextResponse.json(friendship);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Chấp nhận hoặc Từ chối lời mời
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { requestId, status } = await req.json(); // PENDING -> ACCEPTED / REJECTED

    const friendship = await prisma.friendship.findUnique({
      where: { id: requestId }
    });

    if (!friendship || friendship.receiverId !== session.user.id) {
       return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 404 });
    }

    if (status === "ACCEPTED") {
      const updated = await prisma.friendship.update({
        where: { id: requestId },
        data: { status: "ACCEPTED" },
        include: { sender: true, receiver: true }
      });

      // Tạo một Conversation giữa 2 người nếu chưa có
      let conversation = await prisma.conversation.findFirst({
        where: {
          AND: [
            { users: { some: { id: updated.senderId } } },
            { users: { some: { id: updated.receiverId } } }
          ]
        }
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            users: {
              connect: [{ id: updated.senderId }, { id: updated.receiverId }]
            }
          }
        });
      }

      // Thông báo cho cả 2 người qua Pusher
      const eventData = {
        friendId: session.user.id,
        friendName: session.user.name,
        type: "ACCEPTED"
      };

      await pusherServer.trigger(`private-user-${updated.senderId}`, "friend-request-accepted", eventData);
      await pusherServer.trigger(`private-user-${updated.receiverId}`, "friend-request-accepted", eventData);

      return NextResponse.json(updated);
    } else {
      // Từ chối thì xóa luôn record
      const deleted = await prisma.friendship.delete({ 
        where: { id: requestId },
        include: { sender: true, receiver: true }
      });
      
      // Thông báo cho người gửi biết yêu cầu bị từ chối (tùy chọn)
      await pusherServer.trigger(`private-user-${deleted.senderId}`, "friend-request-rejected", {
        friendId: session.user.id
      });

      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Hủy kết bạn hoặc Hủy yêu cầu đã gửi
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { targetUserId } = await req.json();

    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: session.user.id }
        ]
      }
    });

    // Thông báo cho phía bên kia để họ cũng cập nhật UI
    await pusherServer.trigger(`private-user-${targetUserId}`, "friend-request-cancelled", {
      friendId: session.user.id
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
