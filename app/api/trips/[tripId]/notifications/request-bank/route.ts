import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ tripId: string }> };

// POST /api/trips/[tripId]/notifications/request-bank
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { tripId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetUserId } = await req.json();

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });
    }

    const sender = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!sender) return NextResponse.json({ error: "Sender not found" }, { status: 404 });

    // Verify trip existence and target user membership
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { groupMembers: true }
    });

    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const isMember = trip.groupMembers.some(m => m.userId === targetUserId);
    if (!isMember) {
      return NextResponse.json({ error: "Target user is not a member of this trip" }, { status: 400 });
    }

    // Create notification for the target user
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        message: `📌 ${sender.name || sender.email} đang yêu cầu bạn cập nhật STK để thực hiện đối soát trong chuyến đi "${trip.title}".`,
        link: `/split-bill?tripId=${tripId}`,
      },
    });

    return NextResponse.json({ message: "Request sent successfully" });
  } catch (error: any) {
    console.error("Error sending bank request:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
