# [MarkerThing](https://markerthing.com) (by [Ping](https://ping.gg))

tl;dr - grab csv files from your Twitch [Stream Markers](https://help.twitch.tv/s/article/creating-highlights-and-stream-markers?language=en_US#:~:text=in%20light%20purple.-,Stream%20Markers,-Stream%20Markers%20are) to use with [LosslessCut](https://github.com/mifi/lossless-cut)

## Public API

`GET https://markerthing.com/api/channels/<username>/latest-vod`

Returns the channel's latest finished stream VOD and all its markers as JSON. No sign-in needed. The creator must have signed in to MarkerThing once.

```json
{
  "vod": {
    "id": "...",
    "title": "...",
    "url": "...",
    "created_at": "...",
    "duration": "3h2m1s",
    "user_login": "theo"
  },
  "markers": [
    {
      "id": "...",
      "created_at": "...",
      "description": "Talking about Chrome",
      "position_seconds": 600,
      "URL": "..."
    }
  ]
}
```

Returns 404 when there is no finished VOD, and 502 when Twitch or Clerk fails. Responses are cached for 60 seconds.

## Dev Setup

1. Fork & clone repo
2. `pnpm install`
3. Set up [Twitch OAuth app](https://dev.twitch.tv) and [Clerk auth](https://clerk.com/?utm_campaign=theo-dtc)
   - You need to use the custom twitch oauth credentials in clerk
   - You also need to add the `user:read:broadcast` and `openid` scopes
4. Add the environment variables to a new `.env.local` file (see [.env.example](/src/.env.example))
5. `pnpm dev`

## Tech used

- [Next.js App Router](https://beta.nextjs.org)
- [React Server Components](https://react.dev)
- [Clerk auth](https://clerk.com/?utm_campaign=theo-dtc)
- [Tailwind](https://tailwindcss.com)
- [Plausible analytics](https://plausible.io/?ref=theo)
