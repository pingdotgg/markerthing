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
        isIntro: true,
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

  it("drops clips before the offset and keeps VOD times for seeking", () => {
    const segments = buildSegments({
      markers: [
        marker(100, "Before camera"),
        marker(300, "OFFSET 00:06:40"),
        marker(400, "On camera"),
      ],
      videoSeconds: 1000,
      offsetSeconds: 400,
      bufferSeconds: 0,
    });

    expect(segments).toEqual([
      {
        id: "m300",
        type: "offset",
        label: "00:06:40",
        vodStart: 300,
        vodEnd: 400,
        startTime: 0,
        endTime: 0,
      },
      {
        id: "m400",
        type: "start",
        label: "On camera",
        vodStart: 400,
        vodEnd: 1000,
        startTime: 0,
        endTime: 600,
      },
    ]);
  });

  it("does not end a clip at an offset marker", () => {
    const segments = buildSegments({
      markers: [
        marker(0, "Chrome"),
        marker(300, "OFFSET 00:04:00"),
        marker(600, "React"),
      ],
      videoSeconds: 900,
      offsetSeconds: 240,
      bufferSeconds: 0,
    });

    expect(segments.map((s) => [s.label, s.vodStart, s.vodEnd])).toEqual([
      ["Chrome", 0, 600],
      ["00:04:00", 300, 600],
      ["React", 600, 900],
    ]);
    expect(toCsv(segments)).toBe(["0,360,Chrome", "360,660,React"].join("\n"));
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

  it("writes only marked start clips to the CSV, quoting labels when needed", () => {
    expect(toCsv(segments)).toBe(
      ['0,100,"React, Vue, and ""Svelte"""', "93590,97210,Late night"].join(
        "\n"
      )
    );
  });

  it("numbers labels so exported files sort in order", () => {
    const clips = segments.filter((s) => s.type === "start" && !s.isIntro);
    expect(numberLabels(clips).map((s) => s.label)).toEqual([
      '01 React, Vue, and "Svelte"',
      "02 Late night",
    ]);
    // A clip keeps its number when an export leaves earlier clips out
    const order = clips.map((s) => s.id);
    expect(numberLabels(clips.slice(1), order)[0]!.label).toBe("02 Late night");
  });

  it("finds the camera start from an OFFSET marker", () => {
    const offsetFrom = (description: string) =>
      findMarkedOffset(
        buildSegments({
          markers: [marker(300, description)],
          videoSeconds: 1000,
        })
      );

    expect(offsetFrom("OFFSET 00:08:20")).toBe(500);
    expect(offsetFrom("OFFSET")).toBe(300);
    expect(offsetFrom("OFFSET 40:61")).toBeUndefined();
    expect(offsetFrom("Chrome")).toBeUndefined();
  });

  it("adds an Intro chapter when the offset skips early clips", () => {
    const offsetSegments = buildSegments({
      markers: [
        marker(100, "Before camera"),
        marker(300, "END"),
        marker(400, "On camera"),
      ],
      videoSeconds: 1000,
      offsetSeconds: 350,
    });
    expect(toYouTubeChapters(offsetSegments)).toBe(
      ["00:00:00 Intro", "00:00:40 On camera"].join("\n")
    );
  });

  it("drops a YouTube chapter shorter than 10 seconds and keeps the later one", () => {
    const shortSegments = buildSegments({
      markers: [
        // With the 10s buffer, Chrome starts 2s after the intro
        marker(12, "Chrome"),
        marker(100, "React"),
        // 5s after React
        marker(105, "Vue"),
        marker(300, "Svelte"),
      ],
      videoSeconds: 600,
    });
    expect(toYouTubeChapters(shortSegments)).toBe(
      ["00:00:00 Chrome", "00:01:35 Vue", "00:04:50 Svelte"].join("\n")
    );
  });

  it("keeps one YouTube chapter per timestamp", () => {
    expect(toYouTubeChapters(segments)).toBe(
      ['00:00:00 React, Vue, and "Svelte"', "25:59:50 Late night"].join("\n")
    );
  });
});
