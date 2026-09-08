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
            Close Book
          </span>
          <span className="sticky-note-eraser" aria-hidden="true" />
        </span>
      </button>
    );
  },
);
