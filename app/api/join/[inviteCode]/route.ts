import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

type RouteContext = { params: Promise<{ inviteCode: string }> };

// GET /api/join/[inviteCode] — Tra cứu thông tin trip từ invite code
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { inviteCode } = await params;
    const trip = await prisma.trip.findUnique({
      where: { inviteCode },
      include: {
        user: { select: { name: true } },
        groupMembers: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Mã mời không hợp lệ hoặc đã hết hạn" }, { status: 404 });
    }

    return NextResponse.json({
      tripId: trip.id,
      title: trip.title,
      city: trip.city,
      ownerName: trip.user.name,
      memberCount: trip.groupMembers.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/join/[inviteCode] — User tham gia chuyến đi
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { inviteCode } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const trip = await prisma.trip.findUnique({
      where: { inviteCode },
    });
    if (!trip) {
      return NextResponse.json({ error: "Mã mời không hợp lệ" }, { status: 404 });
    }

    // Upsert — tránh lỗi nếu đã join rồi
    const member = await prisma.groupMember.upsert({
      where: { tripId_userId: { tripId: trip.id, userId: user.id } },
      update: {},
      create: {
        tripId: trip.id,
        userId: user.id,
        role: "MEMBER",
      },
    });

    // Create success notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        message: `Bạn đã tham gia thành công nhóm: ${trip.title}`,
        isRead: false,
      },
    });

    return NextResponse.json({
      message: "Tham gia thành công",
      tripId: trip.id,
      tripTitle: trip.title,
      role: member.role,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
