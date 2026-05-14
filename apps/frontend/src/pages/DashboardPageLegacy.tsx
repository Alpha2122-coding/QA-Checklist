import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { api } from '../api/client';
import '../legacy-styles.css';

interface TestCycle {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'pending';
  testCount?: number;
  passedCount?: number;
  failedCount?: number;
}

interface TestCase {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'blocked' | 'pending';
  priority: 'critical' | 'high' | 'medium' | 'low';
  cycleId: string;
  steps?: string[];
  notes?: string;
}

export function DashboardPageLegacy() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('cycles');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [testCycles, setTestCycles] = useState<TestCycle[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [showNewCycleForm, setShowNewCycleForm] = useState(false);
  const [showNewCaseForm, setShowNewCaseForm] = useState(false);
  const [newCycleName, setNewCycleName] = useState('');
  const [newCaseName, setNewCaseName] = useState('');
  const [totalCycles, setTotalCycles] = useState(0);
  const [totalCases, setTotalCases] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load checklist data (we'll use this as cycles)
      const response = await api.get('/checklists');
      const data = response.data || [];
      
      // Convert checklist items to test cycles
      const cycles: TestCycle[] = data.map((item: any) => ({
        id: item.id,
        name: item.title,
        status: item.completed ? 'completed' : 'active',
        testCount: Math.floor(Math.random() * 50) + 5,
        passedCount: Math.floor(Math.random() * 50),
        failedCount: Math.floor(Math.random() * 10),
      }));
      
      setTestCycles(cycles);
      setTotalCycles(cycles.length);
      
      // Generate sample test cases
      const cases: TestCase[] = [];
      cycles.forEach(cycle => {
        for (let i = 0; i < (cycle.testCount || 5); i++) {
          const statuses: Array<'passed' | 'failed' | 'skipped' | 'blocked' | 'pending'> = ['passed', 'failed', 'skipped', 'blocked', 'pending'];
          const priorities: Array<'critical' | 'high' | 'medium' | 'low'> = ['critical', 'high', 'medium', 'low'];
          
          cases.push({
            id: `${cycle.id}-tc-${i + 1}`,
            name: `Test Case ${i + 1}: Verify ${['login', 'dashboard', 'settings', 'profile', 'export'][i % 5]}`,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            cycleId: cycle.id,
            steps: [
              'Step 1: Open application',
              'Step 2: Navigate to feature',
              'Step 3: Verify functionality',
            ],
            notes: 'Sample test case notes',
          });
        }
      });
      
      setTestCases(cases);
      setTotalCases(cases.length);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCycle = async () => {
    if (!newCycleName.trim()) return;
    
    try {
      // Create via API
      await api.post('/checklists', { title: newCycleName });
      setNewCycleName('');
      setShowNewCycleForm(false);
      loadData();
    } catch (error) {
      console.error('Failed to create cycle:', error);
    }
  };

  const handleAddCase = async () => {
    if (!newCaseName.trim()) return;
    
    // For now, just add to local state
    const newCase: TestCase = {
      id: `tc-${Date.now()}`,
      name: newCaseName,
      status: 'pending',
      priority: 'medium',
      cycleId: testCycles[0]?.id || 'default',
      steps: [],
      notes: '',
    };
    
    setTestCases([...testCases, newCase]);
    setNewCaseName('');
    setShowNewCaseForm(false);
  };

  const handleDeleteCycle = async (id: string) => {
    try {
      await api.delete(`/checklists/${id}`);
      loadData();
    } catch (error) {
      console.error('Failed to delete cycle:', error);
    }
  };

  const handleStatusChange = (caseId: string, newStatus: TestCase['status']) => {
    setTestCases(
      testCases.map(tc => 
        tc.id === caseId ? { ...tc, status: newStatus } : tc
      )
    );
  };

  if (loading) {
    return (
      <div className="app">
        <div className="mn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--mt)' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Sidebar Overlay */}
      <div 
        className={`s-ov ${sidebarOpen ? 'on' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      
      {/* Sidebar */}
      <aside className={`side ${sidebarOpen ? 'open' : ''}`}>
        <div className="s-hd">
          <div className="s-logo">Q</div>
          <div className="s-brand">
            <span className="s-br">QA Checklist Pro</span>
            <span className="s-sub">Test Management</span>
          </div>
          <button className="s-x" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        
        <nav className="s-nav">
          {/* Test Cycles Section */}
          <div>
            <div className="s-lb">Test Cycles</div>
            <button 
              className={`nl ${activeTab === 'cycles' ? 'active' : ''}`}
              onClick={() => { setActiveTab('cycles'); setSidebarOpen(false); }}
            >
              <span className="ni">🔄</span>
              <span className="nl-text">Cycles</span>
              <span className="nb">{totalCycles}</span>
            </button>
          </div>
          
          {/* Test Cases Section */}
          <div style={{ marginTop: '10px' }}>
            <div className="s-lb">Test Cases</div>
            <button 
              className={`nl ${activeTab === 'cases' ? 'active' : ''}`}
              onClick={() => { setActiveTab('cases'); setSidebarOpen(false); }}
            >
              <span className="ni">📋</span>
              <span className="nl-text">Cases</span>
              <span className="nb">{totalCases}</span>
            </button>
          </div>
          
          {/* Execution Section */}
          <div style={{ marginTop: '10px' }}>
            <div className="s-lb">Execution</div>
            <button 
              className={`nl ${activeTab === 'execution' ? 'active' : ''}`}
              onClick={() => { setActiveTab('execution'); setSidebarOpen(false); }}
            >
              <span className="ni">▶️</span>
              <span className="nl-text">Execution</span>
            </button>
          </div>
          
          {/* Reports Section */}
          <div style={{ marginTop: '10px' }}>
            <div className="s-lb">Analytics</div>
            <button 
              className={`nl ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => { setActiveTab('reports'); setSidebarOpen(false); }}
            >
              <span className="ni">📊</span>
              <span className="nl-text">Reports</span>
            </button>
          </div>
          
          {/* Settings Section */}
          <div style={{ marginTop: '10px' }}>
            <div className="s-lb">Account</div>
            <button 
              className={`nl ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
            >
              <span className="ni">⚙️</span>
              <span className="nl-text">Settings</span>
            </button>
          </div>
        </nav>
        
        {/* Footer */}
        <div className="s-ft">
          <div className="s-us">
            <div className="s-av">{user?.name?.charAt(0) || 'U'}</div>
            <div>
              <div className="s-un">{user?.name || 'User'}</div>
              <div className="s-ud">{user?.email || 'user@example.com'}</div>
            </div>
          </div>
          <button
            className="btn btn-d btn-sm"
            style={{ width: '100%', marginTop: '8px' }}
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="mn">
        {/* Header */}
        <header className="top">
          <div className="tl">
            <button 
              className="hm"
              onClick={() => setSidebarOpen(true)}
              style={{ display: window.innerWidth <= 768 ? 'flex' : 'none' }}
            >
              ☰
            </button>
            <div>
              <h1 className="tt">
                {activeTab === 'cycles' && '📊 Test Cycles'}
                {activeTab === 'cases' && '📋 Test Cases'}
                {activeTab === 'execution' && '▶️ Execution'}
                {activeTab === 'reports' && '📊 Reports'}
                {activeTab === 'settings' && '⚙️ Settings'}
              </h1>
              <p className="tp">Manage your test campaigns efficiently</p>
            </div>
          </div>
          
          <div className="tr">
            <div>
              <div className="tc">{totalCycles}</div>
              <div className="ti">Active Cycles</div>
            </div>
            <div>
              <div className="tc">{totalCases}</div>
              <div className="ti">Total Cases</div>
            </div>
          </div>
        </header>
        
        {/* Content Area */}
        <div className="bd">
          {/* Test Cycles Tab */}
          {activeTab === 'cycles' && (
            <div className="vw">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button 
                  className="btn btn-p btn-sm"
                  onClick={() => setShowNewCycleForm(true)}
                >
                  ➕ New Cycle
                </button>
              </div>
              
              {showNewCycleForm && (
                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--rr)',
                  border: '1px solid var(--bd)',
                  background: 'var(--sf)',
                  marginBottom: '16px'
                }}>
                  <input
                    type="text"
                    placeholder="Cycle name"
                    value={newCycleName}
                    onChange={(e) => setNewCycleName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--rs)',
                      border: '1px solid var(--bd2)',
                      marginBottom: '8px',
                      background: 'var(--bg)',
                      color: 'var(--tx)',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      className="btn btn-p btn-sm"
                      onClick={handleAddCycle}
                    >
                      Create
                    </button>
                    <button 
                      className="btn btn-g btn-sm"
                      onClick={() => {
                        setShowNewCycleForm(false);
                        setNewCycleName('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              <div id="tL">
                {testCycles.length === 0 ? (
                  <div className="empty">
                    <div className="eic">📭</div>
                    <p>No test cycles yet. Create one to get started.</p>
                  </div>
                ) : (
                  testCycles.map(cycle => (
                    <div key={cycle.id} className="cat">
                      <div className="cat-h">
                        <div className="cat-l">
                          <div className="cat-ic">🔄</div>
                          <div>
                            <div className="cat-n">{cycle.name}</div>
                            <div className="cat-m">{cycle.testCount} test cases</div>
                          </div>
                        </div>
                        <div className="cat-r">
                          {cycle.passedCount !== undefined && (
                            <div className="cat-b cbp">✓ {cycle.passedCount}</div>
                          )}
                          {cycle.failedCount !== undefined && (
                            <div className="cat-b cbf">✗ {cycle.failedCount}</div>
                          )}
                          <button 
                            className="cat-a"
                            onClick={() => handleDeleteCycle(cycle.id)}
                            title="Delete cycle"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {/* Test Cases Tab */}
          {activeTab === 'cases' && (
            <div className="vw">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button 
                  className="btn btn-p btn-sm"
                  onClick={() => setShowNewCaseForm(true)}
                >
                  ➕ New Case
                </button>
              </div>
              
              {showNewCaseForm && (
                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--rr)',
                  border: '1px solid var(--bd)',
                  background: 'var(--sf)',
                  marginBottom: '16px'
                }}>
                  <input
                    type="text"
                    placeholder="Test case name"
                    value={newCaseName}
                    onChange={(e) => setNewCaseName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--rs)',
                      border: '1px solid var(--bd2)',
                      marginBottom: '8px',
                      background: 'var(--bg)',
                      color: 'var(--tx)',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      className="btn btn-p btn-sm"
                      onClick={handleAddCase}
                    >
                      Create
                    </button>
                    <button 
                      className="btn btn-g btn-sm"
                      onClick={() => {
                        setShowNewCaseForm(false);
                        setNewCaseName('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {testCases.length === 0 ? (
                  <div className="empty">
                    <div className="eic">📭</div>
                    <p>No test cases yet. Create one to get started.</p>
                  </div>
                ) : (
                  testCases.map(testCase => (
                    <div key={testCase.id} className="row" data-s={testCase.status}>
                      <input type="checkbox" className="row-cb" />
                      <div className="row-info">
                        <div className="row-id">
                          <span className="row-dot" style={{
                            backgroundColor: testCase.status === 'passed' ? 'var(--ok)' :
                                           testCase.status === 'failed' ? 'var(--no)' :
                                           testCase.status === 'blocked' ? 'var(--bl)' :
                                           testCase.status === 'skipped' ? 'var(--sk)' :
                                           'var(--mt)'
                          }} />
                          {testCase.id}
                        </div>
                        <div className="row-nm">{testCase.name}</div>
                        <div className="row-dt">{new Date().toLocaleDateString()}</div>
                      </div>
                      <span className={`row-pri p-${testCase.priority}`}>{testCase.priority}</span>
                      <div className="row-acts">
                        <button 
                          className="ab ab-f"
                          onClick={() => handleStatusChange(testCase.id, 'failed')}
                          title="Mark as failed"
                        >
                          ✗
                        </button>
                        <button 
                          className="ab ab-b"
                          onClick={() => handleStatusChange(testCase.id, 'blocked')}
                          title="Mark as blocked"
                        >
                          ⊘
                        </button>
                        <button 
                          className="ab ab-s"
                          onClick={() => handleStatusChange(testCase.id, 'skipped')}
                          title="Mark as skipped"
                        >
                          ⊘
                        </button>
                        <button 
                          className="ab ab-n"
                          onClick={() => handleStatusChange(testCase.id, 'pending')}
                          title="Mark as pending"
                        >
                          ◯
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {/* Execution Tab */}
          {activeTab === 'execution' && (
            <div className="vw">
              <div className="card">
                <h3 style={{ marginBottom: '12px', fontWeight: 'bold' }}>Execution Progress</h3>
                <div className="pbar">
                  <div className="pseg psp" style={{ width: `${(testCases.filter(c => c.status === 'passed').length / testCases.length * 100) || 0}%` }} />
                  <div className="pseg psf" style={{ width: `${(testCases.filter(c => c.status === 'failed').length / testCases.length * 100) || 0}%` }} />
                  <div className="pseg psb" style={{ width: `${(testCases.filter(c => c.status === 'blocked').length / testCases.length * 100) || 0}%` }} />
                  <div className="pseg pss" style={{ width: `${(testCases.filter(c => c.status === 'skipped').length / testCases.length * 100) || 0}%` }} />
                </div>
                <div className="pleg">
                  <div className="pl lp">✓ Passed: {testCases.filter(c => c.status === 'passed').length}</div>
                  <div className="pl lf">✗ Failed: {testCases.filter(c => c.status === 'failed').length}</div>
                  <div className="pl lb">⊘ Blocked: {testCases.filter(c => c.status === 'blocked').length}</div>
                  <div className="pl ls">⊘ Skipped: {testCases.filter(c => c.status === 'skipped').length}</div>
                  <div className="pl lpe">⬡ Pending: {testCases.filter(c => c.status === 'pending').length}</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="vw">
              <div className="stats">
                <div className="st c-t">
                  <span className="se">📊</span>
                  <span className="sv">{totalCases}</span>
                  <span className="sl">Total Cases</span>
                </div>
                <div className="st c-p">
                  <span className="se">✓</span>
                  <span className="sv">{testCases.filter(c => c.status === 'passed').length}</span>
                  <span className="sl">Passed</span>
                  <span className="sp">{testCases.length > 0 ? Math.round(testCases.filter(c => c.status === 'passed').length / testCases.length * 100) : 0}%</span>
                </div>
                <div className="st c-f">
                  <span className="se">✗</span>
                  <span className="sv">{testCases.filter(c => c.status === 'failed').length}</span>
                  <span className="sl">Failed</span>
                  <span className="sp">{testCases.length > 0 ? Math.round(testCases.filter(c => c.status === 'failed').length / testCases.length * 100) : 0}%</span>
                </div>
                <div className="st c-b">
                  <span className="se">⊘</span>
                  <span className="sv">{testCases.filter(c => c.status === 'blocked').length}</span>
                  <span className="sl">Blocked</span>
                </div>
                <div className="st c-s">
                  <span className="se">⊘</span>
                  <span className="sv">{testCases.filter(c => c.status === 'skipped').length}</span>
                  <span className="sl">Skipped</span>
                </div>
                <div className="st c-pe">
                  <span className="se">⬡</span>
                  <span className="sv">{testCases.filter(c => c.status === 'pending').length}</span>
                  <span className="sl">Pending</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="vw">
              <div className="card">
                <h3 style={{ marginBottom: '12px', fontWeight: 'bold' }}>Account Settings</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>
                      Name
                    </label>
                    <input 
                      type="text" 
                      value={user?.name || ''} 
                      disabled
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--rs)',
                        border: '1px solid var(--bd2)',
                        background: 'var(--bg)',
                        color: 'var(--tx)',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>
                      Email
                    </label>
                    <input 
                      type="email" 
                      value={user?.email || ''} 
                      disabled
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--rs)',
                        border: '1px solid var(--bd2)',
                        background: 'var(--bg)',
                        color: 'var(--tx)',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>
                      Role
                    </label>
                    <input 
                      type="text" 
                      value={user?.role || ''} 
                      disabled
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--rs)',
                        border: '1px solid var(--bd2)',
                        background: 'var(--bg)',
                        color: 'var(--tx)',
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="card">
                <h3 style={{ marginBottom: '12px', fontWeight: 'bold', color: 'var(--no)' }}>Danger Zone</h3>
                <button 
                  className="btn btn-d btn-sm"
                  onClick={logout}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <footer className="foot">
          <span>© 2024 QA Checklist Pro. All rights reserved.</span>
        </footer>
      </main>
    </div>
  );
}
