import { describe, expect, it } from "vitest";
import {
  buildSegments,
  findMarkedOffset,
  formatSeconds,
  numberLabels,
  parseMarkerLabel,
  parseOffsetValue,
  parseRewind,
  parseTwitchDuration,
  toCsv,
  toYouTubeChapters,
} from "./markers";

const marker = (position_seconds: number, description: string) => ({
  id: `m${position_seconds}`,
  position_seconds,
  description,
});

describe("parseMarkerLabel", () => {
  it.each([
    ["Talking about Chrome", "start", "Talking about Chrome"],
    ["START: Talking about Chrome", "start", "Talking about Chrome"],
    ["Start of Talking about Chrome", "start", "Talking about Chrome"],
    ["END: Talking about Chrome", "end", "Talking about Chrome"],
    ["End of Talking about Chrome", "end", "Talking about Chrome"],
    ["end chrome", "end", "chrome"],
    ["END", "end", ""],
    ["OFFSET 00:40:31", "offset", "00:40:31"],
    ["OFFSET: 00:40:31", "offset", "00:40:31"],
    ["offset 00-40-31", "offset", "00:40:31"],
    // Tags must be whole words
    ["Endgame talk", "start", "Endgame talk"],
    ["Ending thoughts", "start", "Ending thoughts"],
    ["Startup pitch", "start", "Startup pitch"],
    ["Offsetting emissions", "start", "Offsetting emissions"],
    ["Start offering discounts", "start", "offering discounts"],
  ])("%s", (description, type, label) => {
    expect(parseMarkerLabel(description)).toEqual({ type, label });
  });
});

describe("parseRewind", () => {
  it.each([
    ["-2 Talking", 120, "Talking"],
    ["-2m Talking", 120, "Talking"],
    ["-30s Talking", 30, "Talking"],
    ["-2", 120, ""],
    ["Talking -2", 0, "Talking -2"],
    ["-2x Talking", 0, "-2x Talking"],
  ])("%s", (input, rewindSeconds, description) => {
    expect(parseRewind(input)).toEqual({ rewindSeconds, description });
  });
});

describe("time parsing and formatting", () => {
  it("parses offsets", () => {
    expect(parseOffsetValue("00:40:31")).toBe(2431);
    expect(parseOffsetValue("40:31")).toBe(2431);
    expect(parseOffsetValue("90")).toBe(90);
    expect(parseOffsetValue("")).toBeUndefined();
    expect(parseOffsetValue("1:2:3:4")).toBeUndefined();
    expect(parseOffsetValue("abc")).toBeUndefined();
    expect(parseOffsetValue("00:40:99")).toBeUndefined();
    expect(parseOffsetValue("40:99")).toBeUndefined();
    expect(parseOffsetValue("99:00")).toBe(5940);
  });

  it("parses Twitch durations", () => {
    expect(parseTwitchDuration("8h32m12s")).toBe(30732);
    expect(parseTwitchDuration("45m3s")).toBe(2703);
    expect(parseTwitchDuration("12s")).toBe(12);
    expect(parseTwitchDuration("nope")).toBe(0);
  });

  it("keeps counting hours past 24", () => {
    expect(formatSeconds(0)).toBe("00:00:00");
    expect(formatSeconds(3661)).toBe("01:01:01");
    expect(formatSeconds(26 * 3600 + 5 * 60)).toBe("26:05:00");
  });
});

describe("buildSegments", () => {
  it("adds an intro and ends clips at the next marker", () => {
    const segments = buildSegments({
      markers: [
        marker(600, "Chrome"),
        marker(900, "END: Chrome"),
        marker(1200, "React"),
      ],
      videoSeconds: 1800,
    });

    expect(segments).toEqual([
      {
        id: "intro",
        type: "start",
        label: "Intro",
        vodStart: 0,
        vodEnd: 600,
        startTime: 0,
        endTime: 610,
      },
      {
        id: "m600",
        type: "start",
        label: "Chrome",
        vodStart: 600,
        vodEnd: 900,
        startTime: 590,
        endTime: 910,
      },
      {
        id: "m900",
        type: "end",
        label: "Chrome",
        vodStart: 900,
        vodEnd: 1200,
        startTime: 890,
        endTime: 1210,
      },
      {
        id: "m1200",
        type: "start",
        label: "React",
        vodStart: 1200,
        vodEnd: 1800,
        startTime: 1190,
        endTime: 1810,
      },
    ]);
  });

  it("applies rewinds before sorting", () => {
    const segments = buildSegments({
      markers: [marker(600, "Chrome"), marker(700, "-3 React")],
      videoSeconds: 1000,
      bufferSeconds: 0,
    });

    expect(segments.map((s) => [s.label, s.vodStart, s.vodEnd])).toEqual([
      ["Intro", 0, 520],
      ["React", 520, 600],
      ["Chrome", 600, 1000],
    ]);
  });

  it("skips the intro when a start marker is at 0", () => {
    const segments = buildSegments({
      markers: [marker(0, "Cold open"), marker(60, "Topic")],
      videoSeconds: 120,
    });

    expect(segments.map((s) => s.label)).toEqual(["Cold open", "Topic"]);
  });

  it("drops clips that end before the offset and keeps VOD times", () => {
    const segments = buildSegments({
      markers: [
        marker(100, "Before camera"),
        marker(300, "OFFSET"),
        marker(400, "On camera"),
      ],
      videoSeconds: 1000,
      offsetSeconds: 350,
      bufferSeconds: 0,
    });

    // The intro ends before the camera starts. The OFFSET marker does not
    // end "Before camera", so its last 50 seconds are in the camera footage.
    expect(
      segments.map((s) => [
        s.label,
        s.vodStart,
        s.vodEnd,
        s.startTime,
        s.endTime,
      ])
    ).toEqual([
      ["Before camera", 100, 400, 0, 50],
      ["", 300, 400, 0, 50],
      ["On camera", 400, 1000, 50, 650],
    ]);
  });
});

describe("exports", () => {
  const segments = buildSegments({
    markers: [
      marker(5, 'React, Vue, and "Svelte"'),
      marker(60, "OFFSET 00:00:30"),
      marker(90, "END"),
      marker(26 * 3600, "Late night"),
    ],
    videoSeconds: 27 * 3600,
  });

  it("writes only start clips to the CSV, quoting labels when needed", () => {
    expect(toCsv(segments)).toBe(
      [
        "0,15,Intro",
        '0,100,"React, Vue, and ""Svelte"""',
        "93590,97210,Late night",
      ].join("\n")
    );
  });

  it("numbers labels so exported files sort in order", () => {
    const clips = segments.filter((s) => s.type === "start");
    expect(numberLabels(clips).map((s) => s.label)).toEqual([
      "01 Intro",
      '02 React, Vue, and "Svelte"',
      "03 Late night",
    ]);
    // A clip keeps its number when an export leaves earlier clips out
    const order = clips.map((s) => s.id);
    expect(numberLabels(clips.slice(2), order)[0]!.label).toBe("03 Late night");
  });

  it("finds the camera start from an OFFSET marker", () => {
    const withTime = buildSegments({
      markers: [marker(300, "OFFSET 00:08:20")],
      videoSeconds: 1000,
    });
    const bare = buildSegments({
      markers: [marker(300, "OFFSET")],
      videoSeconds: 1000,
    });
    const typo = buildSegments({
      markers: [marker(300, "OFFSET 40:61")],
      videoSeconds: 1000,
    });
    const none = buildSegments({
      markers: [marker(300, "Chrome")],
      videoSeconds: 1000,
    });

    expect(findMarkedOffset(withTime)).toBe(500);
    expect(findMarkedOffset(bare)).toBe(300);
    expect(findMarkedOffset(typo)).toBeUndefined();
    expect(findMarkedOffset(none)).toBeUndefined();
  });

  it("starts YouTube chapters at 00:00:00 when the offset skips early clips", () => {
    const offsetSegments = buildSegments({
      markers: [
        marker(100, "Before camera"),
        marker(300, "END"),
        marker(400, "On camera"),
      ],
      videoSeconds: 1000,
      offsetSeconds: 350,
    });
    expect(toYouTubeChapters(offsetSegments)).toBe("00:00:00 On camera");
  });

  it("keeps one YouTube chapter per timestamp", () => {
    expect(toYouTubeChapters(segments)).toBe(
      ['00:00:00 React, Vue, and "Svelte"', "25:59:50 Late night"].join("\n")
    );
  });
});
