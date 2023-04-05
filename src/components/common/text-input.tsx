import React, { ReactElement } from "react";
import { classNames } from "~/utils/classnames";

export type InputProps = React.DetailedHTMLProps<
  React.InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
>;

export const TextInput = React.forwardRef<
  HTMLInputElement,
  {
    prefixEl?: ReactElement | string;
    suffixEl?: ReactElement | string;
    className?: string;
  } & InputProps
>((props, ref) => {
  const { prefixEl, suffixEl, className, ...rest } = props;
  return (
    <div
      className={classNames(
        "flex rounded-md border border-gray-700 px-1 shadow-sm focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500",
        className
      )}
    >
      {!!prefixEl && (
        <div className="flex items-center pl-2 text-gray-400 sm:text-sm">
          {prefixEl}
        </div>
      )}
      <input
        type="text"
        className="block w-full rounded-md border-0 bg-transparent p-2 outline-none focus:ring-0 sm:text-sm"
        {...rest}
        ref={ref}
      />
      {!!suffixEl && (
        <div className="flex items-center pr-2 text-gray-400 sm:text-sm">
          {suffixEl}
        </div>
      )}
    </div>
  );
});

TextInput.displayName = "TextInput";
