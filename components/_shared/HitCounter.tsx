import { flags } from "@/lib/flags";

const HIT_COUNT = "000481";

export function HitCounter() {
  if (!flags.hitCounter) {
    return null;
  }

  return (
    <div className="hit-counter" aria-hidden="true">
      <p className="hit-counter-digits">
        {HIT_COUNT.split("").map((digit, index) => (
          <span key={`${digit}-${index}`}>{digit}</span>
        ))}
      </p>
      <p className="hit-counter-label">hits</p>
    </div>
  );
}
