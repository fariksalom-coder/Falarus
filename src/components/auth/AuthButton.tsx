import { Button } from "../ui/Foundation";
import type { ReactNode } from "react";

type Variant = "primary" | "primaryDark" | "secondary" | "success";

type Props = {
  label: string;
  onClick?: () => void;
  type?: "button" | "submit";
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  shape?: "pill" | "rounded12";
  icon?: ReactNode;
};

export function AuthButton({
  label,
  onClick,
  type = "button",
  loading = false,
  disabled = false,
  variant = "primary",
  shape = "pill",
  icon,
}: Props) {
  const isDisabled = disabled || loading || (type === "button" && !onClick);

  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      loading={loading}
      variant={variant === "secondary" ? "secondary" : "primary"}
      className={`w-full min-h-[54px] ${shape === "pill" ? "rounded-full" : ""}`}
    >
      {!loading && icon}
      {label}
    </Button>
  );
}
