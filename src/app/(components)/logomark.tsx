import Link from "next/link";
import Icon from "./icon";

export const LogoMark = () => {
  return (
    <h1 className="flex flex-row items-baseline text-4xl font-bold ">
      <Link href="/" className="flex flex-row items-baseline">
        <Icon size={32} className="-mr-2 mb-2" />
        <span className="tracking-tight hover:cursor-pointer">
          {`marker`}
          <span className="text-pink-500">{`thing`}</span>
        </span>
      </Link>
      <span className="text-lg">
        {`...by `}
        <a href="https://ping.gg" className="hover:text-pink-500">{`Ping`}</a>
      </span>
    </h1>
  );
};
