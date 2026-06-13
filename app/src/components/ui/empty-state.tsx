import { Inbox, type LucideIcon } from "lucide-react";

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "compact" | "full";
};

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  variant = "full",
}: Props) {
  const compact = variant === "compact";
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-atr-outline bg-atr-bg-soft text-center ${
        compact ? "p-6" : "p-10"
      }`}
    >
      <div
        className={`flex items-center justify-center rounded-full bg-atr-purple-50 text-atr-purple ${
          compact ? "h-10 w-10" : "h-14 w-14"
        }`}
      >
        <Icon className={compact ? "h-5 w-5" : "h-7 w-7"} />
      </div>
      <h3
        className={`mt-3 font-bold text-atr-fg ${
          compact ? "text-sm" : "text-base"
        }`}
      >
        {title}
      </h3>
      {description && (
        <p
          className={`mt-1 max-w-md text-atr-fg-muted ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
