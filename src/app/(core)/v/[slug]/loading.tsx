// Static placeholder in the same layout as the player page (no animation)
export default function Loading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 bg-black p-4 sm:flex-row">
      <div className="aspect-video w-full bg-zinc-950 sm:w-auto sm:flex-1" />
      <div className="flex flex-col gap-2 text-sm text-zinc-500 sm:w-[26rem]">
        Loading markers
      </div>
    </div>
  );
}
