type Tone = "muted" | "inverted" | "soft";

const TONES: Record<Tone, string> = {
  muted:
    "bg-atr-bg-soft text-atr-fg-muted border border-atr-outline",
  inverted: "bg-white/20 text-white",
  soft: "bg-atr-purple/15 text-atr-purple",
};

export function CountBadge({
  n,
  tone = "muted",
  className = "",
}: {
  n: number;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${TONES[tone]} ${className}`}
    >
      {n}
    </span>
  );
}
