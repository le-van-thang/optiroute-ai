import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: conversationId } = await params;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { users: true }
    });

    if (!conversation || !conversation.users.some(u => u.id === session.user.id)) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Cập nhật mốc thời gian xóa cho người dùng hiện tại
    const currentClearedAt = (conversation.clearedAt as Record<string, string>) || {};
    const updatedClearedAt = {
      ...currentClearedAt,
      [session.user.id]: new Date().toISOString()
    };

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { clearedAt: updatedClearedAt }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
