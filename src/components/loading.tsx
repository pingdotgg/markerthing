import React from "react";

const LoadingInternal = (props: { size?: number }) => {
  const size = props.size ?? "24";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      stroke="#cbd5e1"
    >
      <circle className="spinner_ZCsl" cx="12" cy="12" r="0" />
      <circle className="spinner_ZCsl spinner_gaIW" cx="12" cy="12" r="0" />
    </svg>
  );
};

export const LoadingSpinner = React.memo(LoadingInternal);

const LoadingPageInternal = () => (
  <div className="absolute flex top-0 right-0 h-screen w-screen items-center justify-center">
    <LoadingInternal size={128} />
  </div>
);

export const LoadingPage = React.memo(LoadingPageInternal);
