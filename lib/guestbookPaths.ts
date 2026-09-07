export function guestbookAdminPath() {
  const raw = process.env.NEXT_PUBLIC_GUESTBOOK_ADMIN_PATH?.trim();
  if (!raw) return "/admin";
  return raw.replace(/\/$/, "") || "/admin";
}

export function guestbookAdminLoginPath() {
  return `${guestbookAdminPath()}/login`;
}

export function guestbookAdminExamplePath() {
  return `${guestbookAdminPath()}/example`;
}
