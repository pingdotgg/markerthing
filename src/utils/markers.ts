// Turns Twitch stream markers into clip segments, CSV rows and YouTube chapters.
//
// Marker syntax (tags are case-insensitive):
// "Talking about Chrome"        starts a clip
// "START: Talking about Chrome" same as above ("START" and "START OF" work too)
// "END: Talking about Chrome"   ends the previous clip ("END" and "END OF" work too)
// "OFFSET 00:40:31"             offset for camera footage (00-40-31 works too)
// "-2 Talking about Chrome"     starts 2 minutes before the marker was placed
// "-30s Talking about Chrome"   starts 30 seconds before the marker was placed

export type TwitchMarker = { position_seconds: number; description: string };

export type MarkerType = "start" | "end" | "offset";

export type Segment = {
  type: MarkerType;
  label: string;
  // Position in the VOD, for seeking
  vodStart: number;
  vodEnd: number;
  // Bounds in the exported footage, with offset and buffer applied
  startTime: number;
  endTime: number;
  // Only set on the fake "Intro" clip that buildSegments adds
  isIntro?: true;
};

// Seconds of padding on each side of an exported clip
export const EXPORT_BUFFER_SECONDS = 10;

// A tag only counts as a whole word: "END: x", "End of x", "END x" or "END".
// "Endgame talk" and "Startup ideas" are plain labels.
const TAG_PATTERN = /^(start|end|offset)(?:\s*:|\s+of\b|\s+|$)\s*/i;

export function parseMarkerLabel(description: string): {
  type: MarkerType;
  label: string;
} {
  const match = TAG_PATTERN.exec(description);
  if (!match) return { type: "start", label: description.trim() };

  const type = match[1]!.toLowerCase() as MarkerType;
  const label = description.slice(match[0].length).trim();
  return {
    type,
    label: type === "offset" ? label.replaceAll("-", ":") : label,
  };
}

// Reads a leading rewind like "-2" (minutes), "-2m" or "-30s" off a marker.
// Lets you mark something retroactively, after it already started.
export function parseRewind(description: string) {
  const match = /^-(\d+)([ms])?(?:\s+|$)/i.exec(description);
  if (!match) return { rewindSeconds: 0, description };

  const amount = parseInt(match[1]!, 10);
  const isSeconds = match[2]?.toLowerCase() === "s";

  return {
    rewindSeconds: isSeconds ? amount : amount * 60,
    description: description.slice(match[0].length),
  };
}

// Parses "HH:MM:SS", "MM:SS" or "SS" into seconds.
// Minutes and seconds after a colon must be 59 or less, to catch typos.
export function parseOffsetValue(value: string): number | undefined {
  const parts = value.trim().split(":");
  if (
    parts.length > 3 ||
    parts.some((part) => !/^\d+$/.test(part)) ||
    parts.slice(1).some((part) => Number(part) > 59)
  ) {
    return undefined;
  }
  return parts.reduce((total, part) => total * 60 + Number(part), 0);
}

// Parses a Twitch VOD duration like "8h32m12s" into seconds
export function parseTwitchDuration(input: string): number {
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(input);
  if (!match) return 0;

  const [, hours = "0", minutes = "0", seconds = "0"] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

// Formats seconds as HH:MM:SS. Hours keep counting past 24.
export function formatSeconds(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(seconds / 3600))}:${pad(
    Math.floor((seconds % 3600) / 60)
  )}:${pad(seconds % 60)}`;
}

// Each marker runs until the next start or end marker (or the end of the VOD).
// Offset markers only set the offset, so they never end a clip.
// Start clips that end before the offset are dropped, since they are not in
// the offset footage.
export function buildSegments(opts: {
  markers: TwitchMarker[];
  videoSeconds: number;
  offsetSeconds?: number;
  bufferSeconds?: number;
}): Segment[] {
  const offset = opts.offsetSeconds ?? 0;
  const buffer = opts.bufferSeconds ?? EXPORT_BUFFER_SECONDS;

  // Apply rewinds first, so the previous marker ends where the rewound one starts
  const markers = opts.markers
    .map((marker) => {
      const { rewindSeconds, description } = parseRewind(marker.description);
      return {
        vodStart: Math.max(marker.position_seconds - rewindSeconds, 0),
        ...parseMarkerLabel(description),
      };
    })
    .sort((a, b) => a.vodStart - b.vodStart);

  // Add a fake "Intro" start marker at 0, unless a real start marker is there.
  // It goes after other markers at 0, so it runs until the next real marker.
  // YouTube chapters use it to label the start. The CSV leaves it out.
  const hasStartAtZero = markers.some(
    (m) => m.vodStart === 0 && m.type === "start"
  );
  const withIntro = hasStartAtZero
    ? markers
    : [
        ...markers.filter((m) => m.vodStart === 0),
        {
          vodStart: 0,
          type: "start" as const,
          label: "Intro",
          isIntro: true as const,
        },
        ...markers.filter((m) => m.vodStart > 0),
      ];

  return withIntro.flatMap((marker, i) => {
    const nextMarker = withIntro.slice(i + 1).find((m) => m.type !== "offset");
    const vodEnd = nextMarker?.vodStart ?? opts.videoSeconds;
    if (marker.type === "start" && vodEnd <= offset) return [];

    return {
      ...marker,
      vodEnd,
      startTime: Math.max(marker.vodStart - offset - buffer, 0),
      endTime: vodEnd - offset + buffer,
    };
  });
}

const toCsvField = (value: string) =>
  /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

// CSV for LosslessCut: "start,end,label" per clip, in seconds.
// Only clips you marked. The fake intro is left out.
export function toCsv(segments: Segment[]): string {
  return segments
    .filter((s) => s.type === "start" && !s.isIntro)
    .map((s) => `${s.startTime},${s.endTime},${toCsvField(s.label)}`)
    .join("\n");
}

// YouTube ignores all chapters unless the first one is at 00:00:00
// and each one is at least 10 seconds long.
const MIN_CHAPTER_SECONDS = 10;

// One chapter per start clip.
// With an offset, the first clip can start after 00:00:00. Then an "Intro"
// chapter at 00:00:00 labels the footage before it.
// When a chapter starts less than 10 seconds after the one before it, the
// earlier one is dropped. If that was the first chapter, the next one moves
// to 00:00:00.
export function toYouTubeChapters(segments: Segment[]): string {
  const clips = segments.filter((s) => s.type === "start");
  const intro =
    (clips[0]?.startTime ?? 0) > 0 ? [{ startTime: 0, label: "Intro" }] : [];
  const chapters = [...intro, ...clips];

  return chapters
    .filter((chapter, i) => {
      const next = chapters[i + 1];
      return !next || next.startTime - chapter.startTime >= MIN_CHAPTER_SECONDS;
    })
    .map(
      (chapter, i) =>
        `${formatSeconds(i === 0 ? 0 : chapter.startTime)} ${chapter.label}`
    )
    .join("\n");
}
