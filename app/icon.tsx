import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { flags } from "@/lib/flags";

const CORAL = "#fe605a";

// Bootstrap Icons `book-fill` (open book), MIT License, https://icons.getbootstrap.com/icons/book-fill/
const PUBLIC_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <rect width="16" height="16" fill="${CORAL}"/>
  <g fill="#fff" transform="translate(2.1 1.7) scale(0.74)">
    <path d="M8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783"/>
  </g>
</svg>`;

export const size = flags.public
  ? { width: 32, height: 32 }
  : { width: 286, height: 286 };

export const contentType = flags.public ? "image/svg+xml" : "image/png";

export default async function Icon() {
  if (flags.public) {
    return new Response(PUBLIC_ICON, {
      headers: { "Content-Type": "image/svg+xml" },
    });
  }

  const portrait = await readFile(join(process.cwd(), "public/icon.png"));
  return new Response(portrait, {
    headers: { "Content-Type": "image/png" },
  });
}
