import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { targetUserId } = await req.json();

    if (!targetUserId) return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });

    const existingBlock = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: session.user.id,
          blockedId: targetUserId
        }
      }
    });

    if (existingBlock) {
      // Unblock
      await prisma.block.delete({
        where: { id: existingBlock.id }
      });
      return NextResponse.json({ status: "UNBLOCKED" });
    } else {
      // Block
      await prisma.block.create({
        data: {
          blockerId: session.user.id,
          blockedId: targetUserId
        }
      });

      // Khi chặn, tự động hủy kết bạn luôn cho tiện
      await prisma.friendship.deleteMany({
        where: {
          OR: [
            { senderId: session.user.id, receiverId: targetUserId },
            { senderId: targetUserId, receiverId: session.user.id }
          ]
        }
      });

      return NextResponse.json({ status: "BLOCKED" });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
