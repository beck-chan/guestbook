export type PoemSection = {
  title: string;
  html: string;
};

export type Poem = {
  id: string;
  title: string;
  sections: PoemSection[];
};

export function pickPoemIndex(count: number, except?: number): number {
  if (count <= 0) {
    return 0;
  }
  if (count === 1 || except === undefined) {
    return Math.floor(Math.random() * count);
  }
  let next = except;
  while (next === except) {
    next = Math.floor(Math.random() * count);
  }
  return next;
}
