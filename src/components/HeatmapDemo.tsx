import React from 'react';
import { Heatmap } from './Heatmap';
import { mockHeatmapData } from '../mockHeatmapData';

/**
 * HeatmapDemo.tsx
 * ---------------------------------------------------------
 * Minimal usage example. In the real app, this is where a
 * study/screen page would fetch data from the backend and
 * pass it into <Heatmap />, e.g.:
 *
 *   const data = await getHeatmapData(studyId, screenId);
 *   return <Heatmap data={data} />;
 */
export const HeatmapDemo: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg)',
      padding: '32px',
    }}>
      <div style={{ maxWidth: '896px', margin: '0 auto' }}>
        <Heatmap data={mockHeatmapData} />
      </div>
    </div>
  );
};
