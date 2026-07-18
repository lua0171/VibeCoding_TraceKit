/**
 * mockHeatmapData.js
 * ---------------------------------------------------------
 * DEFINES THE HEATMAP INPUT CONTRACT.
 *
 * This is the shape the <Heatmap /> component expects. It's a stand-in
 * for what will eventually come from:
 *   GET /studies/:studyId/screens/:screenId/events
 *
 * WHY NORMALIZED COORDINATES (x, y between 0 and 1):
 * Click coordinates are stored as a fraction of the screen's width/height,
 * not raw pixels. This keeps the heatmap accurate regardless of the
 * viewer's screen resolution or zoom level when the click was recorded.
 * When you build the real backend, convert pixel clicks to normalized
 * coordinates before storing them (x = clickX / screenWidth, etc.)
 * or convert them at read-time here.
 *
 * REFACTOR NOTE:
 * Once the backend/database schema is finalized, replace `getHeatmapData()`
 * with a real fetch call, e.g.:
 *
 *   export async function getHeatmapData(studyId, screenId) {
 *     const res = await fetch(`/api/studies/${studyId}/screens/${screenId}/events`);
 *     return res.json();
 *   }
 *
 * As long as the returned shape matches what's below, the Heatmap
 * component itself needs zero changes.
 */

export const mockHeatmapData = {
  screen: {
    id: "screen-2",
    name: "Pricing Page — Screen 2 of 3",
    // Replace with a real screenshot/export of the Figma frame
    imageUrl: "https://placehold.co/1200x800/1e293b/64748b?text=Figma+Frame+Screenshot",
    width: 1200,
    height: 800,
  },

  participants: [
    { id: "p1", label: "Participant 1" },
    { id: "p2", label: "Participant 2" },
    { id: "p3", label: "Participant 3" },
    { id: "p4", label: "Participant 4" },
    { id: "p5", label: "Participant 5" },
  ],

  events: [
    // Cluster near a CTA button (dense, indicates confusion or high interest)
    { id: "e1", sessionId: "p1", x: 0.5, y: 0.42, timestamp: 1200 },
    { id: "e2", sessionId: "p2", x: 0.51, y: 0.4, timestamp: 1400 },
    { id: "e3", sessionId: "p3", x: 0.49, y: 0.43, timestamp: 2100 },
    { id: "e4", sessionId: "p1", x: 0.52, y: 0.41, timestamp: 2600 },
    { id: "e5", sessionId: "p4", x: 0.5, y: 0.44, timestamp: 3000 },

    // Sparser clicks near top navigation (users trying to go back)
    { id: "e6", sessionId: "p2", x: 0.08, y: 0.06, timestamp: 3400 },
    { id: "e7", sessionId: "p5", x: 0.09, y: 0.05, timestamp: 4100 },

    // Isolated misclicks on non-interactive body text
    { id: "e8", sessionId: "p3", x: 0.72, y: 0.65, timestamp: 5200 },
    { id: "e9", sessionId: "p4", x: 0.3, y: 0.72, timestamp: 6000 },
    { id: "e10", sessionId: "p5", x: 0.71, y: 0.63, timestamp: 6500 },
  ],
};
