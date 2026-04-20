import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawQuery = searchParams.get("query");
    const query = rawQuery?.trim() || "";

    if (!query || query.length < 1) {
      return NextResponse.json([]);
    }

    const cleanQuery = query.replace("#", "");

    // Tìm kiếm thông minh: Tên, Email hoặc Hậu tố ID
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { id: { contains: cleanQuery, mode: "insensitive" } },
            ],
          },
          {
            id: { not: session.user.id },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        acceptMessages: true,
        lastActiveAt: true,
        sentRequests: {
          where: { receiver: { email: session.user.email } },
          select: { status: true, id: true },
        },
        receivedRequests: {
          where: { sender: { email: session.user.email } },
          select: { status: true, id: true },
        },
      },
      take: 10,
    });

    // Format lại dữ liệu để frontend dễ xử lý (kiểm tra status kết bạn)
    const formattedUsers = users.map((u) => {
      const incoming = u.sentRequests[0]; // Lời mời từ họ gửi cho mình
      const outgoing = u.receivedRequests[0]; // Lời mời từ mình gửi cho họ
      
      let friendStatus = "NONE";
      if (incoming?.status === "ACCEPTED" || outgoing?.status === "ACCEPTED") {
        friendStatus = "FRIEND";
      } else if (incoming?.status === "PENDING") {
        friendStatus = "INCOMING";
      } else if (outgoing?.status === "PENDING") {
        friendStatus = "OUTGOING";
      }

      let friendRequestId = incoming?.id || outgoing?.id || null;

      return {
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
    });

    return NextResponse.json(formattedUsers);
  } catch (error: any) {
    console.error("SEARCH ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
