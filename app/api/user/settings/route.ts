import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        acceptMessages: true,
        profileVisibility: true,
        emailNotifications: true,
        pushNotifications: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET user settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    // Ensure we only update allowed fields
    const updateData: any = {};
    if (typeof data.acceptMessages === "boolean") updateData.acceptMessages = data.acceptMessages;
    if (typeof data.profileVisibility === "string") updateData.profileVisibility = data.profileVisibility;
    if (typeof data.emailNotifications === "boolean") updateData.emailNotifications = data.emailNotifications;
    if (typeof data.pushNotifications === "boolean") updateData.pushNotifications = data.pushNotifications;

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
      select: {
        acceptMessages: true,
        profileVisibility: true,
        emailNotifications: true,
        pushNotifications: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("PATCH user settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
