"use client";

import { useState } from "react";
import { Book } from "@/components/Book";
import { CommentBubbles } from "@/components/CommentBubbles";
import { pickPoemIndex, type Poem } from "@/lib/poems";

type PoetryDeskProps = {
  poems: Poem[];
  initialIndex: number;
};

export function PoetryDesk({ poems, initialIndex }: PoetryDeskProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [poemIndex, setPoemIndex] = useState(initialIndex);

  const poem = poems[poemIndex];

  return (
    <div className={`desk-split${isOpen ? " is-open" : ""}`}>
      <div className={`stage${isOpen ? " is-open" : ""}`}>
        <a className="desk-bookmark" href="/admin" aria-label="admin login">
          <span className="desk-bookmark-ribbon" aria-hidden="true" />
          <span className="desk-bookmark-label">admin login</span>
        </a>
        <Book
          isOpen={isOpen}
          poem={poem}
          onTurnPage={() => setPoemIndex((current) => pickPoemIndex(poems.length, current))}
          onToggle={() => setIsOpen((open) => !open)}
        />
      </div>
      <CommentBubbles />
    </div>
  );
}
