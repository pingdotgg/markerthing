"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  buildSegments,
  findMarkedOffset,
  formatClipNumber,
  formatSeconds,
  MAX_BUFFER_SECONDS,
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

// "1:05:12" or "5:12"
const formatClock = (totalSeconds: number) => {
  const [h, m, s] = formatSeconds(totalSeconds).split(":").map(Number);
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};

// "1h 20m", "10m 8s" or "45s"
const formatLength = (totalSeconds: number) => {
  const [h, m, s] = formatSeconds(totalSeconds).split(":").map(Number);
  if (h) return `${h}h ${m}m`;
  if (m) return s ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
};

// Small square checkbox: outlined when off, solid white when on
const checkboxClasses =
  "h-3 w-3 shrink-0 appearance-none border border-zinc-600 checked:border-zinc-400 checked:bg-zinc-400";

// Plain text actions. Disabled ones fade out and cannot be clicked.
const actionClasses =
  "whitespace-nowrap text-zinc-400 hover:text-white disabled:pointer-events-none disabled:text-zinc-700 aria-disabled:pointer-events-none aria-disabled:text-zinc-700";

const PlayIcon = () => (
  <svg viewBox="0 0 10 10" className="h-2 w-2 fill-current">
    <path d="M1 0.5v9l8-4.5z" />
  </svg>
);

// Copy chapters and download CSV for one export target
const ExportRow = (props: {
  title: string;
  chapters: string;
  csv: string;
  fileName: string;
  disabled?: boolean;
  // Small color key that matches the timeline strip
  marker?: React.ReactNode;
  children?: React.ReactNode;
}) => (
  <div className="flex items-center gap-4">
    <span className="mr-auto flex items-center gap-2">
      {props.marker}
      {props.title}
      {props.children}
    </span>
    <button
      type="button"
      disabled={props.disabled}
      className={actionClasses}
      onClick={() => {
        navigator.clipboard.writeText(props.chapters).then(
          () => toast.success("Copied YouTube chapters"),
          () => toast.error("Could not copy to the clipboard")
        );
      }}
    >
      Copy chapters
    </button>
    {/* No href while disabled, so the link cannot be clicked or keyboard activated */}
    <a
      href={
        props.disabled
          ? undefined
          : `data:text/csv;charset=utf-8,${encodeURIComponent(props.csv)}`
      }
      download={props.fileName}
      aria-disabled={props.disabled}
      className={actionClasses}
    >
      Download CSV
    </a>
  </div>
);

export const VodPlayer = (props: { vod: VOD; initial: VodSettings }) => {
  const { vod } = props;
  const videoSeconds = parseTwitchDuration(vod.duration);

  const playerRef = useRef<Player | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const [buffer, setBuffer] = useState(props.initial.buffer);
  const [numbered, setNumbered] = useState(props.initial.numbered);
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [renamed, setRenamed] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string>();

  // Times in the list always match the Twitch VOD
  const vodSegments = useMemo(
    () =>
      buildSegments({
        markers: vod.markers,
        videoSeconds,
        bufferSeconds: buffer,
      }),
    [vod.markers, videoSeconds, buffer]
  );
  // The clips you marked. The fake intro only labels chapters, so it is not
  // listed or exported. toYouTubeChapters adds its own Intro chapter.
  const clips = vodSegments.filter((s) => s.type === "start" && !s.isIntro);

  // An OFFSET marker fills in the camera start, unless the URL has one
  const markedOffset = findMarkedOffset(vodSegments);
  const [cameraInput, setCameraInput] = useState(
    props.initial.offset ||
      (markedOffset === undefined ? "" : formatClock(markedOffset))
  );
  const cameraSeconds =
    cameraInput.trim() === "" ? undefined : parseOffsetValue(cameraInput);
  const cameraInvalid =
    cameraInput.trim() !== "" && cameraSeconds === undefined;

  const cameraSegments = useMemo(
    () =>
      cameraSeconds === undefined
        ? []
        : buildSegments({
            markers: vod.markers,
            videoSeconds,
            offsetSeconds: cameraSeconds,
            bufferSeconds: buffer,
          }),
    [vod.markers, videoSeconds, cameraSeconds, buffer]
  );

  // A cleared rename falls back to the marker's own label
  const labelOf = (clip: Segment) => renamed[clip.id]?.trim() || clip.label;

  // Export data only changes with these inputs, not with the 1s playhead poll
  const exports = useMemo(() => {
    // The checked clips, with renames and optional "01 " numbers
    const pick = (segments: Segment[]) =>
      segments
        .filter((s) => s.type === "start" && !s.isIntro && !excluded.has(s.id))
        .map((s) => ({ ...s, label: renamed[s.id]?.trim() || s.label }));
    const vodClips = pick(vodSegments);
    const cameraClips = pick(cameraSegments);
    const order = vodClips.map((clip) => clip.id);
    const toFileCsv = (picked: Segment[]) =>
      toCsv(numbered ? numberLabels(picked, order) : picked);

    return {
      count: vodClips.length,
      numbers: new Map(
        order.map((id, i) => [id, formatClipNumber(i + 1, order.length)])
      ),
      vod: { chapters: toYouTubeChapters(vodClips), csv: toFileCsv(vodClips) },
      camera: {
        chapters: toYouTubeChapters(cameraClips),
        csv: toFileCsv(cameraClips),
      },
    };
  }, [vodSegments, cameraSegments, excluded, renamed, numbered]);

  // A clip is playing from its padded start until the next clip takes over
  const activeId = clips.findLast(
    (clip) =>
      Math.max(clip.vodStart - buffer, 0) <= currentTime &&
      currentTime < clip.vodEnd
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

    // The embed has no time update event, so poll to track the playhead
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

  const seek = (clip: Segment) => {
    const time = Math.max(clip.vodStart - buffer, 0);
    playerRef.current?.seek(time);
    setCurrentTime(time);
  };

  const updateCamera = (value: string) => {
    setCameraInput(value);
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

  const percent = (seconds: number) =>
    `${(Math.min(seconds, videoSeconds) / (videoSeconds || 1)) * 100}%`;
  const fileDate = vod.created_at.replaceAll(":", "-");

  // Only shown when it helps: a bad value, or no value yet
  const cameraNote = cameraInvalid
    ? "Use H:MM:SS, MM:SS or seconds"
    : cameraSeconds === undefined
    ? "Seek to where your camera starts, or add /marker OFFSET when you start recording"
    : markedOffset !== undefined && cameraSeconds === markedOffset
    ? "From your OFFSET marker"
    : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-4 pb-4 pt-2 sm:flex-row sm:overflow-hidden sm:px-8 sm:pb-8">
      <Script
        src="https://player.twitch.tv/js/embed/v1.js"
        onReady={() => setScriptReady(true)}
      />
      <Toaster
        toastOptions={{ className: "rounded-none bg-zinc-900 text-white" }}
      />

      {/* Video */}
      <div className="flex min-w-0 flex-col sm:flex-1">
        <div id="vod-player" className="aspect-video w-full bg-zinc-950" />

        {/* Clips on the stream timeline. Gaps are time no clip covers. */}
        <div className="relative h-2 w-full bg-zinc-950">
          {clips.map((clip) => (
            <button
              key={clip.id}
              type="button"
              title={`${labelOf(clip)} (${formatClock(clip.vodStart)})`}
              onClick={() => seek(clip)}
              className={`absolute inset-y-0 border-l border-black ${
                clip.id === activeId
                  ? "bg-white"
                  : excluded.has(clip.id)
                  ? "bg-zinc-900"
                  : "bg-zinc-600 hover:bg-zinc-400"
              }`}
              style={{
                left: percent(clip.vodStart),
                width: percent(clip.vodEnd - clip.vodStart),
              }}
            />
          ))}
          {cameraSeconds !== undefined && (
            <div
              title="Camera starts"
              className="pointer-events-none absolute -inset-y-1 w-0.5 bg-pink-500"
              style={{ left: percent(cameraSeconds) }}
            />
          )}
          <div
            className="pointer-events-none absolute -inset-y-1 w-0.5 bg-white"
            style={{ left: percent(currentTime) }}
          />
        </div>

        <h1 className="mt-4 text-lg font-semibold">{vod.title}</h1>
        <div className="mt-1 flex gap-3 text-sm text-zinc-500">
          <Link href={`/${vod.user_login}`} className="hover:text-white">
            {vod.user_name}
          </Link>
          <span>{vod.created_at.slice(0, 10)}</span>
          <span>{formatLength(videoSeconds)}</span>
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

      {/* Export and clips */}
      <div className="flex min-h-0 shrink-0 flex-col text-sm sm:w-[26rem]">
        <div className="flex flex-col gap-3">
          <ExportRow
            title="VOD"
            chapters={exports.vod.chapters}
            csv={exports.vod.csv}
            fileName={`${fileDate} VOD MARKERS.csv`}
          />
          <div className="flex flex-col gap-1">
            <ExportRow
              title="Camera"
              marker={<span className="h-1.5 w-1.5 bg-pink-500" />}
              chapters={exports.camera.chapters}
              csv={exports.camera.csv}
              fileName={`${fileDate} CAMERA MARKERS.csv`}
              disabled={cameraSeconds === undefined}
            >
              <span className="hidden text-zinc-500 sm:inline">from</span>
              <input
                value={cameraInput}
                onChange={(e) => updateCamera(e.target.value)}
                placeholder="0:00"
                aria-invalid={cameraInvalid}
                aria-label="Camera recording start"
                className={`w-16 border-b bg-transparent tabular-nums outline-none placeholder:text-zinc-700 focus:border-white ${
                  cameraInvalid ? "border-red-500" : "border-zinc-700"
                }`}
              />
            </ExportRow>
            <div className="flex items-start gap-4 text-zinc-500">
              <span className="mr-auto">{cameraNote}</span>
              <button
                type="button"
                className={`${actionClasses} shrink-0`}
                onClick={() =>
                  updateCamera(
                    formatClock(playerRef.current?.getCurrentTime() ?? 0)
                  )
                }
              >
                Use player time
              </button>
            </div>
          </div>
          <div className="flex items-center gap-6 text-zinc-400">
            <label className="flex items-center gap-2">
              Padding
              <input
                type="number"
                min={0}
                max={MAX_BUFFER_SECONDS}
                value={buffer}
                onChange={(e) => {
                  const value = Math.floor(Number(e.target.value));
                  if (!Number.isFinite(value)) return;
                  const clamped = Math.min(
                    Math.max(value, 0),
                    MAX_BUFFER_SECONDS
                  );
                  setBuffer(clamped);
                  setUrlParam("buffer", String(clamped));
                }}
                className="w-10 border-b border-zinc-700 bg-transparent text-right tabular-nums text-white outline-none focus:border-white"
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
                className={checkboxClasses}
              />
              Number file names
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-baseline justify-between border-t border-zinc-900 pt-4">
          <h2 className="font-semibold">Clips</h2>
          <span className="tabular-nums text-zinc-500">{`${exports.count} of ${clips.length}`}</span>
        </div>

        <ol className="-mx-2 mt-2 min-h-0 flex-1 overflow-y-auto">
          {clips.map((clip) => {
            const included = !excluded.has(clip.id);
            return (
              <li
                key={clip.id}
                className={`flex items-center gap-3 px-2 py-1.5 ${
                  clip.id === activeId ? "bg-zinc-900" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={included}
                  onChange={() => toggleClip(clip.id)}
                  aria-label={`Export ${clip.label}`}
                  className={checkboxClasses}
                />
                {numbered && (
                  <span className="w-5 tabular-nums text-zinc-500">
                    {exports.numbers.get(clip.id)}
                  </span>
                )}
                {editingId === clip.id ? (
                  <input
                    autoFocus
                    value={renamed[clip.id] ?? clip.label}
                    onChange={(e) =>
                      setRenamed((prev) => ({
                        ...prev,
                        [clip.id]: e.target.value,
                      }))
                    }
                    onBlur={() => setEditingId(undefined)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setEditingId(undefined);
                    }}
                    aria-label="Clip name"
                    className="min-w-0 flex-1 border-b border-white bg-transparent outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingId(clip.id)}
                    title="Click to rename"
                    className={`min-w-0 flex-1 text-left ${
                      included ? "text-white" : "text-zinc-600"
                    }`}
                  >
                    {labelOf(clip)}
                  </button>
                )}
                <span className="tabular-nums text-zinc-600">
                  {formatLength(clip.vodEnd - clip.vodStart)}
                </span>
                <button
                  type="button"
                  onClick={() => seek(clip)}
                  title="Play from here"
                  className="flex w-[4.5rem] items-center justify-end gap-1.5 tabular-nums text-zinc-400 hover:text-white"
                >
                  <PlayIcon />
                  {formatClock(clip.vodStart)}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};
