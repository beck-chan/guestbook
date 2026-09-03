"use client";

type MarkReadCheckboxProps = {
  commentId: string;
  read: boolean;
  onReadChange: (read: boolean) => void;
};

export function MarkReadCheckbox({
  commentId,
  read,
  onReadChange,
}: MarkReadCheckboxProps) {
  return (
    <label className="admin-mark-read">
      <input
        type="checkbox"
        name={`read-${commentId}`}
        checked={read}
        onChange={(event) => onReadChange(event.target.checked)}
      />
      mark as read
    </label>
  );
}
