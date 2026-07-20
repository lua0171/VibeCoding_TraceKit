// Shared URL-building helpers, previously duplicated between Dashboard.tsx
// and StudyConfiguration.tsx.

// Converts a standard Figma share link into the official embed URL,
// optionally deep-linking to a specific node/frame.
export const getEmbedUrl = (url: string, nodeId?: string): string => {
  if (!url) return '';
  let targetUrl = url;
  if (nodeId) {
    const separator = url.includes('?') ? '&' : '?';
    if (!url.includes('node-id=')) {
      targetUrl = `${url}${separator}node-id=${encodeURIComponent(nodeId)}`;
    }
  }
  if (targetUrl.includes('figma.com/embed')) {
    return targetUrl;
  }
  return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(targetUrl)}`;
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

// The link a researcher shares with participants; ?session=<id> is read
// directly in App.tsx to bypass the researcher app entirely.
export const getParticipantLink = (studyId: string): string =>
  `${window.location.origin}${window.location.pathname}?session=${studyId}`;
