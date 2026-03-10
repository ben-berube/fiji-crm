import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  try {
    const { ticketEmail, memberId } = await req.json();

    if (!ticketEmail || !memberId) {
      return NextResponse.json(
        { error: "ticketEmail and memberId are required" },
        { status: 400 }
      );
    }

    const [ticket, member] = await Promise.all([
      prisma.pigDinnerTicket.findUnique({
        where: { customerEmail: ticketEmail.toLowerCase() },
      }),
      prisma.member.findUnique({ where: { id: memberId } }),
    ]);

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }
    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.pigDinnerTicket.update({
      where: { customerEmail: ticketEmail.toLowerCase() },
      data: { memberId },
    });

    return NextResponse.json({
      success: true,
      ticket: {
        customerName: updated.customerName,
        customerEmail: updated.customerEmail,
        memberId: updated.memberId,
      },
    });
  } catch (error) {
    console.error("Pig dinner match error:", error);
    const msg = error instanceof Error ? error.message : "Match failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
