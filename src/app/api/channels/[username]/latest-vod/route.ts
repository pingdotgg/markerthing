import { getLatestVodWithMarkers } from "~/utils/twitch-server";

// Public, read-only API for agents and scripts. No sign-in needed.
// GET /api/channels/<username>/latest-vod
// Returns { vod, markers } for the creator's latest finished stream. The
// creator must have signed in to MarkerThing once, so their token can read
// markers. The token stays on the server.
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/channels/[username]/latest-vod">
) {
  const { username } = await ctx.params;

  try {
    const result = await getLatestVodWithMarkers(username);
    if (!result) {
      return Response.json({ error: "No finished VOD found" }, { status: 404 });
    }
    // Let the CDN absorb repeat calls, so they do not spend the creator's
    // Twitch rate limit.
    return Response.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    console.error("LATEST VOD API ERROR", e);
    // These messages only name the failed step, never a token
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: message }, { status: 502 });
  }
}
