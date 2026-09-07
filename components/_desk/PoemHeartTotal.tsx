import { DocsHeart } from "@/app/docs/_components/DocsHeart";

export function PoemHeartTotal({ count }: { count: number }) {
  return (
    <div
      className="poem-heart-total"
      aria-label={`${count} total poems`}
    >
      <span className="poem-heart-total-label">
        total
        <br />
        poems
      </span>
      <span className="poem-heart-total-stack">
        <DocsHeart filled className="poem-heart-total-icon" />
        <span className="poem-heart-total-count" aria-hidden="true">
          {count}
        </span>
      </span>
    </div>
  );
}
