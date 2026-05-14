import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { ChecklistItem } from '../types';
import { useAuth } from '../lib/auth';
import { PageShell } from '../components/PageShell';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Alert } from '../components/Alert';
import { StatusBadge } from '../components/StatusBadge';
import { ThemeToggle } from '../components/ThemeToggle';

export function DashboardPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | ''>('');
  const auth = useAuth();
  const token = useMemo(() => localStorage.getItem('qa-checklist-token') || '', []);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await api.get('/checklists', { headers });
        setItems(response.data.items);
      } catch (error) {
        setMessageType('danger');
        setMessage('Unable to load checklist items.');
      }
    };

    void loadItems();
  }, [headers]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await api.post('/checklists', { title, description }, { headers });
      setItems([response.data.item, ...items]);
      setTitle('');
      setDescription('');
      setMessageType('success');
      setMessage('Checklist item created successfully.');
    } catch (error) {
      setMessageType('danger');
      setMessage('Unable to create item.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/checklists/${id}`, { headers });
      setItems(items.filter((item) => item.id !== id));
      setMessageType('success');
      setMessage('Checklist item removed.');
    } catch (error) {
      setMessageType('danger');
      setMessage('Unable to delete item.');
    }
  };

  return (
    <PageShell
      title="Checklist dashboard"
      subtitle="Team workflow"
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <ThemeToggle />
          <Button variant="secondary" onClick={auth.logout}>
            Sign out
          </Button>
        </div>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-300">My backlog</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Checklist items</h2>
            </div>
            <StatusBadge status={items.length > 0 ? 'IN_PROGRESS' : 'PENDING'} />
          </div>

          {message && messageType && <Alert variant={messageType} title={messageType === 'success' ? 'Success' : 'Error'} message={message} onClose={() => setMessage('')} />}

          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="rounded-3xl border border-slate-700/60 bg-slate-950/80 px-5 py-8 text-slate-400">
                No checklist items yet. Create one to get started.
              </div>
            ) : (
              items.map((item) => (
                <article key={item.id} className="rounded-3xl border border-slate-700/60 bg-slate-950/80 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                      <p className="mt-3 text-sm text-slate-400">{item.description || 'No description provided.'}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                    <span>Updated {new Date(item.updatedAt).toLocaleDateString()}</span>
                    <button className="rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-400/10" onClick={() => handleDelete(item.id)}>
                      Remove
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
          <div className="mb-5">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-300">Quick create</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Add checklist item</h3>
            <p className="mt-2 text-sm text-slate-400">Create new tasks, assign status, and keep the team aligned.</p>
          </div>
          <form onSubmit={handleCreate} className="space-y-5">
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter a checklist title" required />
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                placeholder="Add details for the task"
              />
            </div>
            <Button type="submit" fullWidth>
              Create item
            </Button>
          </form>
        </aside>
      </div>
    </PageShell>
  );
}
