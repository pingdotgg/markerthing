import Link from "next/link";
import React, { ReactElement } from "react";
import { LoadingSpinner } from "~/components/loading";
import { classNames } from "~/utils/classnames";

export type HTMLButtonProps = React.DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
>;

export type HTMLAnchorProps = React.DetailedHTMLProps<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>;

export const BUTTON_CLASSES =
  "inline-flex items-center border font-medium relative";

export type ButtonVariant =
  | "primary"
  | "primary-inverted"
  | "secondary"
  | "secondary-inverted"
  | "ghost"
  | "danger"
  | "text";

type ButtonSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl";

type ButtonIconPosition = "start" | "end";

type ButtonStyle = {
  disabled?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export type ButtonProps = {
  icon?: ReactElement;
  iconPosition?: ButtonIconPosition;
  loading?: boolean;
} & ButtonStyle;

export const BUTTON_SIZES = {
  xs: "text-xs px-2.5 py-1.5 rounded",
  sm: "text-sm px-3 py-2 leading-4 rounded",
  base: "text-sm px-4 py-2 rounded",
  lg: "text-base px-4 py-2 rounded-md",
  xl: "text-lg px-6 py-3 rounded-md",
  "2xl": "text-xl px-8 py-3 md:py-4 md:text-2xl md:px-8 rounded-lg",
};

export const ICON_SIZE_CLASSES = {
  xs: "h-4 w-4",
  sm: "h-4 w-4",
  base: "h-5 w-5",
  lg: "h-5 w-5",
  xl: "h-5 w-5",
  "2xl": "h-6 w-6",
};
export const ICON_START_CLASSES = {
  xs: "-ml-0.5 mr-1.5",
  sm: "-ml-0.5 mr-1.5",
  base: "-ml-1 mr-1.5",
  lg: "-ml-1 mr-2",
  xl: "-ml-1 mr-2",
  "2xl": "-ml-1 mr-2",
};
export const ICON_END_CLASSES = {
  xs: "-mr-0.5 ml-1.5",
  sm: "-mr-0.5 ml-1.5",
  base: "-mr-1 ml-1.5",
  lg: "-mr-1 ml-2",
  xl: "-mr-1 ml-2",
  "2xl": "-mr-1 ml-2",
};

export const BUTTON_VARIANTS = {
  primary:
    "text-white border-pink-700 bg-pink-600 hover:bg-pink-700 hover:border-pink-800 shadow-sm",
  "primary-inverted":
    "text-pink-600 border-transparent bg-white hover:bg-pink-50 shadow-sm",
  secondary:
    "text-white border-gray-700 bg-gray-800 hover:bg-gray-750 hover:text-gray-100 shadow-sm",
  "secondary-inverted":
    "text-gray-900 border-transparent bg-gray-100 hover:bg-gray-200 shadow-sm",
  ghost: "text-white border-transparent hover:bg-gray-750 hover:text-gray-100",
  danger:
    "text-white border-red-700 bg-red-600 hover:bg-red-700 hover:border-red-800",
  text: "text-white border-transparent hover:text-gray-300",
};

export const getButtonClasses = (
  style: ButtonStyle = {},
  ...rest: string[]
) => {
  const { disabled, size = "base", variant = "secondary" } = style;
  return classNames(
    BUTTON_CLASSES,
    disabled && "pointer-events-none",
    BUTTON_SIZES[size],
    BUTTON_VARIANTS[variant],
    ...rest
  );
};

const ButtonContent: React.FC<{
  loading?: boolean;
  size?: ButtonSize;
  icon?: ReactElement;
  iconPosition?: ButtonIconPosition;
  children?: React.ReactNode;
}> = ({ loading, icon, iconPosition = "start", size = "base", children }) => {
  return (
    <>
      {loading && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <LoadingSpinner />
        </span>
      )}
      {icon && iconPosition === "start" && (
        <span
          className={classNames(
            { invisible: loading },
            ICON_SIZE_CLASSES[size],
            ICON_START_CLASSES[size]
          )}
        >
          {icon}
        </span>
      )}
      <span className={classNames({ invisible: loading })}>{children}</span>
      {icon && iconPosition === "end" && (
        <span
          className={classNames(
            { invisible: loading },
            ICON_SIZE_CLASSES[size],
            ICON_END_CLASSES[size]
          )}
        >
          {icon}
        </span>
      )}
    </>
  );
};

/**
 * Button component that renders an `<a>` element
 *
 * Wrap with next.js `<Link>` for client side routing
 */
export const ButtonLink = React.forwardRef<
  HTMLAnchorElement,
  ButtonProps & HTMLAnchorProps & { href: string }
>((props, ref) => {
  const {
    children,
    className = "",
    disabled,
    size,
    variant,
    icon,
    iconPosition,
    loading,
    href,
    ...rest
  } = props;
  return (
    <Link
      className={getButtonClasses({ disabled, size, variant }, className)}
      ref={ref as any}
      aria-disabled={disabled}
      href={href}
      {...rest}
    >
      <ButtonContent {...props} />
    </Link>
  );
});
ButtonLink.displayName = "ButtonLink";

/**
 * Button component that renders a `<button>` element
 *
 * @see {@link ButtonLink} for rendering an `<a>` element
 */
export const Button = React.forwardRef<
  HTMLButtonElement,
  ButtonProps & HTMLButtonProps
>((props, ref) => {
  const {
    children,
    className = "",
    disabled,
    size,
    variant,
    icon,
    iconPosition,
    loading,
    ...rest
  } = props;
  return (
    <button
      className={getButtonClasses({ disabled, size, variant }, className)}
      ref={ref}
      type="button"
      aria-disabled={disabled}
      {...rest}
    >
      <ButtonContent {...props} />
    </button>
  );
});

Button.displayName = "Button";

export default Button;
