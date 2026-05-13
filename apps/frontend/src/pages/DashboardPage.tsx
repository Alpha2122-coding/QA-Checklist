import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { ChecklistItem } from '../types';
import { useAuth } from '../lib/auth';

const statusClasses: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-300',
  IN_PROGRESS: 'bg-sky-500/10 text-sky-300',
  PASSED: 'bg-emerald-500/10 text-emerald-300',
  FAILED: 'bg-red-500/10 text-red-300',
  BLOCKED: 'bg-violet-500/10 text-violet-300'
};

export function DashboardPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const auth = useAuth();
  const token = useMemo(() => localStorage.getItem('qa-checklist-token') || '', []);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchItems = async () => {
    try {
      const response = await api.get('/checklists', { headers });
      setItems(response.data.items);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await api.post('/checklists', { title, description }, { headers });
      setItems([response.data.item, ...items]);
      setTitle('');
      setDescription('');
      setMessage('Checklist item created successfully.');
    } catch (error) {
      setMessage('Unable to create item.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/checklists/${id}`, { headers });
      setItems(items.filter((item) => item.id !== id));
    } catch (error) {
      setMessage('Unable to delete item.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-brand-300">Team workflow</p>
              <h1 className="mt-4 text-4xl font-semibold text-white">Quality-ready checklists</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                Track requirements, manage status, and stay aligned with modern QA operations.
              </p>
            </div>
            <button
              className="rounded-2xl border border-slate-700 bg-slate-950/90 px-5 py-3 text-sm text-white transition hover:border-brand-400"
              onClick={auth.logout}
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-brand-300">My backlog</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Checklist items</h2>
              </div>
              <span className="rounded-2xl bg-brand-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-brand-200">{items.length} items</span>
            </div>
            {message && <div className="mb-4 rounded-2xl bg-slate-800 p-4 text-sm text-slate-200">{message}</div>}
            <div className="space-y-4">
              {items.length === 0 ? (
                <div className="rounded-3xl border border-slate-700/60 bg-slate-950/80 px-5 py-8 text-slate-400">
                  No checklist items yet. Create one to get started.
                </div>
              ) : (
                items.map((item) => (
                  <article key={item.id} className="rounded-3xl border border-slate-700/60 bg-slate-950/80 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                        <p className="mt-2 text-sm text-slate-400">{item.description || 'No description provided.'}</p>
                      </div>
                      <span className={`rounded-2xl px-3 py-2 text-xs font-semibold ${statusClasses[item.status] || 'bg-slate-800 text-slate-200'}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                      <span>Updated {new Date(item.updatedAt).toLocaleDateString()}</span>
                      <button className="rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-400/10" onClick={() => handleDelete(item.id)}>
                        Remove
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
            <h2 className="text-2xl font-semibold text-white">Add new item</h2>
            <p className="mt-2 text-sm text-slate-400">Create a checklist entry and track status in real time.</p>
            <form onSubmit={handleCreate} className="mt-6 space-y-5">
              <label className="block text-sm text-slate-300">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-brand-400"
                required
              />
              <label className="block text-sm text-slate-300">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-brand-400"
              />
              <button className="w-full rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-brand-600">
                Create item
              </button>
            </form>
          </aside>
        </div>
      </section>
    </main>
  );
}
