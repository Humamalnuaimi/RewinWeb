import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Filter, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { usersAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import Toast, { ToastProps } from '../components/Toast';

interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  disabled: boolean;
  metadata: {
    creationTime: string;
    lastSignInTime: string;
  };
  businessCount?: number;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await usersAPI.getAll();
        setUsers(response.data.users);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Users Management</h1>
        <p className="page-subtitle">
          Manage all user accounts, permissions, and business associations.
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10 w-64"
            />
          </div>
          <button className="btn btn-secondary">
            <Filter size={16} />
            Filter
          </button>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">All Users</h3>
          <p className="card-subtitle">{filteredUsers.length} users found</p>
        </div>
        <div className="card-body p-0">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Businesses</th>
                  <th>Created</th>
                  <th>Last Sign In</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.uid} style={{ cursor: 'pointer' }} onClick={() => navigate(`/users/${user.uid}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-primary-color to-secondary-color rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {user.displayName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {user.displayName || 'No Name'}
                          </p>
                          <p className="text-xs text-gray-500">ID: {user.uid.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="text-sm text-gray-900">{user.email}</p>
                        {user.emailVerified && (
                          <span className="badge badge-success">Verified</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${user.disabled ? 'badge-danger' : 'badge-success'}`}>
                        {user.disabled ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-900">{user.businessCount || 0}</span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-500">
                        {user.metadata?.creationTime
                          ? new Date(user.metadata.creationTime).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-500">
                        {user.metadata?.lastSignInTime
                          ? new Date(user.metadata.lastSignInTime).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="View" onClick={e => { e.stopPropagation(); navigate(`/users/${user.uid}`); }}>
                          <Eye size={16} />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-green-600 transition-colors" title="Edit" onClick={e => { e.stopPropagation(); setShowEditModal(user); }}>
                          <Edit size={16} />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Delete" onClick={e => { e.stopPropagation(); setShowDeleteModal(user.uid); }}>
                          <Trash2 size={16} />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors" title="More">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={!!showDeleteModal} onClose={() => setShowDeleteModal(null)} title="Confirm Delete"
        actions={[
          <button key="cancel" className="btn btn-secondary" onClick={() => setShowDeleteModal(null)} disabled={deleting}>Cancel</button>,
          <button key="delete" className="btn btn-danger" onClick={async () => {
            setDeleting(true);
            try {
              await usersAPI.delete(showDeleteModal!);
              setUsers(users.filter(u => u.uid !== showDeleteModal));
              setToast({ message: 'User deleted successfully', type: 'success', onClose: () => setToast(null) });
            } catch {
              setToast({ message: 'Failed to delete user', type: 'error', onClose: () => setToast(null) });
            } finally {
              setDeleting(false);
              setShowDeleteModal(null);
            }
          }} disabled={deleting}>Delete</button>
        ]}
      >
        Are you sure you want to delete this user? This action cannot be undone.
      </Modal>
      <Modal isOpen={!!showEditModal} onClose={() => setShowEditModal(null)} title="Edit User">
        <div>Editing user: {showEditModal?.email} (form coming soon)</div>
      </Modal>
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add User">
        <div>Add user form coming soon.</div>
      </Modal>
      {toast && <Toast {...toast} />}
    </div>
  );
};

export default UsersPage; 