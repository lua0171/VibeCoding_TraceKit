import React, { useState } from 'react';
import { ArrowLeft, Sparkles, FilePlus } from 'lucide-react';
import { db } from '../db/db';

interface CreateStudyPlaceholderProps {
  onBack: () => void;
  onStudyCreated: () => void;
}

export const CreateStudyPlaceholder: React.FC<CreateStudyPlaceholderProps> = ({
  onBack,
  onStudyCreated,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleQuickCreate = async () => {
    setIsGenerating(true);
    try {
      const titles = [
        'Mobile App Onboarding Flow Study',
        'SaaS Pricing Tier Comparison Usability Test',
        'AI Chat Assistant Interaction Study',
        'Fitness Tracker Dashboard Usability Test',
      ];
      
      const descriptions = [
        'Analyzing drop-offs during the 4-step onboarding screens. We want to test whether adding social logins improves completion rate by 15% and reduces sign-up duration.',
        'Comparing user comprehension between our traditional column layout and a new tiered list format. Participants will select the plan suited for a team of 10 users.',
        'Testing conversational flow constraints. Participants will attempt to query historical reports and export their results using purely natural language chat inputs.',
        'Assessing the readability of telemetry graphs and weekly step metrics on small screen layouts. Standard usability tasks will be assigned.'
      ];

      const randomIndex = Math.floor(Math.random() * titles.length);
      
      await db.createStudy({
        title: titles[randomIndex],
        description: descriptions[randomIndex]
      });

      onStudyCreated();
    } catch (e) {
      console.error('Failed to quick-create study:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="placeholder-container">
      <span className="placeholder-badge">Module 1: Study Creation</span>
      <h1 className="placeholder-title">Create Usability Study</h1>
      
      <p className="placeholder-desc">
        The study configuration builder, including Figma embedding parameters, user screening, pre-study questions, and post-study survey questionnaire forms will be introduced here in the next iteration.
      </p>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '16px',
        padding: '24px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg)',
        border: '1px dashed var(--border)',
        marginBottom: '40px',
      }}>
        <div style={{ textAlign: 'left' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} style={{ color: 'var(--primary)' }} /> Developer Sandbox Mode
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Use the shortcut below to instantaneously inject a random mock study to test the dashboard state updates.
          </p>
        </div>
      </div>

      <div className="placeholder-actions">
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleQuickCreate}
          disabled={isGenerating}
        >
          <FilePlus size={16} /> 
          {isGenerating ? 'Generating...' : 'Quick-inject Mock Study'}
        </button>
      </div>
    </div>
  );
};
