"use client";

import * as dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { useEffect, useMemo, useState } from "react";
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

  const [offset, setOffset] = useState(0);

  const csv = mockedMarkers.map((marker, id) => {
    const endTime =
      (mockedMarkers[id + 1]?.position_seconds ??
        (videoDuration as duration.Duration)?.asSeconds?.()) - offset;

    const startTime = Math.max(marker.position_seconds - offset, 0);

    return `${startTime},${endTime},${marker.description.replace(",", "")}`;
  });

  return (
    <div className="container mx-auto flex items-center justify-center w-screen p-4">
      <div className="flex flex-col w-full">
        <div id="vod-player" className="w-full aspect-video" />
      </div>
      <div className="flex flex-col gap-4 w-96 justify-center items-center">
        <div className="text-2xl font-bold text-slate-100">Timestamps</div>
        {props.vod &&
          mockedMarkers.map((marker, index) => {
            return (
              <div
                key={marker.id}
                className="flex flex-col text-center items-center"
              >
                <div className="font-bold py-1 font-mono text-xl text-slate-200">
                  <button
                    onClick={() => {
                      player?.seek(marker.position_seconds);
                    }}
                  >
                    {dayjs
                      .duration(marker.position_seconds * 1000)
                      .format("HH:mm:ss")}
                  </button>
                </div>

                <div className="text-slate-300">{marker.description}</div>
              </div>
            );
          })}
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(
            csv.join("\n")
          )}`}
          {...{
            download: `${props.vod?.created_at} VOD MARKERS${
              offset ? ` - ${offset}s` : ""
            }`,
          }}
          className="text-slate-100 font-bold text-xl"
        >
          Download CSV
        </a>
        <input
          type="number"
          value={offset}
          onChange={(e) => {
            setOffset(parseInt(e.currentTarget.value, 10));
          }}
        ></input>
      </div>
    </div>
  );
};
