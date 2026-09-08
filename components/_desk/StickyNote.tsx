import { forwardRef } from "react";

type StickyNoteProps = {
  isOpen: boolean;
  onToggle: () => void;
};

export const StickyNote = forwardRef<HTMLButtonElement, StickyNoteProps>(
  function StickyNote({ isOpen, onToggle }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className="sticky-note"
        onClick={onToggle}
        aria-label={isOpen ? "Close Book" : "Open Book"}
        aria-pressed={isOpen}
      >
        <span className="sticky-note-caption">
          <span className="sticky-note-label sticky-note-label-open">
            Open Book
          </span>
          <span className="sticky-note-label sticky-note-label-close">
            {Array.from("Close Book").map((ch, i) => (
              <span key={i} className="sticky-note-letter">
                {ch === " " ? "\u00a0" : ch}
              </span>
            ))}
          </span>
          <span className="sticky-note-eraser" aria-hidden="true" />
        </span>
      </button>
    );
  },
);
