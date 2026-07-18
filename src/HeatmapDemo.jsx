import React from "react";
import Heatmap from "./Heatmap";
import { mockHeatmapData } from "./mockHeatmapData";

/**
 * HeatmapDemo.jsx
 * ---------------------------------------------------------
 * Minimal usage example. In the real app, this is where a
 * study/screen page would fetch data from the backend and
 * pass it into <Heatmap />, e.g.:
 *
 *   const data = await getHeatmapData(studyId, screenId);
 *   return <Heatmap data={data} />;
 */
export default function HeatmapDemo() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl">
        <Heatmap data={mockHeatmapData} />
      </div>
    </div>
  );
}
