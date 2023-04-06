"use client";
import Link from "next/link";
import Icon from "./icon";
import { useEffect, useState } from "react";

export const LogoMark = () => {
  /* This is a hack to get the logo to resize on mobile safari.
   *
   * TLDR: SVGs and flexbox don't play nice on mobile safari, so we
   * need to manually set the SVGs size rather than using 100% width,
   * and resizing the container.
   */
  const [isSmall, setIsSmall] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setIsSmall(true);
      } else {
        setIsSmall(false);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <h1 className="flex flex-row items-baseline text-2xl font-bold sm:text-4xl ">
      <Link href="/" className="flex flex-row items-baseline">
        <Icon size={isSmall ? 24 : 32} className="-mr-2 mb-2 h-6 sm:h-8" />
        <span className="tracking-tight hover:cursor-pointer">
          {`marker`}
          <span className="text-pink-500">{`thing`}</span>
        </span>
      </Link>
      <span className="text-sm sm:text-lg">
        {`...by `}
        <a href="https://ping.gg" className="hover:text-pink-500">{`Ping`}</a>
      </span>
    </h1>
  );
};
