export const HELP_IMAGE_PREFIX = '__image__:';

export function makeHelpImageMessage(url: string): string {
  return `${HELP_IMAGE_PREFIX}${url}`;
}

export function parseHelpImageMessage(content: string): { isImage: boolean; imageUrl: string | null } {
  if (!content.startsWith(HELP_IMAGE_PREFIX)) {
    return { isImage: false, imageUrl: null };
  }
  const imageUrl = content.slice(HELP_IMAGE_PREFIX.length).trim();
  if (!imageUrl) return { isImage: false, imageUrl: null };
  return { isImage: true, imageUrl };
}

