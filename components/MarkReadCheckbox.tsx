"use client";

import { useState } from "react";

type MarkReadCheckboxProps = {
  commentId: string;
  defaultRead: boolean;
};

export function MarkReadCheckbox({
  commentId,
  defaultRead,
}: MarkReadCheckboxProps) {
  const [read, setRead] = useState(defaultRead);

  return (
    <label className="admin-mark-read">
      <input
        type="checkbox"
        name={`read-${commentId}`}
        checked={read}
        onChange={(event) => setRead(event.target.checked)}
      />
      mark as read
    </label>
  );
}
