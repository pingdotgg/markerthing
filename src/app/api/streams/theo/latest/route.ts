import {
  getLatestPublicTheoStream,
  PublicStreamError,
} from "~/utils/twitch-server";

export const dynamic = "force-dynamic";

// Intentionally public, read-only, and limited to the channel that opted in.
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    return Response.json(await getLatestPublicTheoStream(), { headers });
  } catch (error) {
    if (error instanceof PublicStreamError) {
      return Response.json(
        { error: error.code, message: error.message },
        { status: error.status, headers }
      );
    }
    // Upstream/Clerk errors may contain private details. Never serialize them.
    return Response.json(
      {
        error: "upstream_unavailable",
        message:
          "Could not read the latest stream from Twitch. Try again shortly.",
      },
      { status: 503, headers }
    );
  }
}
