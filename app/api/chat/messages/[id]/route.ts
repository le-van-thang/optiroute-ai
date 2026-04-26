import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

// Xóa tin nhắn (Xóa cho mọi người)
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await context.params;
    const messageId = resolvedParams.id;

    const { searchParams } = new URL(req.url);
    const deleteType = searchParams.get("type") || searchParams.get("scope") || "everyone"; // "me" | "everyone"

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
    
    // Kiểm tra xem user có nằm trong cuộc trò chuyện không
    const isParticipant = message.conversation.users.some((u: any) => u.id === session.user.id);
    if (!isParticipant) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const otherUser = message.conversation.users.find((u: any) => u.id !== session.user.id);

    // Xử lý logic xóa
    if (deleteType === "everyone") {
      // Chỉ người gửi mới có quyền thu hồi với mọi người
      if (message.senderId !== session.user.id) {
         return NextResponse.json({ error: "You can only unsend your own messages" }, { status: 403 });
      }

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

    } else if (deleteType === "me") {
      // Xóa ở phía tôi - Cập nhật mảng deletedFor
      const currentDeletedFor = message.deletedFor || [];
      if (!currentDeletedFor.includes(session.user.id)) {
        currentDeletedFor.push(session.user.id);
      }

      // Nếu cả 2 đều đã xóa thì có thể xóa vật lý luôn cho rảnh nợ Database
      if (currentDeletedFor.length === message.conversation.users.length) {
        await prisma.message.delete({ where: { id: messageId } });
      } else {
        await prisma.message.update({
          where: { id: messageId },
          data: { deletedFor: currentDeletedFor }
        });
      }

      // Chỉ thông báo cho người xóa để UI của họ cập nhật
      await pusherServer.trigger(`private-user-${session.user.id}`, "message-deleted", { messageId });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE MESSAGE ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
