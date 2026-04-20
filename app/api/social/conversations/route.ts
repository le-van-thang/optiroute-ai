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
          select: { 
            id: true, name: true, image: true, email: true, lastActiveAt: true, role: true, acceptMessages: true,
            sentRequests: {
              where: { receiver: { id: session.user.id } },
              select: { status: true, id: true },
            },
            receivedRequests: {
              where: { sender: { id: session.user.id } },
              select: { status: true, id: true },
            },
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    const formatted = conversations.map(conv => {
      const u = conv.users[0];
      if (!u) return null;
      
      const incoming = u.sentRequests[0];
      const outgoing = u.receivedRequests[0];
      
      let friendStatus = "NONE";
      if (incoming?.status === "ACCEPTED" || outgoing?.status === "ACCEPTED") {
        friendStatus = "FRIEND";
      } else if (incoming?.status === "PENDING") {
        friendStatus = "INCOMING";
      } else if (outgoing?.status === "PENDING") {
        friendStatus = "OUTGOING";
      }

      let friendRequestId = incoming?.id || outgoing?.id || null;

      const otherUser = {
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        role: u.role,
        acceptMessages: u.acceptMessages,
        lastActiveAt: u.lastActiveAt,
        friendStatus,
        friendRequestId,
      };

      return {
        id: conv.id,
        otherUser,
        lastMessage: conv.messages[0]?.content || "Chưa có tin nhắn",
        lastMessageTime: conv.messages[0]?.createdAt || conv.updatedAt
      };
    }).filter(Boolean);

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
