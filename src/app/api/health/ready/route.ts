import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Readiness probe: "can this instance actually serve real requests right
 * now." Checks the one dependency every request effectively needs —
 * database connectivity — via the cheapest possible query. Deliberately
 * unauthenticated (same reasoning as ../route.ts) and reports only a
 * boolean-shaped status per dependency, never a connection string, error
 * stack, or other internal detail that could aid an attacker; the real
 * error is still logged server-side for operators.
 *
 * Intended for a deployment platform's readiness check (e.g. don't route
 * traffic to this instance until it returns 200) and for the health
 * verification step in DEPLOYMENT_GUIDE.md / OPERATIONS_GUIDE.md.
 */
export async function GET(): Promise<NextResponse> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      checks: { database: "ok" },
    });
  } catch (err) {
    console.error("[health/ready] database check failed", err);
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        checks: { database: "error" },
      },
      { status: 503 },
    );
  }
}
