export interface ImportedHotspot {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetFrameId: string;
}

export interface ImportedFrame {
  id: string;
  name: string;
  imageUrl: string;
  width?: number;
  height?: number;
  hotspots: ImportedHotspot[];
}

export interface ImportedPrototype {
  flowStartingPoints?: {
    nodeId: string;
    name: string;
  }[];
  frames: ImportedFrame[];
}

// A hotspot's targetFrameId can reference a Figma node that isn't a page-level
// frame (e.g. a mis-linked prototype connection pointing at an icon component),
// in which case it will never appear in `frames`. Returns null rather than
// letting callers fall back to an arbitrary frame.
export function resolveNavigationTarget(targetFrameId: string, frames: { id: string }[]): string | null {
  return frames.some(f => f.id === targetFrameId) ? targetFrameId : null;
}

export function extractFileKey(url: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/');
    const fileIndex = parts.indexOf('file');
    if (fileIndex !== -1 && parts[fileIndex + 1]) {
      return parts[fileIndex + 1];
    }
    const protoIndex = parts.indexOf('proto');
    if (protoIndex !== -1 && parts[protoIndex + 1]) {
      return parts[protoIndex + 1];
    }
    const match = url.match(/\/file\/([a-zA-Z0-9_-]{22,})/);
    if (match && match[1]) return match[1];
    
    const matchProto = url.match(/\/proto\/([a-zA-Z0-9_-]{22,})/);
    if (matchProto && matchProto[1]) return matchProto[1];

    return null;
  } catch (_) {
    return null;
  }
}

function findFrames(node: any, frames: any[] = []): any[] {
  if (node.type === 'FRAME') {
    frames.push(node);
  } else if (node.children) {
    node.children.forEach((child: any) => findFrames(child, frames));
  }
  return frames;
}

// A node can carry both the legacy `transitionNodeID` field and the modern
// `interactions` array. `interactions` is what Figma's current Prototype tab
// actually writes and can disagree with `transitionNodeID`, which may hold a
// stale or component-inherited value -- so `interactions` takes priority and
// `transitionNodeID` is only a fallback when no ON_CLICK/NODE interaction exists.
export function findClickTarget(node: any): string | undefined {
  if (node.interactions && Array.isArray(node.interactions)) {
    for (const inter of node.interactions) {
      if (inter.trigger && inter.trigger.type === 'ON_CLICK' && Array.isArray(inter.actions)) {
        const nodeAction = inter.actions.find((act: any) => act.type === 'NODE' && act.destinationId);
        if (nodeAction) return nodeAction.destinationId;
      }
    }
  }
  return node.transitionNodeID || undefined;
}

function extractHotspots(node: any, frameBox: any, hotspots: ImportedHotspot[] = []): ImportedHotspot[] {
  const targetFrameId = frameBox ? findClickTarget(node) : undefined;
  if (targetFrameId) {
    const box = node.absoluteBoundingBox;
    if (box) {
      const x = (box.x - frameBox.x) / frameBox.width;
      const y = (box.y - frameBox.y) / frameBox.height;
      const width = box.width / frameBox.width;
      const height = box.height / frameBox.height;

      hotspots.push({
        id: node.id,
        name: node.name || 'Hotspot',
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
        width: Math.max(0, Math.min(1, width)),
        height: Math.max(0, Math.min(1, height)),
        targetFrameId
      });
    }
  }

  if (node.children) {
    node.children.forEach((child: any) => extractHotspots(child, frameBox, hotspots));
  }
  return hotspots;
}

function findFlowStartingPoints(node: any, points: { nodeId: string; name: string }[] = []): { nodeId: string; name: string }[] {
  if (node.type === 'CANVAS' && node.flowStartingPoints) {
    node.flowStartingPoints.forEach((pt: any) => {
      points.push({
        nodeId: pt.nodeId,
        name: pt.name || 'Unnamed Flow'
      });
    });
  }
  if (node.children) {
    node.children.forEach((child: any) => findFlowStartingPoints(child, points));
  }
  return points;
}

export async function importPrototype(figmaUrl: string, token: string): Promise<ImportedPrototype> {
  const fileKey = extractFileKey(figmaUrl);
  if (!fileKey) {
    throw new Error('Invalid Figma URL format. Please make sure the URL contains /file/ or /proto/ with a valid file key.');
  }

  // No `depth` param -- fetch the full node tree. A shallow depth cuts off
  // interactive elements nested inside reusable component instances (e.g. a
  // bottom nav bar's individual icons), silently dropping their hotspots.
  const docResponse = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
    headers: {
      'X-Figma-Token': token
    }
  });

  if (!docResponse.ok) {
    const errorText = await docResponse.text();
    throw new Error(`Figma API responded with error ${docResponse.status}: ${errorText || docResponse.statusText}`);
  }

  const fileData = await docResponse.json();
  if (!fileData.document) {
    throw new Error('Figma API response was successful but document structure was empty.');
  }

  const flowStartingPoints = findFlowStartingPoints(fileData.document);

  const frames = findFrames(fileData.document);
  if (frames.length === 0) {
    throw new Error('No frames found on the Figma file canvas. Please make sure you have at least one frame.');
  }

  const frameIds = frames.map(f => f.id);
  const imgResponse = await fetch(`https://api.figma.com/v1/images/${fileKey}?ids=${frameIds.join(',')}&format=png&scale=1`, {
    headers: {
      'X-Figma-Token': token
    }
  });

  if (!imgResponse.ok) {
    throw new Error(`Failed to fetch frame export images from Figma API: ${imgResponse.statusText}`);
  }

  const imgData = await imgResponse.json();
  const imageUrlMap: Record<string, string> = imgData.images || {};

  const importedFrames: ImportedFrame[] = frames.map(f => {
    const hotspots = extractHotspots(f, f.absoluteBoundingBox);
    return {
      id: f.id,
      name: f.name || 'Untitled Frame',
      imageUrl: imageUrlMap[f.id] || '',
      width: f.absoluteBoundingBox?.width,
      height: f.absoluteBoundingBox?.height,
      hotspots
    };
  }).filter(f => f.imageUrl !== '');

  if (importedFrames.length === 0) {
    throw new Error('Figma frame images could not be generated. Please make sure your frames are not empty.');
  }

  return {
    flowStartingPoints,
    frames: importedFrames
  };
}
