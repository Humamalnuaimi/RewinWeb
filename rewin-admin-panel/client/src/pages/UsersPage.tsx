import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Edit, 
  Trash2, 
  UserPlus,
  Mail,
  Calendar,
  Building2,
  CheckCircle,
  XCircle,
  Eye
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
  outletCount: number;
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
  const [addUserForm, setAddUserForm] = useState({
    email: '',
    displayName: '',
    password: '',
    confirmPassword: ''
  });
  const [addUserLoading, setAddUserLoading] = useState(false);
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
    console.log('View user clicked:', user);
    console.log('Navigating to:', `/users/${user.uid}/analytics`);
    console.log('Current location:', window.location.href);
    
    try {
      navigate(`/users/${user.uid}/analytics`);
      console.log('Navigation called successfully');
    } catch (error) {
      console.error('Navigation error:', error);
    }
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
    setAddUserForm({
      email: '',
      displayName: '',
      password: '',
      confirmPassword: ''
    });
    setShowAddModal(true);
  };

  const handleCreateUser = async () => {
    try {
      setAddUserLoading(true);
      
      // Validate form
      if (!addUserForm.email || !addUserForm.displayName || !addUserForm.password) {
        setToast({ message: 'Please fill in all required fields', type: 'error', onClose: () => setToast(null) });
        return;
      }
      
      if (addUserForm.password !== addUserForm.confirmPassword) {
        setToast({ message: 'Passwords do not match', type: 'error', onClose: () => setToast(null) });
        return;
      }
      
      if (addUserForm.password.length < 6) {
        setToast({ message: 'Password must be at least 6 characters', type: 'error', onClose: () => setToast(null) });
        return;
      }
      
      // Create user
      const response = await usersAPI.create({
        email: addUserForm.email,
        displayName: addUserForm.displayName,
        password: addUserForm.password
      });
      
      if (response.success) {
        setToast({ message: 'User created successfully', type: 'success', onClose: () => setToast(null) });
        setShowAddModal(false);
        fetchUsers(); // Refresh the users list
      } else {
        setToast({ message: response.error || 'Failed to create user', type: 'error', onClose: () => setToast(null) });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setToast({ message: 'Error creating user', type: 'error', onClose: () => setToast(null) });
    } finally {
      setAddUserLoading(false);
    }
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
                    <th>Outlets</th>
                    <th>Customers</th>
                    <th>Created</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr 
                      key={user.uid}
                      style={{ 
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease'
                      }}
                      onClick={() => handleViewUser(user)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
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
                          <Building2 size={14} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                          <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                            {user.outletCount}
                          </span>
                        </div>
                      </td>
                      
                      <td>
                        <div 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s ease'
                          }}
                          onClick={() => {
                            console.log('Customer count clicked for user:', user.uid);
                            navigate(`/users/${user.uid}/analytics`);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
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
                              transition: 'all 0.2s ease',
                              pointerEvents: 'auto',
                              zIndex: 10,
                              position: 'relative'
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
          actions={
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid rgba(102, 126, 234, 0.3)',
                  background: 'rgba(102, 126, 234, 0.1)',
                  color: '#667eea',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={addUserLoading}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: addUserLoading 
                    ? 'rgba(102, 126, 234, 0.5)' 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  cursor: addUserLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  opacity: addUserLoading ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!addUserLoading) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {addUserLoading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'grid', gap: '20px' }}>
            {/* Help Text */}
            <div style={{
              background: 'rgba(102, 126, 234, 0.05)',
              border: '1px solid rgba(102, 126, 234, 0.2)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <p style={{
                fontSize: '12px',
                color: '#374151',
                margin: 0,
                fontWeight: '500'
              }}>
                💡 Fill in the information below to create a new user account. The user will be able to access the system immediately.
              </p>
            </div>

            {/* Email Field */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#1f2937',
                fontSize: '14px'
              }}>
                Email Address *
              </label>
              <input
                type="email"
                value={addUserForm.email}
                onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(102, 126, 234, 0.2)',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box' as const,
                  background: 'white',
                  color: '#1f2937'
                }}
                placeholder="Enter email address"
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(102, 126, 234, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Display Name Field */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#1f2937',
                fontSize: '14px'
              }}>
                Display Name *
              </label>
              <input
                type="text"
                value={addUserForm.displayName}
                onChange={(e) => setAddUserForm({ ...addUserForm, displayName: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(102, 126, 234, 0.2)',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box' as const,
                  background: 'white',
                  color: '#1f2937'
                }}
                placeholder="Enter display name"
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(102, 126, 234, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Password Field */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#1f2937',
                fontSize: '14px'
              }}>
                Password *
              </label>
              <input
                type="password"
                value={addUserForm.password}
                onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(102, 126, 234, 0.2)',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box' as const,
                  background: 'white',
                  color: '#1f2937'
                }}
                placeholder="Enter password (min 6 characters)"
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(102, 126, 234, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <p style={{
                fontSize: '11px',
                color: '#6b7280',
                margin: '4px 0 0 0'
              }}>
                Minimum 6 characters required
              </p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#1f2937',
                fontSize: '14px'
              }}>
                Confirm Password *
              </label>
              <input
                type="password"
                value={addUserForm.confirmPassword}
                onChange={(e) => setAddUserForm({ ...addUserForm, confirmPassword: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(102, 126, 234, 0.2)',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box' as const,
                  background: 'white',
                  color: '#1f2937'
                }}
                placeholder="Confirm password"
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(102, 126, 234, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {addUserForm.password && addUserForm.confirmPassword && addUserForm.password !== addUserForm.confirmPassword && (
                <p style={{
                  fontSize: '11px',
                  color: '#ef4444',
                  margin: '4px 0 0 0'
                }}>
                  Passwords do not match
                </p>
              )}
            </div>
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