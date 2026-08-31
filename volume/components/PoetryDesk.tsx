"use client";

import { useState } from "react";
import { Book } from "@/components/Book";
import { FountainPen } from "@/components/FountainPen";
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
    <div className={`stage${isOpen ? " is-open" : ""}`}>
      <Book
        isOpen={isOpen}
        poem={poem}
        onTurnPage={() => setPoemIndex((current) => pickPoemIndex(poems.length, current))}
      />
      <FountainPen isOpen={isOpen} onToggle={() => setIsOpen((open) => !open)} />
    </div>
  );
}
