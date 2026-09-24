"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  buildSegments,
  formatSeconds,
  numberLabels,
  parseOffsetValue,
  parseTwitchDuration,
  toCsv,
  toYouTubeChapters,
  type Segment,
} from "~/utils/markers";
import type { VOD } from "~/utils/twitch-server";
import type { Player } from "~/utils/types/twitch-player";

// Settings that live in the URL, so a refresh or a shared link keeps them
export type VodSettings = { offset: string; buffer: number; numbered: boolean };

function setUrlParam(key: string, value: string | undefined) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  window.history.replaceState(null, "", url);
}

const inputClasses =
  "border bg-zinc-950 px-2 py-1 font-mono outline-none focus:border-white";
const buttonClasses =
  "border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900 aria-disabled:pointer-events-none aria-disabled:opacity-40";

export const VodPlayer = (props: { vod: VOD; initial: VodSettings }) => {
  const { vod } = props;

  const playerRef = useRef<Player | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const [offsetInput, setOffsetInput] = useState(props.initial.offset);
  const [buffer, setBuffer] = useState(props.initial.buffer);
  const [numbered, setNumbered] = useState(props.initial.numbered);
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [renamed, setRenamed] = useState<Record<string, string>>({});

  // Empty means no offset. Anything else has to parse.
  const offsetSeconds =
    offsetInput.trim() === "" ? 0 : parseOffsetValue(offsetInput);
  const offsetInvalid = offsetSeconds === undefined;

  const segments = useMemo(
    () =>
      buildSegments({
        markers: vod.markers,
        videoSeconds: parseTwitchDuration(vod.duration),
        offsetSeconds: offsetSeconds ?? 0,
        bufferSeconds: buffer,
      }),
    [vod, offsetSeconds, buffer]
  );

  const totalClips = segments.filter((s) => s.type === "start").length;
  const clips = segments
    .filter((s) => s.type === "start" && !excluded.has(s.id))
    .map((s) => ({ ...s, label: renamed[s.id] ?? s.label }));
  const clipNumbers = new Map(clips.map((clip, i) => [clip.id, i + 1]));
  const csvClips = numbered ? numberLabels(clips) : clips;

  // Rows start where a click seeks to: the marker minus the buffer
  const activeId = segments.findLast(
    (s) => Math.max(s.vodStart - buffer, 0) <= currentTime
  )?.id;

  useEffect(() => {
    if (!scriptReady || !window.Twitch) return;

    const player = new window.Twitch.Player("vod-player", {
      width: "100%",
      height: "100%",
      video: vod.id,
      autoplay: false,
    });
    playerRef.current = player;

    // The embed has no time update event, so poll to highlight the playing clip
    const interval = setInterval(
      () => setCurrentTime(Math.floor(player.getCurrentTime())),
      1000
    );

    return () => {
      clearInterval(interval);
      playerRef.current = null;
      document.getElementById("vod-player")?.replaceChildren();
    };
  }, [scriptReady, vod.id]);

  const seek = (segment: Segment) => {
    const time = Math.max(segment.vodStart - buffer, 0);
    playerRef.current?.seek(time);
    setCurrentTime(time);
  };

  const updateOffset = (value: string) => {
    setOffsetInput(value);
    const trimmed = value.trim();
    if (trimmed === "" || parseOffsetValue(trimmed) !== undefined) {
      setUrlParam("offset", trimmed || undefined);
    }
  };

  const toggleClip = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const numberWidth = Math.max(2, String(clips.length).length);
  const csvName = `${vod.created_at.replaceAll(":", "-")} VOD MARKERS${
    offsetSeconds ? ` - ${offsetSeconds}s` : ""
  }.csv`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-black p-4 sm:flex-row sm:overflow-hidden">
      <Script
        src="https://player.twitch.tv/js/embed/v1.js"
        onReady={() => setScriptReady(true)}
      />
      <Toaster
        toastOptions={{ className: "rounded-none bg-zinc-900 text-white" }}
      />

      {/* Video */}
      <div className="flex min-w-0 flex-col gap-2 sm:flex-1">
        <div id="vod-player" className="aspect-video w-full bg-zinc-950" />
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="font-semibold">{vod.title}</h1>
          <div className="font-mono flex gap-3 text-sm text-zinc-400">
            <Link href={`/${vod.user_login}`} className="hover:text-white">
              {vod.user_name}
            </Link>
            <span>{vod.created_at.slice(0, 10)}</span>
            <span>{formatSeconds(parseTwitchDuration(vod.duration))}</span>
            <a
              href={vod.url}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              Twitch ↗
            </a>
          </div>
        </div>
      </div>

      {/* Markers */}
      <div className="flex min-h-0 shrink-0 flex-col gap-3 text-sm sm:w-[30rem]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2">
            Offset
            <input
              value={offsetInput}
              onChange={(e) => updateOffset(e.target.value)}
              placeholder="00:00:00"
              aria-invalid={offsetInvalid}
              className={`${inputClasses} w-24 ${
                offsetInvalid ? "border-red-500" : "border-zinc-800"
              }`}
            />
          </label>
          <label className="flex items-center gap-2">
            Buffer
            <input
              type="number"
              min={0}
              value={buffer}
              onChange={(e) => {
                const value = Math.max(0, Math.floor(Number(e.target.value)));
                setBuffer(value);
                setUrlParam("buffer", String(value));
              }}
              className={`${inputClasses} w-16 border-zinc-800`}
            />
            s
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={numbered}
              onChange={(e) => {
                setNumbered(e.target.checked);
                setUrlParam("numbered", e.target.checked ? "1" : undefined);
              }}
              className="accent-white"
            />
            Number files
          </label>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono mr-auto text-zinc-400">
            {`${clips.length}/${totalClips} clips`}
          </span>
          <button
            type="button"
            aria-disabled={offsetInvalid}
            className={buttonClasses}
            onClick={() => {
              navigator.clipboard.writeText(toYouTubeChapters(clips));
              toast.success("Copied YouTube chapters");
            }}
          >
            Copy chapters
          </button>
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(
              toCsv(csvClips)
            )}`}
            download={csvName}
            aria-disabled={offsetInvalid}
            className={`${buttonClasses} border-white bg-white text-black hover:bg-zinc-200`}
          >
            Download CSV
          </a>
        </div>

        <ol className="min-h-0 flex-1 overflow-y-auto border-t border-zinc-800">
          {segments.map((segment) => {
            const included = !excluded.has(segment.id);
            const number = clipNumbers.get(segment.id);

            return (
              <li
                key={segment.id}
                onClick={() => seek(segment)}
                className={`font-mono grid h-9 cursor-pointer grid-cols-[1.25rem_1.75rem_4.5rem_1fr] items-center gap-2 border-b border-zinc-900 px-2 hover:bg-zinc-900 sm:grid-cols-[1.25rem_1.75rem_4.5rem_4.5rem_1fr] ${
                  segment.id === activeId ? "bg-zinc-900" : ""
                } ${segment.type === "start" ? "" : "text-zinc-500"}`}
              >
                {segment.type === "start" ? (
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={() => toggleClip(segment.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Export ${segment.label}`}
                    className="accent-white"
                  />
                ) : (
                  <span />
                )}
                <span className="text-zinc-500">
                  {number ? String(number).padStart(numberWidth, "0") : ""}
                </span>
                <span>{formatSeconds(segment.startTime)}</span>
                <span className="hidden text-zinc-500 sm:block">
                  {segment.type === "start"
                    ? formatSeconds(segment.endTime - segment.startTime)
                    : ""}
                </span>

                {segment.type === "start" && (
                  <input
                    value={renamed[segment.id] ?? segment.label}
                    onChange={(e) =>
                      setRenamed((prev) => ({
                        ...prev,
                        [segment.id]: e.target.value,
                      }))
                    }
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Clip name"
                    className={`font-sans min-w-0 bg-transparent outline-none focus:bg-zinc-950 ${
                      included ? "text-white" : "text-zinc-500 line-through"
                    }`}
                  />
                )}
                {segment.type === "end" && (
                  <span className="font-sans truncate">
                    {segment.label ? `End: ${segment.label}` : "End"}
                  </span>
                )}
                {segment.type === "offset" && (
                  <span className="font-sans flex min-w-0 items-center gap-2">
                    <span className="truncate">{`Offset ${segment.label}`}</span>
                    {parseOffsetValue(segment.label) !== undefined && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateOffset(segment.label);
                        }}
                        className="text-white underline"
                      >
                        Use
                      </button>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};
