import {
  DEFAULT_COMMENT_BODY_MAX_LENGTH,
  guestbookCommentLength,
} from "@/lib/guestbookSettingsShared";

export { DEFAULT_COMMENT_BODY_MAX_LENGTH as COMMENT_BODY_MAX_LENGTH };

export function commentBodyLengthError(
  body: string,
  maxLength: string | number = DEFAULT_COMMENT_BODY_MAX_LENGTH,
): string | null {
  const max = guestbookCommentLength(maxLength);
  if (body.length > max) {
    return `Oops. That message is too long. Please keep your message body to ${max} characters.`;
  }
  return null;
}
