// Example marker labels
// "Talking about Chrome" - no metadata, just label
// "START: Talking about Chrome" - start marker, same as above
// "END: Talking about Chrome" - end marker, tagged accordingly so it can be filtered out
// "End of Talking about Chrome" - end marker, same as above
// "OFFSET 00:40:31" - offset marker
// "-2 Talking about Chrome" - start 2 minutes before the marker was placed
// "-30s Talking about Chrome" - start 30 seconds before the marker was placed

const START_LABELS = ["START:", "START OF", "START"];
const END_LABELS = ["END:", "END OF", "END"];
const OFFSET_LABELS = ["OFFSET", "OFFSET:"];

// Reads a leading rewind like "-2" (minutes), "-2m" or "-30s" off a marker.
// Lets you mark something retroactively, after it already started.
export function parseRewind(marker: string) {
  const match = /^-(\d+)([ms])?(?:\s+|$)/i.exec(marker);
  if (!match) return { rewindSeconds: 0, description: marker };

  const amount = parseInt(match[1]!, 10);
  const isSeconds = match[2]?.toLowerCase() === "s";

  return {
    rewindSeconds: isSeconds ? amount : amount * 60,
    description: marker.slice(match[0].length),
  };
}

export function parseMetadataFromMarker(marker: string) {
  for (const tl of START_LABELS) {
    if (marker.toLowerCase().startsWith(tl.toLowerCase())) {
      return {
        type: "start" as const,
        label: marker.slice(tl.length).trim(),
      };
    }
  }

  for (const tl of END_LABELS) {
    if (marker.toLowerCase().startsWith(tl.toLowerCase())) {
      return {
        type: "end" as const,
        label: marker.slice(tl.length).trim(),
      };
    }
  }

  for (const tl of OFFSET_LABELS) {
    if (marker.toLowerCase().startsWith(tl.toLowerCase())) {
      return {
        type: "offset" as const,
        label: marker.slice(tl.length).trim().replaceAll("-", ":"),
      };
    }
  }

  return {
    type: "start" as const,
    label: marker,
  };
}
