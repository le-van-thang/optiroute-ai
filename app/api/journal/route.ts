import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET /api/journal?tripId={tripId} — Fetch journal entries for a trip
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let whereClause = {};

    if (tripId) {
      // Verify trip membership for specific trip
      const membership = await prisma.groupMember.findUnique({
        where: { tripId_userId: { tripId, userId: user.id } },
      });
      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      whereClause = { tripId };
    } else {
      // Fetch all entries for the user across all their trips
      const memberships = await prisma.groupMember.findMany({
        where: { userId: user.id },
        select: { tripId: true }
      });
      const tripIds = memberships.map(m => m.tripId);
      whereClause = { tripId: { in: tripIds } };
    }

    const entries = await prisma.journalEntry.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(entries);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/journal — Create a new geo-journal entry
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { tripId, lat, lng, textContent, imageUrl } = await req.json();

    if (!tripId || !lat || !lng || !imageUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const membership = await prisma.groupMember.findUnique({
      where: { tripId_userId: { tripId, userId: user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const newEntry = await prisma.journalEntry.create({
      data: {
        tripId,
        userId: user.id,
        lat,
        lng,
        textContent,
        imageUrl,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    return NextResponse.json(newEntry, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
