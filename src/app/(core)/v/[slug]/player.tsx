"use client";

import * as dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { useEffect, useMemo, useState } from "react";
import { ButtonLink } from "~/app/(components)/common/button";
import { Card } from "~/app/(components)/common/card";
import { TextInput } from "~/app/(components)/common/text-input";
import type { VOD } from "~/utils/twitch-server";
import { Player } from "~/utils/types/twitch-player";
dayjs.extend(duration);

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

export const VodPlayer = (props: { id: string; vod: VOD }) => {
  const [player, setPlayer] = useState<Player | null>(null);

  useEffect(() => {
    const cleanup = initializePlayer(props.id, setPlayer);

    return cleanup;
  }, [props.id]);

  const videoDuration = props.vod
    ? getDurationFromTwitchFormat((props.vod as any)?.duration ?? "0h0m0s")
    : "n/a";

  const mockedMarkers = [
    { position_seconds: 0, id: "start", description: "Intro" },
    ...props.vod.markers,
  ];

  const [offset, setOffset] = useState<{presentational: string, totalSeconds: number}>({
    presentational: '0',
    totalSeconds: 0
  });
  const csv = mockedMarkers.map((marker, id) => {
    const endTime =
      (mockedMarkers[id + 1]?.position_seconds ??
        (videoDuration as duration.Duration)?.asSeconds?.()) - offset.totalSeconds;

    const startTime = Math.max(marker.position_seconds - offset.totalSeconds, 0);

    return `${startTime},${endTime},${marker.description.replace(",", "")}`;
  });

  function parseOffsetValue(value: string): number | undefined {
    // if there are no colons, assume its seconds
    if(/^\d+$/.test(value)) return parseInt(value, 10);
  
    // Supports HH:MM:SS, MM:SS, SS
    // If it's not in the format, return undefined
    if (!/^([0-5]?[0-9]:){0,2}[0-5][0-9]$/.test(value)) return undefined;
  
    return value
      .split(":")
      .reduce((acc, cur) => (acc = acc * 60 + parseInt(cur, 0)), 0);
  }

  return (
    <div className="grid min-h-0 flex-1 grid-rows-3 items-start gap-4 overflow-y-hidden p-4 sm:grid-cols-3 sm:grid-rows-1 sm:gap-8 sm:p-8">
      {/* Video Player */}
      <div className="row-span-1 flex w-full flex-col overflow-hidden rounded-lg border border-gray-950 bg-gray-950 shadow-md sm:col-span-2">
        <div id="vod-player" className="aspect-video w-full !rounded-lg" />
      </div>

      {/* Timestamps */}
      <Card className="row-span-2 flex h-full min-h-0 flex-col gap-2 p-4 shadow-md sm:col-span-1 sm:row-span-1">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-1.5 text-lg font-semibold ">
            <span>Timestamps</span>
          </h1>
          <ButtonLink
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(
              csv.join("\n")
            )}`}
            {...{
              download: `${props.vod?.created_at} VOD MARKERS${
                offset ? ` - ${offset}s` : ""
              }`,
            }}
          >
            {`Download CSV`}
          </ButtonLink>
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
          onChange={(e) => {
            setOffset(prev => {
              return {
                ...prev,
                presentational: e.target.value,
              }
            });
          }}
          onBlur={(e) => {
            const parsedValue = parseOffsetValue(e.target.value);
            setOffset(prev => ({...prev, totalSeconds: parsedValue ? parsedValue : 0}));
          }}
          suffixEl={<span className="text-gray-300">{`seconds`}</span>}
        />
        <p className="text-xs mt-1 text-gray-300">Accepts HH:MM:SS, MM:SS or SS</p>
        </div>

        {props.vod && (
          <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-gray-950/25 bg-gray-950/25 p-2 shadow-inner">
            {mockedMarkers.map((marker, index) => {
              return (
                <li key={marker.id}>
                  <button
                    className="w-full"
                    onClick={() => {
                      player?.seek(marker.position_seconds);
                    }}
                  >
                    <Card className="flex animate-fade-in-down flex-col gap-4 p-4 text-left">
                      <div className="break-words">{marker.description}</div>
                      <div className="flex items-center justify-between text-gray-300">
                        <div className="text-sm">
                          {dayjs
                            .duration(marker.position_seconds * 1000)
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
