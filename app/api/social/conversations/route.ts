import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Lấy danh sách các cuộc hội thoại hiện có của người dùng
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conversations = await prisma.conversation.findMany({
      where: {
        users: { some: { id: session.user.id } }
      },
      include: {
        users: {
          where: { id: { not: session.user.id } },
          select: { id: true, name: true, image: true, email: true }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    const formatted = conversations.map(conv => ({
      id: conv.id,
      otherUser: conv.users[0],
      lastMessage: conv.messages[0]?.content || "Chưa có tin nhắn",
      lastMessageTime: conv.messages[0]?.createdAt || conv.updatedAt
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
