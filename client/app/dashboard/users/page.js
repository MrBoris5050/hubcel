'use client';
import { useState, useEffect } from 'react';
import { getUsers, toggleUser, changeUserRole, deleteUser, updateUser } from '../../../lib/api';
import { formatDate } from '../../../lib/utils';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { ShieldCheck, UserCheck, UserX, Trash2, Mail, Phone, Clock, LogIn, Users, Pencil, X, Wallet } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const { data } = await getUsers();
      setUsers(data.users);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load users' });
    }
    setLoading(false);
  };

  const handleToggle = async (id) => {
    try {
      const { data } = await toggleUser(id);
      setMessage({ type: 'success', text: data.message });

      await loadUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' });
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await changeUserRole(id, role);
      setMessage({ type: 'success', text: `Role changed to ${role}` });

      await loadUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' });
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await deleteUser(id);
      setMessage({ type: 'success', text: 'User deleted' });

      await loadUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' });
    }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ name: u.name, email: u.email, phone: u.phone });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await updateUser(editUser._id, editForm);
      setMessage({ type: 'success', text: data.message });
      setEditUser(null);
      await loadUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update user' });
    }
    setSaving(false);
  };

  if (loading) return <LoadingSpinner message="Loading users..." />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Users</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{users.length} registered users</p>
      </div>

      {/* Alert */}
      {message.text && (
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm border ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40'
            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800/40'
        }`}>
          {message.type === 'success' ? (
            <UserCheck className="w-4 h-4 shrink-0" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Users Table */}
      {users.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">User</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Contact</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Role</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Balance</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Last Login</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Logins</th>
                  <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-xs font-semibold">
                          {u.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-50">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="text-gray-600 dark:text-gray-300 flex items-center gap-1.5 text-xs">
                          <Mail className="w-3 h-3 text-gray-400" />{u.email}
                        </p>
                        <p className="text-gray-400 flex items-center gap-1.5 text-xs">
                          <Phone className="w-3 h-3" />{u.phone}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        u.role === 'admin' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        <ShieldCheck className="w-3 h-3" />
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.role === 'user' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium tabular-nums text-gray-700 dark:text-gray-200">
                          <Wallet className="w-3 h-3 text-gray-400" />
                          {u.creditType === 'ghs'
                            ? `GHS ${(u.balanceGHS || 0).toFixed(2)}`
                            : `${u.balanceGB || 0} GB`}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {u.lastLoginAt ? (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />{formatDate(u.lastLoginAt)}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">Never</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs tabular-nums">
                        <LogIn className="w-3 h-3" />{u.loginCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(u)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggle(u._id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            u.isActive
                              ? 'bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50'
                              : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                          }`}
                        >
                          {u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          {u.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleRoleChange(u._id, u.role === 'admin' ? 'user' : 'admin')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {u.role === 'admin' ? 'User' : 'Admin'}
                        </button>
                        <button
                          onClick={() => handleDelete(u._id, u.name)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                          title="Delete user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-1">No users found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">Users will appear here when they register</p>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Edit User</h3>
              <button onClick={() => setEditUser(null)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm dark:bg-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm dark:bg-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm dark:bg-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
