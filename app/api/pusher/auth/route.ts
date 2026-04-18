import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let socketId, channelName;
    const contentType = req.headers.get("content-type") || "";
    const bodyText = await req.text();

    if (contentType.includes("application/json")) {
      try {
        const body = JSON.parse(bodyText);
        socketId = body.socket_id;
        channelName = body.channel_name;
      } catch (e) {
        // Fallback to URLSearchParams if JSON parsing fails
        const params = new URLSearchParams(bodyText);
        socketId = params.get("socket_id");
        channelName = params.get("channel_name");
      }
    } else {
      const params = new URLSearchParams(bodyText);
      socketId = params.get("socket_id");
      channelName = params.get("channel_name");
    }

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
    }

    // Chỉ cho phép join vào channel cá nhân của mình
    // Ví dụ: private-user-uuid
    if (channelName.startsWith("private-user-") && channelName !== `private-user-${session.user.id}`) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const authResponse = pusherServer.authenticate(socketId, channelName, {
      user_id: session.user.id,
      user_info: {
        name: session.user.name,
        email: session.user.email,
      },
    });

    return NextResponse.json(authResponse);
  } catch (error: any) {
    console.error("Pusher Auth Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
