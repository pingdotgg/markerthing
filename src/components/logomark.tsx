import Link from "next/link";
import Icon from "./icon";

export const LogoMark = () => {
  return (
    <h1 className="flex flex-row items-baseline text-2xl font-bold sm:text-4xl ">
      <Link href="/" className="flex flex-row items-baseline">
        <Icon className="-mr-2 mb-2 h-6 sm:h-8" />
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
