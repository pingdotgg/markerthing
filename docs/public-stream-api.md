# Public stream workflow API

`GET /api/streams/theo/latest` is an intentionally public, read-only endpoint for Theo's post-stream processing utility. No client authentication or new environment variables are required. It uses the creator's existing Clerk-managed Twitch connection on the server. Other creators are not opted in.

The endpoint checks that the channel is offline, selects the newest Twitch archive (`sort=time`, `first=1`), retrieves every marker page, then checks offline status again. Failed upstream reads, duplicate markers, cursor loops, and pagination beyond ten pages return an error instead of partial data. Responses are uncached.

Successful JSON has `schema_version: 1`, `channel: "theo"`, `offline: true`, `markers_complete: true`, `fetched_at`, `id`, `user_login`, `type`, `title`, `created_at`, `duration`, and `markers`. Each marker includes only `id`, `created_at`, `description`, and `position_seconds`. Timestamps use Twitch's UTC strings and duration retains Twitch's `5h34m44s` format. `OFFSET HH:MM:SS` remains a marker description; clients apply the existing MarkerThing parsing rules.

Errors: `409 channel_live`, `404 no_archive`, or `503 upstream_unavailable`. Upstream error details and tokens are never returned. An expired creator connection still needs reconnecting through the existing MarkerThing flow; callers never provide Twitch or Clerk credentials.

This endpoint exposes metadata only. It does not export media, mutate markers, access the user's disks, or claim that a locally recorded session is a Twitch stream. A consuming utility must check local media duration/continuity before delivery, and may retry while Twitch finalizes a just-ended archive.
