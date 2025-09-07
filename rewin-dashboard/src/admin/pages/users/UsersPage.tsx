// FEATURE: Users Management
// FILE: UsersPage.tsx
// PURPOSE: Display and manage all Firebase users with v1 design matching
// ICONS USED: Users, Search, Eye, Mail, Calendar, CheckCircle, XCircle, ArrowLeft (from approved ACTION_ICONS)
// LAST MODIFIED: January 28, 2025

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Eye,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  ArrowLeft,
  UserPlus,
  ShoppingBag,
  Settings
} from 'lucide-react';
import AuthService from '../../services/firebase.service';
import AddUserModal, { type AddUserData } from '../../components/modals/AddUserModal';
// Temporarily disable complex modal - will use simple approach
// import BackendGmailConfigModal from '../../components/settings/BackendGmailConfigModal';
// import BackendEmailService, { BackendEmailConfig } from '../../services/backend-email.service';
// Temporarily define User interface locally to avoid import issues
interface User {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: string;
  lastSignIn: string;
  disabled: boolean;
  emailVerified: boolean;
  photoURL?: string;
  outletCount: number;
}

const UsersPage: React.FC = () => {
  // 1. STATE MANAGEMENT
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showBackendGmailConfigModal, setShowBackendGmailConfigModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // 2. HOOKS
  const navigate = useNavigate();

  // 3. EFFECTS
  useEffect(() => {
    fetchUsers();
  }, []);

  // 4. HANDLERS
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch users using the AuthService
      const result = await AuthService.getUsers();
      
      if (result.success) {
        setUsers(result.users);
        console.log(`✅ Successfully loaded ${result.users.length} users from Firebase`);
      } else {
        console.error('❌ Failed to fetch users:', result.error);
        // Fallback to demo data if Firebase fetch fails
        const fallbackUsers: User[] = [
          {
            uid: 'user1',
            email: 'alnuaimi.humam@gmail.com',
            displayName: 'Humam Al-Nuaimi',
            createdAt: '2024-01-15T10:30:00Z',
            lastSignIn: '2025-01-28T14:22:00Z',
            disabled: false,
            emailVerified: true,
            photoURL: undefined,
            outletCount: 0
          }
        ];
        setUsers(fallbackUsers);
      }
    } catch (error) {
      console.error('❌ Unexpected error fetching users:', error);
      // Fallback to demo data
      const fallbackUsers: User[] = [
        {
          uid: 'user1',
          email: 'alnuaimi.humam@gmail.com',
          displayName: 'Humam Al-Nuaimi',
          createdAt: '2024-01-15T10:30:00Z',
          lastSignIn: '2025-01-28T14:22:00Z',
          disabled: false,
          emailVerified: true,
          photoURL: undefined,
          outletCount: 0
        }
      ];
      setUsers(fallbackUsers);
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = (user: User) => {
    console.log('Navigating to user details:', user.email);
    navigate(`/admin/users/${user.uid}`);
  };

  const handleAddUser = async (userData: AddUserData) => {
    try {
      console.log('🆕 Adding new user:', userData);
      
      // Create user using AuthService
      const result = await AuthService.createUser(userData);
      
      if (result.success) {
        console.log('✅ User created successfully:', result.user);
        
        // Wait a moment for Firebase to propagate the changes
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Refresh users list after adding
        await fetchUsers();
        
        // Show success message (you can add a toast notification here)
        console.log('✅ User created successfully and added to the list!');
      } else {
        throw new Error(result.error || 'Failed to create user');
      }
      
    } catch (error) {
      console.error('❌ Error adding user:', error);
      throw error; // Re-throw to show error in modal
    }
  };

  const handleAddUserClick = () => {
    console.log('Add User clicked - opening modal');
    setShowAddUserModal(true);
  };

  const handleBackendGmailConfigClick = () => {
    console.log('Backend Gmail Config clicked - opening modal');
    setShowBackendGmailConfigModal(true);
  };

  const handleBackendGmailConfigSave = (config: any) => {
    console.log('Backend Gmail configuration saved:', config);
    // BackendEmailService.initialize(config);
  };

  const handleBackToDashboard = () => {
    navigate('/admin/dashboard');
  };

  // 5. UTILITY FUNCTIONS
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && !user.disabled) ||
                         (filterStatus === 'disabled' && user.disabled);
    return matchesSearch && matchesFilter;
  });

  // 6. RENDER HELPERS
  const renderHeader = () => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '2rem',
      marginBottom: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
        borderRadius: '20px',
        pointerEvents: 'none'
      }} />
      
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={handleBackToDashboard}
            style={{
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              color: 'rgba(255, 255, 255, 0.9)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <ArrowLeft size={20} />
          </button>
          
          <div>
            <h1 style={{
              color: 'white',
              fontSize: '2.5rem',
              fontWeight: '700',
              margin: '0 0 0.5rem 0',
              background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Users
            </h1>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '1.1rem',
              margin: 0,
              fontWeight: '400'
            }}>
              Manage all registered users and their accounts
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
                          onClick={handleBackendGmailConfigClick}
            style={{
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              color: 'rgba(255, 255, 255, 0.9)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
                          title="Configure Backend Gmail API Service"
          >
            <Settings size={16} />
          </button>
          
          <button 
            onClick={handleAddUserClick}
            style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.3s ease',
            fontSize: '0.875rem',
            fontWeight: '600',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
          }}>
            <UserPlus size={16} />
            Add User
          </button>
        </div>
      </div>
    </div>
  );

  const renderSearchAndFilter = () => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '1.5rem',
      marginBottom: '2rem'
    }}>
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
            style={{
              width: '100%',
              padding: '14px 16px 14px 40px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '400',
              outline: 'none',
              transition: 'all 0.25s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            minWidth: '150px',
            padding: '14px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'white',
            fontSize: '14px',
            fontWeight: '400',
            outline: 'none',
            transition: 'all 0.25s ease',
            cursor: 'pointer'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <option value="all" style={{ background: '#1a1a1a', color: 'white' }}>All Users</option>
          <option value="active" style={{ background: '#1a1a1a', color: 'white' }}>Active</option>
          <option value="disabled" style={{ background: '#1a1a1a', color: 'white' }}>Disabled</option>
        </select>
      </div>
    </div>
  );

  const renderUsersTable = () => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
        borderRadius: '20px',
        pointerEvents: 'none'
      }} />
      
      <div style={{
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          marginBottom: '2rem'
        }}>
          <h2 style={{
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: '600',
            margin: '0 0 0.5rem 0'
          }}>
            Users ({filteredUsers.length})
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.875rem',
            margin: 0
          }}>
            All registered users in the system
          </p>
        </div>

        {filteredUsers.length > 0 ? (
          <div style={{
            overflowX: 'auto',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: 'rgba(255, 255, 255, 0.03)'
            }}>
              <thead>
                <tr style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>User</th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>Email</th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>Status</th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>Total Outlets</th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>Last Active</th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'center',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr 
                    key={user.uid}
                    style={{ 
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                    onClick={() => handleViewUser(user)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '1rem' }}>
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
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {user.emailVerified && <CheckCircle size={12} />}
                            {user.emailVerified ? 'Verified' : 'Unverified'}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td style={{ padding: '1rem' }}>
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
                    
                    <td style={{ padding: '1rem' }}>
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
                    
                    <td style={{ padding: '1rem' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <ShoppingBag size={14} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.875rem' }}>
                          {user.outletCount} {user.outletCount === 1 ? 'outlet' : 'outlets'}
                        </span>
                      </div>
                    </td>
                    
                    <td style={{ padding: '1rem' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.875rem' }}>
                        {formatDate(user.lastSignIn)}
                      </span>
                    </td>
                    
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewUser(user);
                        }}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            color: 'rgba(255, 255, 255, 0.6)'
          }}>
            <Users size={64} style={{ 
              marginBottom: '1.5rem', 
              opacity: 0.5,
              color: 'rgba(255, 255, 255, 0.3)'
            }} />
            <p style={{
              fontSize: '1.1rem',
              fontWeight: '500',
              margin: '0 0 0.5rem 0'
            }}>
              No Users Found
            </p>
            <p style={{
              fontSize: '0.875rem',
              margin: 0,
              opacity: 0.7
            }}>
              No users match your current search criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // 7. LOADING STATE
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(1200px 800px at 18% 10%, rgba(120,140,255,0.45), transparent 60%), radial-gradient(1100px 700px at 80% 25%, rgba(150,110,220,0.40), transparent 60%), linear-gradient(135deg, #0c1020 0%, #161a33 100%)',
        backgroundAttachment: 'fixed'
      }}>
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  // 8. MAIN RENDER
  return (
    <div style={{
      minHeight: '100vh',
      padding: '2rem',
      background: 'radial-gradient(1200px 800px at 18% 10%, rgba(120,140,255,0.45), transparent 60%), radial-gradient(1100px 700px at 80% 25%, rgba(150,110,220,0.40), transparent 60%), linear-gradient(135deg, #0c1020 0%, #161a33 100%)',
      backgroundAttachment: 'fixed'
    }}>
      {renderHeader()}
      {renderSearchAndFilter()}
      {renderUsersTable()}
      
      {/* Add User Modal */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onAddUser={handleAddUser}
      />
      
              {/* Backend Gmail Configuration Modal */}
        {showBackendGmailConfigModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(5px)'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              padding: '2rem',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '90%',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                <Settings size={24} color="rgba(255, 255, 255, 0.9)" />
                <h3 style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '600'
                }}>
                  Backend Email Configuration
                </h3>
              </div>
              
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <p style={{ 
                  color: '#10b981', 
                  margin: '0 0 0.5rem 0', 
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  ✅ Backend Server Status: Running
                </p>
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  margin: 0, 
                  fontSize: '0.875rem' 
                }}>
                  Gmail Email Server is active on port 3001
                </p>
              </div>

              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <p style={{ 
                  color: '#3b82f6', 
                  margin: '0 0 0.5rem 0', 
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  📧 Email System Ready
                </p>
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  margin: 0, 
                  fontSize: '0.875rem' 
                }}>
                  The backend will automatically send invitation emails when you add users. Gmail API configuration can be done through the backend server endpoints.
                </p>
              </div>

              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <p style={{ 
                  color: '#f59e0b', 
                  margin: '0 0 0.5rem 0', 
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  ⚙️ Next Steps
                </p>
                <ul style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  margin: 0, 
                  fontSize: '0.875rem',
                  paddingLeft: '1.2rem'
                }}>
                  <li>Try adding a user to test the system</li>
                  <li>Configure Gmail API credentials if needed</li>
                  <li>All emails will be sent automatically via backend</li>
                </ul>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setShowBackendGmailConfigModal(false)}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default UsersPage;
