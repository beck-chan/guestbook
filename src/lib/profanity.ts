import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

function parseAllowList(raw: string) {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function buildMatcher(allowListRaw: string) {
  const built = englishDataset.build();
  const extra = parseAllowList(allowListRaw);
  return new RegExpMatcher({
    ...built,
    whitelistedTerms: [...(built.whitelistedTerms ?? []), ...extra],
    ...englishRecommendedTransformers,
  });
}

export type ProfanityHit = {
  name: boolean;
  body: boolean;
};

export function checkCommentProfanity(
  name: string,
  body: string,
  allowListRaw: string,
): ProfanityHit {
  const matcher = buildMatcher(allowListRaw);
  return {
    name: matcher.hasMatch(name),
    body: matcher.hasMatch(body),
  };
}

export function profanityErrorMessage(hit: ProfanityHit): string | null {
  if (hit.name && hit.body) {
    return "Oops. No cursing allowed. Please edit your display name and message body.";
  }
  if (hit.name) {
    return "Oops. No cursing allowed. Please edit your display name.";
  }
  if (hit.body) {
    return "Oops. No cursing allowed. Please edit your message body.";
  }
  return null;
}
