"use client";

import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Button } from "~/app/_components/common/button";
import { Card } from "~/app/_components/common/card";
import { TextInput } from "~/app/_components/common/text-input";
import {
  buildSegments,
  EXPORT_BUFFER_SECONDS,
  formatSeconds,
  parseOffsetValue,
  parseTwitchDuration,
  toCsv,
  toYouTubeChapters,
} from "~/utils/markers";
import type { VOD } from "~/utils/twitch-server";
import { Player } from "~/utils/types/twitch-player";

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

  return clearCurrent;
};

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

  const segments = useMemo(
    () =>
      buildSegments({
        markers: props.vod.markers,
        videoSeconds: parseTwitchDuration(props.vod.duration),
        offsetSeconds: offset.totalSeconds,
      }),
    [props.vod, offset.totalSeconds]
  );

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
                navigator.clipboard.writeText(toYouTubeChapters(segments));
                toast.success("Copied YouTube chapters to clipboard!");
              }}
            >
              {`YT Chapters`}
            </Button>
            <a
              className="relative inline-flex items-center rounded border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-750 hover:text-gray-100"
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                toCsv(segments)
              )}`}
              {...{
                download: `${props.vod.created_at.replaceAll(
                  ":",
                  "-"
                )} VOD MARKERS${
                  offset.totalSeconds ? ` - ${offset.totalSeconds}s` : ""
                }.csv`,
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
            {segments
              .filter((s) => s.type !== "end")
              .map((marker, index) => {
                return (
                  <li key={`${marker.startTime}-${index}`}>
                    <button
                      className="w-full"
                      onClick={() => {
                        if (marker.type === "start") {
                          // Seek in the VOD itself, with the same lead-in as the export
                          player?.seek(
                            Math.max(marker.vodStart - EXPORT_BUFFER_SECONDS, 0)
                          );
                        }

                        if (marker.type === "offset") {
                          const offset = parseOffsetValue(marker.label);
                          if (offset) {
                            setOffset({
                              presentational: marker.label,
                              totalSeconds: offset,
                            });
                          }
                        }
                      }}
                    >
                      <Card className="flex animate-fade-in-down flex-col gap-4 p-4 text-left">
                        <div className="flex justify-between break-words">
                          {`${marker.label}`}
                          <div className="flex flex-col gap-0.5">
                            <div className="font-mono text-right text-xs text-gray-400">
                              {`${formatSeconds(
                                marker.startTime
                              )} - ${formatSeconds(marker.endTime)}`}
                            </div>
                            <div className="font-mono text-right text-xs text-gray-400">
                              {`(${formatSeconds(
                                marker.endTime - marker.startTime
                              )})`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-gray-300">
                          <div
                            className={`-m-2 rounded-full px-2 py-1 text-sm font-bold ${
                              marker.type === "start"
                                ? "bg-green-800 text-white"
                                : marker.type === "end"
                                ? "bg-red-800 text-white"
                                : marker.type === "offset"
                                ? "bg-blue-800 text-white"
                                : "bg-gray-800 text-white"
                            }`}
                          >
                            {marker.type}
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
