import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Auth check - Only Admin
    if (!session?.user?.email || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, content, type } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Get all users to send notifications to
    const users = await prisma.user.findMany({
      select: { id: true }
    });

    const fullMessage = `📢 [${type}] ${title}: ${content}`;

    // Create notifications in DB for all users
    // Using createMany for performance
    await prisma.notification.createMany({
      data: users.map(u => ({
        userId: u.id,
        message: fullMessage,
        isRead: false,
        link: null // Remove redirect for general broadcasts
      }))
    });

    // Trigger Pusher for real-time update on all clients
    // We send to a global channel that everyone listens to
    await pusherServer.trigger("global-notifications", "new-broadcast", {
      message: fullMessage,
      type,
      count: users.length
    });

    return NextResponse.json({ 
      success: true, 
      count: users.length,
      message: "Broadcast sent successfully"
    });

  } catch (error: any) {
    console.error("Broadcast error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
