import React from 'react';

interface HeaderProps {
  cycleCount: number;
  testCount: number;
  onSave: () => void;
  onThemeToggle: () => void;
  currentTheme: 'light' | 'dark';
}

export const Header: React.FC<HeaderProps> = ({
  cycleCount,
  testCount,
  onSave,
  onThemeToggle,
  currentTheme
}) => {
  return (
    <header className="top">
      <div className="tl">
        <div>
          <div className="tt">QA Checklist Pro</div>
          <div className="tp">Test Management Dashboard</div>
        </div>
      </div>
      <div className="tr">
        <span className="tc">Cycle {cycleCount}</span>
        <span className="ti">{testCount} tests</span>
        <button className="top-btn" title="Save (Ctrl+S)" onClick={onSave}>
          💾
        </button>
        <button
          className="top-btn"
          title="Theme (Ctrl+D)"
          onClick={onThemeToggle}
        >
          {currentTheme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
  );
};
