import {
  DEFAULT_COMMENT_BODY_MAX_LENGTH,
  guestbookCommentLength,
} from "@/lib/guestbookSettingsShared";

export const COMMENT_NAME_MAX_LENGTH = 128;
export const COMMENT_EMAIL_MAX_LENGTH = 254;

export function commentNameLengthError(name: string): string | null {
  if (name.length > COMMENT_NAME_MAX_LENGTH) {
    return `Oops. That display name is too long. Please keep it to ${COMMENT_NAME_MAX_LENGTH} characters.`;
  }
  return null;
}

export function commentEmailLengthError(email: string): string | null {
  if (email.length > COMMENT_EMAIL_MAX_LENGTH) {
    return `Oops. That email is too long. Please keep it to ${COMMENT_EMAIL_MAX_LENGTH} characters.`;
  }
  return null;
}

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

export function commentLengthError(
  name: string,
  email: string,
  body: string,
  bodyMax: string | number = DEFAULT_COMMENT_BODY_MAX_LENGTH,
): string | null {
  return (
    commentNameLengthError(name) ??
    commentEmailLengthError(email) ??
    commentBodyLengthError(body, bodyMax)
  );
}
