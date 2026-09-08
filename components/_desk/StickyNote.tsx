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
        <span className="sticky-note-label">
          {isOpen ? "Close Book" : "Open Book"}
        </span>
      </button>
    );
  },
);
