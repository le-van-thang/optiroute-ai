import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

// Gửi tin nhắn mới
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { receiverId, content, type = "TEXT", fileUrl, replyToId } = await req.json();

    if (!content && !fileUrl) return NextResponse.json({ error: "Missing data" }, { status: 400 });
    if (!receiverId) return NextResponse.json({ error: "Missing receiverId" }, { status: 400 });

    // Kiểm tra quyền riêng tư của người nhận (nếu là Admin)
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { role: true, acceptMessages: true }
    });

    if (receiver?.role === "ADMIN" && !receiver.acceptMessages) {
      return NextResponse.json({ error: "Admin currently not accepting messages" }, { status: 403 });
    }

    // 1. Tìm hoặc Tạo cuộc hội thoại giữa 2 người
    let conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { users: { some: { id: session.user.id } } },
          { users: { some: { id: receiverId } } }
        ]
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          users: {
            connect: [
              { id: session.user.id },
              { id: receiverId }
            ]
          }
        }
      });
    }

    // 2. Lưu tin nhắn vào DB
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: session.user.id,
        content: content || (type === "IMAGE" ? "Đã gửi một ảnh" : "Đã gửi một tin nhắn thoại"),
        type,
        fileUrl,
        replyToId
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true }
        },
        replyTo: {
          include: {
            sender: { select: { id: true, name: true } }
          }
        }
      }
    });

    // 3. Kích hoạt sự kiện Pusher (Real-time) tới kênh riêng tư của người nhận
    await pusherServer.trigger(`private-user-${receiverId}`, "new-message", {
      ...message,
      conversationId: conversation.id
    });

    return NextResponse.json(message);
  } catch (error: any) {
    console.error("CHAT SEND ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Lấy lịch sử tin nhắn của một cuộc hội thoại
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const otherUserId = searchParams.get("userId");

    if (!otherUserId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { users: { some: { id: session.user.id } } },
          { users: { some: { id: otherUserId } } }
        ]
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: { select: { id: true, name: true, image: true } },
            replyTo: {
              include: {
                sender: { select: { id: true, name: true } }
              }
            }
          }
        }
      }
    });

    if (!conversation) return NextResponse.json([]);

    // Lọc tin nhắn dựa trên clearedAt của người dùng hiện tại
    const clearedAtData = conversation.clearedAt as Record<string, string> || {};
    const userClearedAt = clearedAtData[session.user.id];

    if (userClearedAt) {
      const clearDate = new Date(userClearedAt);
      const visibleMessages = conversation.messages.filter(m => new Date(m.createdAt) > clearDate);
      return NextResponse.json(visibleMessages);
    }

    return NextResponse.json(conversation.messages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
