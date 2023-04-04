import { HTMLAttributes } from "react";
import { classNames } from "~/utils/classnames";

export const Card: React.FC<
  {
    className?: string;
  } & HTMLAttributes<HTMLDivElement>
> = ({ className, children, ...rest }) => {
  return (
    <div
      className={classNames(
        "rounded border border-gray-750 bg-gray-850 shadow",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
};
