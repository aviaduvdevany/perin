/**
 * Delegation Analytics API
 *
 * Provides performance metrics for the unified delegation analyzer
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { analysisMonitor } from "@/lib/ai/analysis/analysis-monitor";

export async function GET(request: NextRequest) {
  try {
    // Check authentication - only allow authenticated users to view analytics
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const lastN = parseInt(searchParams.get("last") || "100", 10);

    // Get performance metrics
    const performanceReport = analysisMonitor.getPerformanceReport(lastN);
    const trends = analysisMonitor.getPerformanceTrends();

    return NextResponse.json({
      performance: performanceReport,
      trends,
      metadata: {
        reportGenerated: new Date().toISOString(),
        sampleSize: lastN,
      },
    });
  } catch (error) {
    console.error("Error fetching delegation analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

// Optional: Add endpoint to clear metrics (for testing)
export async function DELETE(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    analysisMonitor.clearMetrics();

    return NextResponse.json({
      message: "Analytics metrics cleared successfully",
      clearedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error clearing delegation analytics:", error);
    return NextResponse.json(
      { error: "Failed to clear analytics" },
      { status: 500 }
    );
  }
}
