// Shared helpers for building/validating Figma prototype embed URLs.
// Used by both the researcher preview (StudyDesignPage) and the
// participant session (ParticipantSession).

const FIGMA_CLIENT_ID = import.meta.env.VITE_FIGMA_CLIENT_ID;

// Client ID is required for Embed Kit 2.0 to emit click/navigation
// postMessage events; without it the embed still renders, it just stays silent.
export const getEmbedUrl = (url: string, nodeId?: string): string => {
  if (!url) return '';
  let targetUrl = url;
  if (nodeId) {
    try {
      const parsed = new URL(url);
      if (!parsed.searchParams.has('node-id')) {
        parsed.searchParams.set('node-id', nodeId);
      }
      targetUrl = parsed.toString();
    } catch (_) {
      const separator = url.includes('?') ? '&' : '?';
      if (!url.includes('node-id=')) {
        targetUrl = `${url}${separator}node-id=${encodeURIComponent(nodeId)}`;
      }
    }
  }
  const embedUrl = targetUrl.includes('figma.com/embed')
    ? new URL(targetUrl)
    : new URL(`https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(targetUrl)}`);

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
