import { NextResponse } from "next/server";

/**
 * Liveness probe: "is the process up and serving requests at all." Never
 * touches the database or any external dependency — a liveness check that
 * depends on a downstream service isn't a liveness check anymore, it's a
 * readiness check (see ./ready/route.ts for that). Deliberately
 * unauthenticated: a load balancer / orchestrator / uptime monitor must be
 * able to call this without credentials, and it returns nothing beyond a
 * status and timestamp — no environment, version, or configuration detail
 * that could aid an attacker.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
