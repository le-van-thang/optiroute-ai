import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { randomBytes } from "crypto";

type RouteContext = { params: Promise<{ tripId: string }> };

// POST /api/trips/[tripId]/invite — Sinh inviteCode và auto-add owner vào GroupMember
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { tripId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    // Chỉ owner của trip mới có thể tạo invite code
    if (trip.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden: only trip owner can generate invite" }, { status: 403 });
    }

    // Giữ lại inviteCode cũ nếu đã có, tránh làm vô hiệu link cũ
    let inviteCode = trip.inviteCode;
    if (!inviteCode) {
      inviteCode = randomBytes(4).toString("hex").toUpperCase(); // e.g. "A3F9B2E1"

      await prisma.trip.update({
        where: { id: tripId },
        data: { inviteCode },
      });
    }

    // Auto-add owner vào GroupMember với role LEADER (upsert để tránh duplicate)
    await prisma.groupMember.upsert({
      where: { tripId_userId: { tripId, userId: user.id } },
      update: {},
      create: {
        tripId,
        userId: user.id,
        role: "LEADER",
      },
    });

    const inviteUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/join/${inviteCode}`;

    return NextResponse.json({ inviteCode, inviteUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/trips/[tripId]/invite — Reset inviteCode (vô hiệu hóa link cũ)
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { tripId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip || trip.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.trip.update({
      where: { id: tripId },
      data: { inviteCode: null },
    });

    return NextResponse.json({ message: "Invite code revoked" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
