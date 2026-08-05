/**
 * Next.js (App Router) route handlers receive dynamic segment params as an
 * async object (`{ params: Promise<{ id: string }> }`). This small helper
 * centralizes that extraction so every route handler and every
 * `withAuth({ getRequiredBatchId })` callback reads it the same way.
 */
export async function extractRouteParam(
  routeContext: unknown,
  paramName: string,
): Promise<string | undefined> {
  if (!routeContext || typeof routeContext !== "object" || !("params" in routeContext)) {
    return undefined;
  }
  const params = await (routeContext as { params: Promise<Record<string, string>> }).params;
  return params[paramName];
}
