import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ tripId: string }> };

export async function DELETE(req: Request, { params }: RouteContext) {
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

    // Check if trip exists and user is the owner
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    if (trip.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden: Only the creator can delete this trip" }, { status: 403 });
    }

    // Prisma cascading deletion handles related GroupMembers, TripItems, Expenses, etc.
    await prisma.trip.delete({
      where: { id: tripId },
    });

    return NextResponse.json({ message: "Trip deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
