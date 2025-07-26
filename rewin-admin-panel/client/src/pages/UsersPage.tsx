import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  UserPlus,
  Mail,
  Calendar,
  Shield,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { usersAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

interface User {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: string;
  lastSignIn: string;
  disabled: boolean;
  emailVerified: boolean;
  businessCount: number;
  customerCount: number;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; onClose: () => void } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      if (response.success) {
        setUsers(response.users);
      } else {
        setToast({ message: 'Failed to fetch users', type: 'error', onClose: () => setToast(null) });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setToast({ message: 'Error loading users', type: 'error', onClose: () => setToast(null) });
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = (user: User) => {
    navigate(`/users/${user.uid}`);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleAddUser = () => {
    setShowAddModal(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && !user.disabled) ||
                         (filterStatus === 'disabled' && user.disabled);
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage all registered users and their accounts</p>
        </div>
        <button className="btn btn-primary" onClick={handleAddUser}>
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div className="card">
        <div className="card-content">
          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
              <Search size={16} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255, 255, 255, 0.5)'
              }} />
              <input
                type="text"
                placeholder="Search users by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '40px' }}
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="form-input"
              style={{ minWidth: '150px' }}
            >
              <option value="all">All Users</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            Users ({filteredUsers.length})
          </h2>
        </div>
        
        <div className="card-content">
          {filteredUsers.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Businesses</th>
                    <th>Customers</th>
                    <th>Created</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.uid}>
                      <td>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '0.875rem'
                          }}>
                            {user.displayName?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{
                              color: 'white',
                              fontWeight: '500',
                              fontSize: '0.875rem'
                            }}>
                              {user.displayName || 'No Name'}
                            </div>
                            <div style={{
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontSize: '0.75rem'
                            }}>
                              {user.emailVerified && <CheckCircle size={12} style={{ marginRight: '4px' }} />}
                              {user.emailVerified ? 'Verified' : 'Unverified'}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <Mail size={14} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                          <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                            {user.email}
                          </span>
                        </div>
                      </td>
                      
                      <td>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          {user.disabled ? (
                            <>
                              <XCircle size={14} color="#ef4444" />
                              <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                                Disabled
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} color="#10b981" />
                              <span style={{ color: '#10b981', fontSize: '0.875rem' }}>
                                Active
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      
                      <td>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <Shield size={14} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                          <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                            {user.businessCount}
                          </span>
                        </div>
                      </td>
                      
                      <td>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <Users size={14} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                          <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                            {user.customerCount}
                          </span>
                        </div>
                      </td>
                      
                      <td>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <Calendar size={14} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                          <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.875rem' }}>
                            {formatDate(user.createdAt)}
                          </span>
                        </div>
                      </td>
                      
                      <td>
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.875rem' }}>
                          {formatDate(user.lastSignIn)}
                        </span>
                      </td>
                      
                      <td>
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          alignItems: 'center'
                        }}>
                          <button
                            onClick={() => handleViewUser(user)}
                            style={{
                              padding: '0.5rem',
                              background: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                              borderRadius: '8px',
                              color: '#3b82f6',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                            }}
                          >
                            <Eye size={16} />
                          </button>
                          
                          <button
                            onClick={() => handleEditUser(user)}
                            style={{
                              padding: '0.5rem',
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid rgba(34, 197, 94, 0.2)',
                              borderRadius: '8px',
                              color: '#22c55e',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
                            }}
                          >
                            <Edit size={16} />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteUser(user)}
                            style={{
                              padding: '0.5rem',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              borderRadius: '8px',
                              color: '#ef4444',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Users size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h3>No Users Found</h3>
              <p>No users match your current search criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New User"
        >
          <div style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            <p>Add user functionality will be implemented here.</p>
          </div>
        </Modal>
      )}

      {showEditModal && selectedUser && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit User"
        >
          <div style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            <p>Edit user functionality will be implemented here.</p>
            <p>Editing: {selectedUser.email}</p>
          </div>
        </Modal>
      )}

      {showDeleteModal && selectedUser && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete User"
        >
          <div style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            <p>Are you sure you want to delete this user?</p>
            <p><strong>{selectedUser.email}</strong></p>
            <p>This action cannot be undone.</p>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && <Toast {...toast} />}
    </div>
  );
};

export default UsersPage; 