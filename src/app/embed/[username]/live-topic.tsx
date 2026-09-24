"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { LiveTopic } from "~/utils/twitch-server";

const REFRESH_MS = 10_000;

// "1:02:03" or "2:03"
const formatElapsed = (ms: number) => {
  const total = Math.max(Math.floor(ms / 1000), 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};

export const LiveTopicView = (
  props:
    | { topic: LiveTopic; status?: never }
    | { status: string; topic?: never }
) => {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());

  // Ticks the timer, and gets new markers from the server every REFRESH_MS
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const refresh = setInterval(() => router.refresh(), REFRESH_MS);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [router]);

  return (
    <div className="fixed inset-0 flex flex-col justify-center gap-[2vh] overflow-hidden bg-black p-[4vmin] text-white">
      {props.topic ? (
        <>
          <div
            className="line-clamp-2 font-semibold leading-tight"
            style={{ fontSize: "min(9vw, 18vh)" }}
          >
            {props.topic.type === "end"
              ? `Ended: ${props.topic.label}`
              : props.topic.label}
          </div>
          <div
            className="font-mono font-bold tabular-nums leading-none"
            style={{ fontSize: "min(18vw, 40vh)" }}
            // Server and client clocks can be a second apart on first render
            suppressHydrationWarning
          >
            {formatElapsed(now - props.topic.startedAt)}
          </div>
        </>
      ) : (
        <div style={{ fontSize: "min(9vw, 18vh)" }}>{props.status}</div>
      )}
    </div>
  );
};
