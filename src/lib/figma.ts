// Shared helpers for building/validating Figma prototype embed URLs.
// Used by both the researcher preview (StudyDesignPage) and the
// participant session (ParticipantSession).

const FIGMA_CLIENT_ID = import.meta.env.VITE_FIGMA_CLIENT_ID;

// Client ID is required for Embed Kit 2.0 to emit click/navigation
// postMessage events; without it the embed still renders, it just stays silent.
export const getEmbedUrl = (url: string): string => {
  if (!url) return '';
  const embedUrl = url.includes('figma.com/embed')
    ? new URL(url)
    : new URL(`https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`);

  if (FIGMA_CLIENT_ID) {
    embedUrl.searchParams.set('client-id', FIGMA_CLIENT_ID);
  }
  return embedUrl.toString();
};

export const isValidFigmaUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('figma.com');
  } catch (_) {
    return false;
  }
};
