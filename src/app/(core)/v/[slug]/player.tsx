"use client";

import * as dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Button, ButtonLink } from "~/app/_components/common/button";
import { Card } from "~/app/_components/common/card";
import { TextInput } from "~/app/_components/common/text-input";
import type { VOD } from "~/utils/twitch-server";
import { Player } from "~/utils/types/twitch-player";
dayjs.extend(duration);

function parseOffsetValue(value: string): number | undefined {
  // if there are no colons, assume its seconds
  if (/^\d+$/.test(value)) return parseInt(value, 10);

  // Supports HH:MM:SS, MM:SS, SS
  // If it's not in the format, return undefined
  if (!/^([0-5]?[0-9]:){0,2}[0-5][0-9]$/.test(value)) return undefined;

  return value
    .split(":")
    .reduce((acc, cur) => (acc = acc * 60 + parseInt(cur, 10)), 0);
}

// Example marker labels
// "Talking about Chrome" - no metadata, just label
// "START: Talking about Chrome" - start marker, same as above
// "END: Talking about Chrome" - end marker, tagged accordingly so it can be filtered out
// "End of Talking about Chrome" - end marker, same as above
// "OFFSET 00:40:31" - offset marker

const START_LABELS = ["START:", "START OF", "START"];
const END_LABELS = ["END:", "END OF", "END"];
const OFFSET_LABELS = ["OFFSET", "OFFSET:"];
const LABELS = [...START_LABELS, ...END_LABELS, ...OFFSET_LABELS];

function parseMetadataFromMarker(marker: string) {
  for (const tl of START_LABELS) {
    if (marker.toLowerCase().startsWith(tl.toLowerCase())) {
      return {
        type: "start",
        label: marker.slice(tl.length).trim(),
      };
    }
  }

  for (const tl of END_LABELS) {
    if (marker.toLowerCase().startsWith(tl.toLowerCase())) {
      return {
        type: "end",
        label: marker.slice(tl.length).trim(),
      };
    }
  }

  for (const tl of OFFSET_LABELS) {
    if (marker.toLowerCase().startsWith(tl.toLowerCase())) {
      return {
        type: "offset",
        label: marker.slice(tl.length).trim(),
      };
    }
  }

  return {
    type: "start",
    label: marker,
  };
}

function parseMarkers(props: { vod: VOD; offset?: { totalSeconds: number } }) {
  const videoDuration = getDurationFromTwitchFormat(
    (props.vod as any)?.duration ?? "0h0m0s"
  );

  const mockedMarkers = [
    { position_seconds: 0, id: "start", description: "Intro" },
    ...props.vod.markers,
  ];

  const OFFSET = props.offset?.totalSeconds ?? 0;

  const taggedMarkers = mockedMarkers.map((marker, id) => {
    let endTime =
      (mockedMarkers[id + 1]?.position_seconds ??
        (videoDuration as duration.Duration)?.asSeconds?.()) - OFFSET;

    endTime += EXPORT_BUFFER;

    if (endTime < 0) endTime = 1;

    const startTime = Math.max(
      marker.position_seconds - OFFSET - EXPORT_BUFFER,
      0
    );

    const duration = dayjs
      .duration(endTime * 1000 - startTime * 1000)
      .format("HH:mm:ss");

    const taggedDescription = parseMetadataFromMarker(marker.description);

    return {
      startTime,
      endTime,
      duration,
      ...taggedDescription,
    };
  });

  const filteredMarkers = taggedMarkers.filter((m) => m.type === "start");

  const ytChapters = filteredMarkers.reduce((acc, marker) => {
    const startTime = new Date(marker.startTime * 1000);
    const timeStr = startTime.toISOString().substr(11, 8);
    return `${acc}${marker.label} - ${timeStr}\n`;
  }, "");

  const csv = filteredMarkers
    .map((marker) => {
      return `${marker.startTime},${marker.endTime},${marker.label}`;
    })
    .join("\n");

  return {
    taggedMarkers,
    filteredMarkers,
    ytChapters,
    csv,
  };
}

// Converts "8h32m12s" format into dayjs duration
// I absolutely hate this function and would love ANYTHING better
const getDurationFromTwitchFormat = (input: string) => {
  let preppedInput = input;
  if (!preppedInput.includes("m")) preppedInput = `0m${preppedInput}`;
  if (!preppedInput.includes("h")) preppedInput = `0h${preppedInput}`;

  console.log("INPUT", preppedInput);
  const [hs, hst] = preppedInput.split("h");
  const [ms, mst] = hst!.split("m");
  const [ss] = mst!.split("s");

  const h = +(hs ?? "0");
  const m = +(ms ?? "0");
  const s = +(ss ?? "0");

  return dayjs.duration({ hours: h, minutes: m, seconds: s });
};

const initializePlayer = (
  id: string,
  callback: (player: Player) => void
): (() => void) => {
  // cleanup for previous player for effect bs
  const clearCurrent = () => {
    const playerElement = document.getElementById("vod-player");
    if (playerElement) {
      playerElement.innerHTML = "";
    }
  };

  if (!(window as any).Twitch) {
    const timeout = setTimeout(() => initializePlayer(id, callback), 100);
    return () => {
      clearTimeout(timeout);
      clearCurrent();
    };
  }

  const options = {
    width: "100%",
    height: "100%",
    video: id,
    autoplay: false,
  };
  const player = new (window as any).Twitch!.Player(
    "vod-player",
    options
  ) as Player;

  callback(player);

  return () => {
    console.log(player);
    clearCurrent();
  };
};

// Number of seconds to pad on each side of exported CSV
const EXPORT_BUFFER = 10;

export const VodPlayer = (props: { id: string; vod: VOD }) => {
  const [player, setPlayer] = useState<Player | null>(null);

  useEffect(() => {
    const cleanup = initializePlayer(props.id, setPlayer);

    return cleanup;
  }, [props.id]);

  const [offset, setOffset] = useState<{
    presentational: string;
    totalSeconds: number;
  }>({
    presentational: "0",
    totalSeconds: 0,
  });

  const parsedMarkers = useMemo(() => {
    if (!props.vod) return;

    return parseMarkers({
      vod: props.vod,
      offset: offset,
    });
  }, [props, offset]);

  if (!parsedMarkers) return null;
  const { taggedMarkers, filteredMarkers, ytChapters, csv } = parsedMarkers;

  return (
    <div className="grid min-h-0 flex-1 grid-rows-3 items-start gap-4 overflow-y-hidden p-4 sm:grid-cols-3 sm:grid-rows-1 sm:gap-8 sm:p-8">
      {/* Toast Container */}
      <Toaster
        toastOptions={{
          className: "rounded-lg bg-gray-850 text-gray-50 shadow-md",
        }}
      />
      {/* Video Player */}
      <div className="row-span-1 flex w-full flex-col overflow-hidden rounded-lg border border-gray-950 bg-gray-950 shadow-md sm:col-span-2">
        <div id="vod-player" className="aspect-video w-full !rounded-lg" />
      </div>

      {/* Timestamps */}
      <Card className="row-span-2 flex h-full min-h-0 flex-col gap-2 p-4 shadow-md sm:col-span-1 sm:row-span-1">
        <div className="flex flex-wrap items-center justify-between gap-1.5 ">
          <h1 className="flex items-center gap-1.5 text-lg font-semibold ">
            <span>Timestamps</span>
          </h1>
          <div className="flex items-center gap-1.5">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(ytChapters);
                toast.success("Copied YouTube chapters to clipboard!");
              }}
            >
              {`YT Chapters`}
            </Button>
            <a
              className="relative inline-flex items-center rounded border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-750 hover:text-gray-100"
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
              {...{
                download: `${props.vod?.created_at} VOD MARKERS${
                  offset.totalSeconds ? ` - ${offset.totalSeconds}s` : ""
                }`,
              }}
            >
              {`Download CSV`}
            </a>
          </div>
        </div>
        <div className="mb-2 flex flex-col">
          <label
            htmlFor="offset"
            className="block text-sm font-medium leading-6 text-gray-200"
          >
            {`Offset`}
          </label>
          <TextInput
            type="text"
            value={offset.presentational}
            onChange={(e) =>
              setOffset((prev) => ({ ...prev, presentational: e.target.value }))
            }
            onBlur={(e) =>
              setOffset((prev) => ({
                ...prev,
                totalSeconds: parseOffsetValue(e.target.value) ?? 0,
              }))
            }
          />
          <p className="mt-1 text-xs text-gray-300">
            Accepts HH:MM:SS, MM:SS or SS
          </p>
        </div>

        {props.vod && (
          <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-gray-950/25 bg-gray-950/25 p-2 shadow-inner">
            {filteredMarkers.map((marker, index) => {
              return (
                <li key={marker.startTime}>
                  <button
                    className="w-full"
                    onClick={() => {
                      player?.seek(marker.startTime);
                    }}
                  >
                    <Card className="flex animate-fade-in-down flex-col gap-4 p-4 text-left">
                      <div className="flex justify-between break-words">
                        {`${marker.label}`}
                        <div className="font-mono pl-4 text-xs text-gray-400">
                          {`(${marker.duration})`}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-gray-300">
                        <div className="text-sm">
                          {dayjs
                            .duration(marker.startTime * 1000)
                            .format("HH:mm:ss")}
                          {" - "}
                          {dayjs
                            .duration(marker.endTime * 1000)
                            .format("HH:mm:ss")}
                        </div>
                      </div>
                    </Card>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};
