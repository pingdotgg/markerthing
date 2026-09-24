"use client";

import toast, { Toaster } from "react-hot-toast";
import { Button } from "~/app/_components/common/button";

export const CopyButton = (props: { text: string }) => (
  <>
    <Toaster
      toastOptions={{
        className: "rounded-lg bg-gray-850 text-gray-50 shadow-md",
      }}
    />
    <Button
      onClick={() => {
        navigator.clipboard.writeText(props.text);
        toast.success("Copied embed URL!");
      }}
    >
      Copy
    </Button>
  </>
);
