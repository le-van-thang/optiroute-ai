import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

// Xóa tin nhắn (Xóa cho mọi người)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const messageId = params.id;

    // Tìm tin nhắn để lấy thông tin conversation và người nhận
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: { users: { select: { id: true } } }
        }
      }
    });

    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    
    // Chỉ người gửi mới có quyền xóa
    if (message.senderId !== session.user.id) {
       return NextResponse.json({ error: "You can only delete your own messages" }, { status: 403 });
    }

    const otherUser = message.conversation.users.find(u => u.id !== session.user.id);

    // Xóa tin nhắn
    await prisma.message.delete({
      where: { id: messageId }
    });

    // Thông báo cho cả 2 người qua Pusher để xóa tin nhắn khỏi UI
    const pusherTask = [
      pusherServer.trigger(`private-user-${session.user.id}`, "message-deleted", { messageId }),
    ];
    
    if (otherUser) {
      pusherTask.push(pusherServer.trigger(`private-user-${otherUser.id}`, "message-deleted", { messageId }));
    }

    await Promise.all(pusherTask);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE MESSAGE ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
