import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs = await prisma.scrapeJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Error fetching scrape jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch scrape jobs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { type, storeId, productId } = await request.json();

    const job = await prisma.scrapeJob.create({
      data: {
        type: type || "PRICE_CHECK",
        storeId,
        productId,
        status: "PENDING",
      },
    });

    // In a real implementation, you would trigger the actual scraping here
    // For now, we just create the job record

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error("Error creating scrape job:", error);
    return NextResponse.json(
      { error: "Failed to create scrape job" },
      { status: 500 }
    );
  }
}
