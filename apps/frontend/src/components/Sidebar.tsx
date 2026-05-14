import { useState } from 'react';
import { useAuth } from '../lib/auth';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  testCounts: { web: number; app: number };
}

export function Sidebar({ activeView, onViewChange, testCounts }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const auth = useAuth();

  const views = [
    { id: 'testing', icon: '📋', label: 'Test Execution' },
    { id: 'history', icon: '📅', label: 'Execution History' },
    { id: 'portfolio', icon: '📊', label: 'Portfolio' },
    { id: 'automation', icon: '🤖', label: 'Automation' },
    { id: 'sheet', icon: '📑', label: 'Project Sheet' },
    { id: 'worksheet', icon: '📝', label: 'Daily Worksheet' }
  ];

  const handleViewClick = (viewId: string) => {
    onViewChange(viewId);
    setSidebarOpen(false);
  };

  return (
    <>
      {/* SIDEBAR */}
      <aside className={`side ${sidebarOpen ? 'open' : ''}`} id="side">
        <div className="s-hd">
          <div className="s-logo">✓</div>
          <div className="s-brand">
            <b className="s-br">QA Checklist</b>
            <span className="s-sub">Test Management</span>
          </div>
          <button
            className="s-x"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <nav className="s-nav">
          <p className="s-lb">Views</p>
          {views.map((view) => (
            <button
              key={view.id}
              className={`nl ${activeView === view.id ? 'active' : ''}`}
              onClick={() => handleViewClick(view.id)}
              type="button"
            >
              <span className="ni">{view.icon}</span>
              <span className="nl-text">{view.label}</span>
            </button>
          ))}

          <p className="s-lb">Module</p>
          <button className="nl ml active" type="button">
            <span className="ni">🌐</span>
            <span className="nl-text">Web Testing</span>
            <span className="nb">{testCounts.web}</span>
          </button>
          <button className="nl ml" type="button">
            <span className="ni">📱</span>
            <span className="nl-text">App Testing</span>
            <span className="nb">{testCounts.app}</span>
          </button>

          <p className="s-lb">Actions</p>
          <button className="nl" type="button">
            <span className="ni">
              <span className="add-icon">+</span>
            </span>
            <span className="nl-text">Add Test</span>
          </button>
          <button className="nl" type="button">
            <span className="ni">📤</span>
            <span className="nl-text">Export</span>
          </button>
          <button className="nl" type="button">
            <span className="ni">📥</span>
            <span className="nl-text">Import</span>
          </button>
          <button className="nl" type="button">
            <span className="ni">🎨</span>
            <span className="nl-text">Theme</span>
          </button>
          <button className="nl" type="button">
            <span className="ni">🔄</span>
            <span className="nl-text">Reset All</span>
          </button>
        </nav>

        <div className="s-ft">
          <div className="s-us">
            <div className="s-av">QA</div>
            <div>
              <div className="s-un">QA Team</div>
              <div className="s-ud">Professional</div>
            </div>
          </div>
        </div>
      </aside>

      {/* OVERLAY */}
      <div
        className={`s-ov ${sidebarOpen ? 'on' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* HAMBURGER MENU BUTTON */}
      <button
        className="hm"
        onClick={() => setSidebarOpen(true)}
        title="Open sidebar"
        aria-label="Menu"
        style={{ position: 'fixed', top: '18px', left: '18px', zIndex: 999 }}
      >
        ☰
      </button>
    </>
  );
}
