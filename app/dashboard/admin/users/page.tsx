'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { FormField, inputCls, selectCls } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import apiClient from '@/lib/api/client';
import { Search, Users, Filter, ShieldCheck, Edit2, UserCheck, UserX } from 'lucide-react';
import { clsx } from 'clsx';

// ── types & constants ──────────────────────────────────────────────────────

const ROLES = ['', 'admin', 'ceo', 'founder', 'investor', 'finance'];

const ROLE_VARIANT: Record<string, any> = {
  admin:    'danger',
  ceo:      'info',
  founder:  'success',
  investor: 'warning',
  finance:  'outline',
};

const ROLE_LABELS: Record<string, string> = {
  admin:    'Admin',
  ceo:      'CEO',
  founder:  'Founder',
  investor: 'Investor',
  finance:  'Finance',
};

// ── API helpers ────────────────────────────────────────────────────────────

function fetchUsers(role: string, page: number) {
  const params: any = { page, limit: 15 };
  if (role) params.role = role;
  return apiClient.get('/users', { params }).then((r) => r.data);
}

function updateUser(id: string, data: any) {
  return apiClient.patch(`/users/${id}`, data).then((r) => r.data);
}

// ── helpers ────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function avatar(name: string) {
  return name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) ?? 'U';
}

const AVATAR_COLORS = [
  'bg-violet-600', 'bg-blue-600', 'bg-emerald-600',
  'bg-amber-600', 'bg-rose-600', 'bg-cyan-600',
];

function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

// ── page ───────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const qc = useQueryClient();

  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage]           = useState(1);

  const [editUser, setEditUser]   = useState<any>(null);
  const [editForm, setEditForm]   = useState({ name: '', email: '', role: '', isActive: true });
  const [editError, setEditError] = useState('');

  // ── data ──────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter, page],
    queryFn: () => fetchUsers(roleFilter, page),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setEditUser(null);
      setEditError('');
    },
    onError: (err: any) => {
      setEditError(err?.response?.data?.message ?? 'Update failed');
    },
  });

  // ── derived ───────────────────────────────────────────────────────────────

  const allUsers: any[] = data?.users ?? [];
  const users = search
    ? allUsers.filter(
        (u) =>
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase()),
      )
    : allUsers;

  // Role stats from current page
  const roleCounts = allUsers.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  // ── handlers ─────────────────────────────────────────────────────────────

  function openEdit(u: any) {
    setEditUser(u);
    setEditForm({ name: u.name, email: u.email, role: u.role, isActive: u.isActive });
    setEditError('');
  }

  function handleSave() {
    if (!editForm.name.trim()) { setEditError('Name is required'); return; }
    updateMutation.mutate({ id: editUser._id, data: editForm });
  }

  function toggleActive(u: any) {
    updateMutation.mutate({ id: u._id, data: { isActive: !u.isActive } });
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 text-sm mt-1">{data?.total ?? 0} registered users</p>
        </div>

        {/* Role stat chips */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(ROLE_LABELS).map(([role, label]) => (
            <button
              key={role}
              onClick={() => { setRoleFilter(roleFilter === role ? '' : role); setPage(1); }}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                roleFilter === role
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-600',
              )}
            >
              <span>{label}</span>
              {roleCounts[role] != null && (
                <span className={clsx(
                  'rounded-full px-1.5 py-0.5 text-xs',
                  roleFilter === role ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-500',
                )}>
                  {roleCounts[role]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search + filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r ? ROLE_LABELS[r] : 'All roles'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <Card padding={false}>
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading users…</div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Header row */}
              <div className="grid grid-cols-12 px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide bg-slate-50 rounded-t-xl">
                <span className="col-span-4">User</span>
                <span className="col-span-2">Role</span>
                <span className="col-span-2">Status</span>
                <span className="col-span-2">Last Login</span>
                <span className="col-span-1">Joined</span>
                <span className="col-span-1"></span>
              </div>

              {/* User rows */}
              {users.map((u: any) => (
                <div key={u._id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50 transition-colors">

                  {/* Avatar + name + email */}
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className={clsx(
                      'w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
                      avatarColor(u._id),
                    )}>
                      {avatar(u.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{u.name}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="col-span-2">
                    <Badge variant={ROLE_VARIANT[u.role] ?? 'outline'}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </Badge>
                  </div>

                  {/* Active status */}
                  <div className="col-span-2">
                    <span className={clsx(
                      'inline-flex items-center gap-1.5 text-xs font-medium',
                      u.isActive ? 'text-emerald-600' : 'text-slate-400',
                    )}>
                      <span className={clsx(
                        'w-1.5 h-1.5 rounded-full',
                        u.isActive ? 'bg-emerald-500' : 'bg-slate-300',
                      )} />
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Last login */}
                  <div className="col-span-2 text-sm text-slate-500">
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : <span className="text-slate-300">Never</span>}
                  </div>

                  {/* Joined */}
                  <div className="col-span-1 text-sm text-slate-500">
                    {formatDate(u.createdAt)}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <button
                      onClick={() => toggleActive(u)}
                      title={u.isActive ? 'Deactivate' : 'Activate'}
                      className={clsx(
                        'p-1.5 rounded-lg transition-colors',
                        u.isActive
                          ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                          : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50',
                      )}
                    >
                      {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                    </button>
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                      title="Edit user"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-slate-500">Page {page} of {data.totalPages}</span>
            <Button variant="secondary" disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>

      {/* ── Edit User Modal ─────────────────────────────────────────────── */}
      {editUser && (
        <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User" size="sm">
          <div className="space-y-4">

            {/* User identity card */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
                avatarColor(editUser._id),
              )}>
                {avatar(editUser.name)}
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{editUser.name}</p>
                <p className="text-xs text-slate-400">{editUser.email}</p>
              </div>
              <div className="ml-auto">
                <Badge variant={ROLE_VARIANT[editUser.role] ?? 'outline'}>
                  {ROLE_LABELS[editUser.role] ?? editUser.role}
                </Badge>
              </div>
            </div>

            <FormField label="Full Name" required>
              <input
                className={inputCls}
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
              />
            </FormField>

            <FormField label="Email">
              <input
                className={inputCls}
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Role">
                <select
                  className={selectCls}
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                >
                  {Object.entries(ROLE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Status">
                <select
                  className={selectCls}
                  value={editForm.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.value === 'active' }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FormField>
            </div>

            {/* Readonly info */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-xs text-slate-400 mb-0.5">Joined</p>
                <p className="text-sm font-medium text-slate-700">{formatDate(editUser.createdAt)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-xs text-slate-400 mb-0.5">Last Login</p>
                <p className="text-sm font-medium text-slate-700">
                  {editUser.lastLoginAt ? formatDate(editUser.lastLoginAt) : 'Never'}
                </p>
              </div>
            </div>

            {editError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {editError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button onClick={handleSave} loading={updateMutation.isPending}>Save Changes</Button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
