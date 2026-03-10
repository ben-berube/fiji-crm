import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const EVENT_DATE = new Date("2026-03-21T18:00:00-07:00");
const CLASS_YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

export async function GET() {
  try {
    const [tickets, members] = await Promise.all([
      prisma.pigDinnerTicket.findMany({
        include: { member: { select: { graduationYear: true } } },
      }),
      prisma.member.findMany({
        where: {
          graduationYear: { in: CLASS_YEARS },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          graduationYear: true,
          pigDinnerTicket: { select: { id: true } },
        },
        orderBy: [{ graduationYear: "asc" }, { lastName: "asc" }],
      }),
    ]);

    const ticketsSold = tickets.length;
    const matchedCount = tickets.filter((t) => t.memberId).length;
    const now = new Date();
    const daysUntilEvent = Math.max(
      0,
      Math.ceil(
        (EVENT_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    const lastUpdated = tickets.length > 0
      ? tickets.reduce((latest, t) =>
          t.createdAt > latest ? t.createdAt : latest,
          tickets[0].createdAt
        ).toISOString()
      : null;

    const classByYear = CLASS_YEARS.map((year) => {
      const classMembers = members.filter((m) => m.graduationYear === year);
      const hasTicket = classMembers.filter((m) => m.pigDinnerTicket);
      const needsTicket = classMembers.filter((m) => !m.pigDinnerTicket);

      return {
        year,
        total: classMembers.length,
        ticketCount: hasTicket.length,
        hasTicket: hasTicket.map(formatMember),
        needsTicket: needsTicket.map(formatMember),
      };
    });

    const memberById = new Map(members.map((m) => [m.id, m]));

    const allBuyers = tickets.map((t) => {
      const member = t.memberId ? memberById.get(t.memberId) : null;
      return {
        name: t.customerName,
        email: t.customerEmail,
        purchaseDate: t.purchaseDate.toISOString(),
        matched: !!t.memberId,
        graduationYear: member?.graduationYear ?? t.member?.graduationYear ?? null,
      };
    });

    const unmatchedBuyers = tickets
      .filter((t) => !t.memberId)
      .map((t) => ({
        name: t.customerName,
        email: t.customerEmail,
        purchaseDate: t.purchaseDate.toISOString(),
      }));

    return NextResponse.json({
      stats: {
        ticketsSold,
        matchedCount,
        daysUntilEvent,
        eventDate: EVENT_DATE.toISOString(),
        lastUpdated,
      },
      allBuyers,
      classByYear,
      unmatchedBuyers,
    });
  } catch (error) {
    console.error("Pig dinner data error:", error);
    return NextResponse.json(
      { error: "Failed to load pig dinner data" },
      { status: 500 }
    );
  }
}

function formatMember(m: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  graduationYear: number | null;
}) {
  return {
    id: m.id,
    name: `${m.firstName} ${m.lastName}`,
    email: m.email,
    phone: m.phone,
  };
}
