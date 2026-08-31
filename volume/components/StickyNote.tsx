type StickyNoteProps = {
  isOpen: boolean;
  onToggle: () => void;
};

export function StickyNote({ isOpen, onToggle }: StickyNoteProps) {
  return (
    <button
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
}
