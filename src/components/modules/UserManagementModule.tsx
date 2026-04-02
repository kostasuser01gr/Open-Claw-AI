import { useCallback, useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Shield, Users, UserPlus } from 'lucide-react';
import { functions } from '@/firebase';
import { cn } from '@/lib/utils';
import type { NotificationType, UserRole } from '@/types/domain';
import { StatCard } from './StatCard';

interface ManagedUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  branchId?: string;
  createdAt?: string;
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-500/10 text-red-500',
  manager: 'bg-blue-500/10 text-blue-500',
  staff: 'bg-green-500/10 text-green-500',
  driver: 'bg-yellow-500/10 text-yellow-500',
  customer: 'bg-text-muted/10 text-text-muted',
};

interface UserManagementModuleProps {
  onNotify: (title: string, message: string, type?: NotificationType) => void;
}

export function UserManagementModule({ onNotify }: UserManagementModuleProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('staff');
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const listFn = httpsCallable<unknown, { users: ManagedUser[] }>(functions, 'adminListUsers');
      const result = await listFn({});
      setUsers(result.data.users as ManagedUser[]);
    } catch {
      onNotify('Error', 'Failed to load users.', 'error');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleCreate = async () => {
    if (!newEmail.trim() || !newName.trim()) {
      onNotify('Validation', 'Email and name are required.', 'warning');
      return;
    }
    setCreating(true);
    try {
      const createFn = httpsCallable(functions, 'adminCreateUser');
      await createFn({ email: newEmail.trim(), displayName: newName.trim(), role: newRole });
      onNotify('User created', `${newName.trim()} was added as ${newRole}.`, 'success');
      setNewEmail('');
      setNewName('');
      setNewRole('staff');
      setShowCreateForm(false);
      void loadUsers();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      onNotify('Error', msg, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (targetUid: string, role: UserRole) => {
    try {
      const updateFn = httpsCallable(functions, 'adminUpdateUserRole');
      await updateFn({ targetUid, role });
      onNotify('Role updated', `User role changed to ${role}.`, 'success');
      setUsers((prev) => prev.map((u) => (u.id === targetUid || u.uid === targetUid ? { ...u, role } : u)));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      onNotify('Error', msg, 'error');
    }
  };

  const roleCounts = users.reduce(
    (acc, u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={users.length} icon={<Users className="w-4 h-4" />} />
        <StatCard title="Admins" value={roleCounts.admin ?? 0} icon={<Shield className="w-4 h-4" />} color="text-red-500" />
        <StatCard title="Staff" value={(roleCounts.staff ?? 0) + (roleCounts.manager ?? 0)} icon={<Users className="w-4 h-4" />} color="text-green-500" />
        <StatCard title="Customers" value={roleCounts.customer ?? 0} icon={<Users className="w-4 h-4" />} color="text-blue-500" />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">All Users</h3>
        <button
          onClick={() => setShowCreateForm((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 text-orange-500 text-sm font-medium hover:bg-orange-500/20 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {showCreateForm && (
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="email"
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="px-3 py-2 rounded-lg bg-bg border border-border text-sm focus:outline-none focus:border-orange-500"
            />
            <input
              type="text"
              placeholder="Display name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-3 py-2 rounded-lg bg-bg border border-border text-sm focus:outline-none focus:border-orange-500"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="px-3 py-2 rounded-lg bg-bg border border-border text-sm focus:outline-none focus:border-orange-500"
            >
              <option value="customer">Customer</option>
              <option value="driver">Driver</option>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void handleCreate()}
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create User'}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 rounded-lg border border-border text-sm text-text-muted hover:bg-border transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-text-muted text-center py-8">Loading users...</div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-left">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-border/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-text">{user.displayName || '—'}</td>
                    <td className="px-4 py-3 text-text-muted">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', ROLE_COLORS[user.role] ?? ROLE_COLORS.customer)}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => void handleRoleChange(user.uid || user.id, e.target.value as UserRole)}
                        className="px-2 py-1 rounded-md bg-bg border border-border text-xs focus:outline-none focus:border-orange-500"
                      >
                        <option value="customer">Customer</option>
                        <option value="driver">Driver</option>
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <div className="text-center py-8 text-text-muted text-sm">No users found.</div>
          )}
        </div>
      )}
    </div>
  );
}
