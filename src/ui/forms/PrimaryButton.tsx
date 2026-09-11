import type { ButtonHTMLAttributes } from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
};

export function PrimaryButton({
  children,
  className = "",
  disabled,
  isLoading = false,
  type = "button",
  ...props
}: PrimaryButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={`rounded-xl bg-primary-container px-space-md py-2.5 text-label-md font-semibold text-on-primary shadow-sm transition-all hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-outline-variant disabled:text-outline disabled:hover:bg-outline-variant ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
