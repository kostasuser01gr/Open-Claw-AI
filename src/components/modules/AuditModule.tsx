import { useEffect, useState } from 'react';
import { FileText, Filter } from 'lucide-react';
import { collection, getDocs, getFirestore, limit, orderBy, query } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { StatCard } from './StatCard';

interface AuditLogEntry {
  id: string;
  uid: string;
  action: string;
  collection: string;
  documentId?: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

const PAGE_SIZE = 50;

export function AuditModule() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const db = getFirestore();
        const q = query(collection(db, 'audit_log'), orderBy('timestamp', 'desc'), limit(PAGE_SIZE));
        const snapshot = await getDocs(q);
        if (!cancelled) {
          setEntries(
            snapshot.docs.map((doc) => ({
              id: doc.id,
              ...(doc.data() as Omit<AuditLogEntry, 'id'>),
            })),
          );
        }
      } catch {
        // Firestore may not have audit_log collection yet
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  const filtered = filterAction
    ? entries.filter((e) => e.action.toLowerCase().includes(filterAction.toLowerCase()))
    : entries;

  const actions = [...new Set(entries.map((e) => e.action))];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Events" value={entries.length} icon={<FileText className="w-4 h-4" />} />
        <StatCard title="Unique Actions" value={actions.length} icon={<Filter className="w-4 h-4" />} color="text-blue-500" />
        <StatCard
          title="Last 24h"
          value={entries.filter((e) => Date.now() - e.timestamp < 86_400_000).length}
          icon={<FileText className="w-4 h-4" />}
          color="text-green-500"
        />
      </div>

      <div className="flex items-center gap-3">
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-2 rounded-lg bg-bg border border-border text-sm focus:outline-none focus:border-orange-500"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div className="bg-surface/50 rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table aria-label="Audit log" className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-border/50 text-text-muted uppercase text-[10px] font-bold tracking-widest">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Collection</th>
                <th className="px-4 py-3">Document</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-muted">Loading audit log...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-muted">No audit entries found.</td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-border/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-text-muted font-mono">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{entry.uid.slice(0, 8)}...</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                        'bg-blue-500/10 text-blue-500',
                      )}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{entry.collection}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">
                      {entry.documentId ? `#${entry.documentId.slice(0, 8)}` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
