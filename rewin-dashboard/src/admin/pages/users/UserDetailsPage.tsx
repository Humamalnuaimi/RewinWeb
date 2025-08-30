// FEATURE: User Management - User Details
// FILE: UserDetailsPage.tsx
// PURPOSE: Display comprehensive user details with analytics, outlets, customers, and delete functionality
// ICONS USED: ArrowLeft, Edit, Trash2, Building2, Users, Mail, Calendar, Shield, Activity, TrendingUp, DollarSign, Star, CheckCircle, Gift, Filter, Eye, Settings
// LAST MODIFIED: January 28, 2025

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Building2, 
  Users, 
  Mail, 
  Calendar, 
  Shield, 
  Activity,
  TrendingUp,
  DollarSign,
  Star,
  CheckCircle,
  Gift,
  Filter,
  Eye,
  Settings,
  AlertCircle,
  Loader,
  Plus,
  X,
  Search
} from 'lucide-react';
import AuthService from '../../services/firebase.service';

// Temporarily define interfaces locally to avoid import issues
interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  disabled: boolean;
  createdAt: string;
  lastSignIn: string;
  outletCount?: number;
  authMethod?: string;
  invitationStatus?: string;
}

interface UserAnalytics {
  totalCustomers: number;
  totalRevenue: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  totalCheckIns: number;
  averageCustomerRating: number;
  topPerformingOutlet: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalPoints: number;
  redeemedPoints: number;
  lastVisit: string;
  checkInCount: number;
}

interface Outlet {
  id: string;
  name: string;
  address?: string;
  type: string;
  isActive: boolean;
  createdAt: any;
}

type TimePeriod = 'today' | 'yesterday' | 'week' | 'month' | 'all';

const UserDetailsPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  // 1. STATE MANAGEMENT
  const [user, setUser] = useState<User | null>(null);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [customerGrowth, setCustomerGrowth] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({ displayName: '', email: '' });

  // Add Outlet Modal State
  const [showAddOutletModal, setShowAddOutletModal] = useState(false);
  const [addOutletLoading, setAddOutletLoading] = useState(false);
  const [outletFormData, setOutletFormData] = useState({
    name: '',
    location: ''
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'outlets' | 'analytics'>('overview');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 2. EFFECTS
  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  useEffect(() => {
    if (userId && timePeriod) {
      fetchAnalytics();
    }
  }, [userId, timePeriod]);

  // 3. HANDLERS
  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Get specific user data
      const userResponse = await AuthService.getUserById(userId!);
      if (userResponse.success && userResponse.user) {
        setUser(userResponse.user);
        
        // Fetch user's customers
        const customersResponse = await AuthService.getUserCustomers(userId!);
        if (customersResponse.success) {
          setCustomers(customersResponse.customers);
        }
        
        // Fetch user's outlets
        const outletsResponse = await AuthService.getUserOutlets(userId!);
        if (outletsResponse.success) {
          setOutlets(outletsResponse.outlets);
        }

        // Fetch customer growth data
        const growthResponse = await AuthService.getCustomerGrowth(userId!, 7);
        if (growthResponse.success) {
          setCustomerGrowth(growthResponse.growthData);
        }
        
      } else {
        setUser(null);
        setToast({ message: userResponse.error || 'User not found', type: 'error' });
      }
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      setToast({ message: error.message || 'Failed to fetch user data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      
      // Fetch real analytics data
      const analyticsResponse = await AuthService.getUserAnalytics(userId!, timePeriod);
      if (analyticsResponse.success) {
        setAnalytics({
          totalCustomers: analyticsResponse.analytics.customersCount,
          totalRevenue: analyticsResponse.analytics.totalRevenue,
          totalPointsEarned: analyticsResponse.analytics.totalPoints,
          totalPointsRedeemed: analyticsResponse.analytics.totalPointsRedeemed || 0,
          totalCheckIns: analyticsResponse.analytics.checkInsCount,
          averageCustomerRating: 4.7, // This would need additional calculation
          topPerformingOutlet: outlets.length > 0 ? outlets[0].name : 'N/A'
        });
      } else {
        setToast({ message: analyticsResponse.error || 'Failed to fetch analytics', type: 'error' });
      }
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      setToast({ message: error.message || 'Failed to fetch analytics data', type: 'error' });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    
    try {
      setDeleteLoading(true);
      
      const response = await AuthService.deleteUser(user.uid);
      
      if (response.success) {
        setToast({ 
          message: `User ${user.email} deleted successfully`, 
          type: 'success' 
        });
        setShowDeleteModal(false);
        
        // Navigate back to users list after successful deletion
        setTimeout(() => {
          navigate('/admin/users');
        }, 2000);
      } else {
        setToast({ message: response.error || 'Failed to delete user', type: 'error' });
      }
    } catch (error) {
      console.error('Delete user error:', error);
      setToast({ message: 'Failed to delete user', type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditUser = () => {
    if (!user) return;
    setEditFormData({
      displayName: user.displayName || user.email || '',
      email: user.email || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!user) return;
    
    try {
      setEditLoading(true);
      
      const response = await AuthService.updateUser(user.uid, {
        displayName: editFormData.displayName,
        email: editFormData.email
      });
      
      if (response.success) {
        setToast({ message: 'User updated successfully', type: 'success' });
        setShowEditModal(false);
        // Refresh user data
        await fetchUserData();
      } else {
        setToast({ message: response.error || 'Failed to update user', type: 'error' });
      }
    } catch (error: any) {
      setToast({ message: error.message || 'Failed to update user', type: 'error' });
    } finally {
      setEditLoading(false);
    }
  };

  // Add Outlet Handlers
  const handleAddOutlet = () => {
    setOutletFormData({ name: '', location: '' });
    setShowAddOutletModal(true);
  };

  const handleSaveOutlet = async () => {
    if (!user?.uid || !outletFormData.name.trim()) {
      setToast({ message: 'Please enter an outlet name', type: 'error' });
      return;
    }
    
    setAddOutletLoading(true);
    try {
      const result = await AuthService.createOutlet(user.uid, {
        name: outletFormData.name,
        location: outletFormData.location
      });
      
      if (result.success) {
        setToast({ message: 'Outlet created successfully!', type: 'success' });
        setShowAddOutletModal(false);
        setOutletFormData({ name: '', location: '' });
        // Refresh outlets data
        await fetchUserData();
      } else {
        setToast({ message: result.error || 'Failed to create outlet', type: 'error' });
      }
    } catch (error: any) {
      console.error('Error creating outlet:', error);
      setToast({ message: 'An error occurred while creating outlet', type: 'error' });
    } finally {
      setAddOutletLoading(false);
    }
  };

  const getTimePeriodLabel = (period: TimePeriod) => {
    switch (period) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last 30 Days';
      case 'all': return 'All Time';
      default: return 'All Time';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // 4. RENDER HELPERS
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
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <button
            onClick={() => navigate('/admin/users')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              color: 'rgba(255, 255, 255, 0.9)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.3s ease',
              fontSize: '0.875rem',
              fontWeight: '500',
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
            <ArrowLeft size={16} />
            Back to Users
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
              {user?.displayName || 'User Details'}
            </h1>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '1.1rem',
              margin: 0,
              fontWeight: '400'
            }}>
              Comprehensive user analytics and management
            </p>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleEditUser}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              color: 'rgba(255, 255, 255, 0.9)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.3s ease',
              fontSize: '0.875rem',
              fontWeight: '500',
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
            <Edit size={16} />
            Edit User
          </button>
          
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
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
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)';
            }}
          >
            <Trash2 size={16} />
            Delete User
          </button>
        </div>
      </div>
    </div>
  );

  const renderUserProfile = () => (
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
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '2rem',
        flexWrap: 'wrap'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
        }}>
          <span style={{
            color: 'white',
            fontSize: '2rem',
            fontWeight: '700'
          }}>
            {user?.displayName?.charAt(0) || user?.email.charAt(0).toUpperCase()}
          </span>
        </div>
        
        <div style={{ flex: 1 }}>
          <h2 style={{
            color: 'white',
            fontSize: '2rem',
            fontWeight: '700',
            margin: '0 0 1rem 0'
          }}>
            {user?.displayName || 'No Name Set'}
          </h2>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.95rem'
            }}>
              <Mail size={16} />
              {user?.email}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.95rem'
            }}>
              <Calendar size={16} />
              Member since {user?.createdAt ? formatDate(user.createdAt) : 'Unknown'}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.95rem'
            }}>
              <Activity size={16} />
              Last active {user?.lastSignIn ? formatDate(user.lastSignIn) : 'Never'}
            </div>
          </div>
        </div>
        
        <div style={{
          textAlign: 'right'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.875rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            ...(user?.disabled 
              ? { background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }
              : { background: 'rgba(34, 197, 94, 0.2)', color: '#86efac', border: '1px solid rgba(34, 197, 94, 0.3)' }
            )
          }}>
            {user?.disabled ? 'Disabled' : 'Active'}
          </div>
          {user?.emailVerified && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: '#10b981',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              <Shield size={16} />
              Verified
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTimePeriodFilter = () => (
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
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <Filter size={20} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
          <span style={{
            color: 'white',
            fontSize: '1rem',
            fontWeight: '600'
          }}>
            Time Period Filter
          </span>
        </div>
        
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          {(['today', 'yesterday', 'week', 'month', 'all'] as TimePeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                borderRadius: '12px',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                ...(timePeriod === period
                  ? {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                      transform: 'translateY(-2px)',
                      border: 'none'
                    }
                  : {
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }
                )
              }}
              onMouseEnter={(e) => {
                if (timePeriod !== period) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (timePeriod !== period) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {getTimePeriodLabel(period)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAnalyticsCards = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    }}>
      {/* Total Customers */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
          borderRadius: '20px 20px 0 0'
        }} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1
        }}>
          <div>
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: '500',
              margin: '0 0 0.5rem 0'
            }}>
              Total Customers
            </p>
            <p style={{
              color: 'white',
              fontSize: '2.5rem',
              fontWeight: '700',
              margin: '0 0 0.25rem 0'
            }}>
              {analytics?.totalCustomers || 0}
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.75rem',
              margin: 0
            }}>
              {getTimePeriodLabel(timePeriod)}
            </p>
          </div>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'rgba(59, 130, 246, 0.2)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <Users size={28} color="#3b82f6" />
          </div>
        </div>
      </div>

      {/* Total Revenue */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 10px 30px rgba(34, 197, 94, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
          borderRadius: '20px 20px 0 0'
        }} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1
        }}>
          <div>
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: '500',
              margin: '0 0 0.5rem 0'
            }}>
              Total Revenue
            </p>
            <p style={{
              color: 'white',
              fontSize: '2.5rem',
              fontWeight: '700',
              margin: '0 0 0.25rem 0'
            }}>
              {formatCurrency(analytics?.totalRevenue || 0)}
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.75rem',
              margin: 0
            }}>
              {getTimePeriodLabel(timePeriod)}
            </p>
          </div>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'rgba(34, 197, 94, 0.2)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(34, 197, 94, 0.3)'
          }}>
            <DollarSign size={28} color="#22c55e" />
          </div>
        </div>
      </div>

      {/* Points Earned */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 10px 30px rgba(245, 158, 11, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: '20px 20px 0 0'
        }} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1
        }}>
          <div>
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: '500',
              margin: '0 0 0.5rem 0'
            }}>
              Points Earned
            </p>
            <p style={{
              color: 'white',
              fontSize: '2.5rem',
              fontWeight: '700',
              margin: '0 0 0.25rem 0'
            }}>
              {formatNumber(analytics?.totalPointsEarned || 0)}
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.75rem',
              margin: 0
            }}>
              {getTimePeriodLabel(timePeriod)}
            </p>
          </div>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'rgba(245, 158, 11, 0.2)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            <Star size={28} color="#f59e0b" />
          </div>
        </div>
      </div>

      {/* Points Redeemed */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 10px 30px rgba(239, 68, 68, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #ef4444, #dc2626)',
          borderRadius: '20px 20px 0 0'
        }} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1
        }}>
          <div>
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: '500',
              margin: '0 0 0.5rem 0'
            }}>
              Points Redeemed
            </p>
            <p style={{
              color: 'white',
              fontSize: '2.5rem',
              fontWeight: '700',
              margin: '0 0 0.25rem 0'
            }}>
              {formatNumber(analytics?.totalPointsRedeemed || 0)}
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.75rem',
              margin: 0
            }}>
              {getTimePeriodLabel(timePeriod)}
            </p>
          </div>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'rgba(239, 68, 68, 0.2)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',

            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <Gift size={28} color="#ef4444" />
          </div>
        </div>
      </div>

      {/* Total Check-ins */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 10px 30px rgba(139, 92, 246, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)',
          borderRadius: '20px 20px 0 0'
        }} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1
        }}>
          <div>
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: '500',
              margin: '0 0 0.5rem 0'
            }}>
              Total Check-ins
            </p>
            <p style={{
              color: 'white',
              fontSize: '2.5rem',
              fontWeight: '700',
              margin: '0 0 0.25rem 0'
            }}>
              {formatNumber(analytics?.totalCheckIns || 0)}
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.75rem',
              margin: 0
            }}>
              {getTimePeriodLabel(timePeriod)}
            </p>
          </div>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'rgba(139, 92, 246, 0.2)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(139, 92, 246, 0.3)'
          }}>
            <CheckCircle size={28} color="#8b5cf6" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabNavigation = () => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '1rem',
      marginBottom: '2rem',
      display: 'flex',
      gap: '0.5rem',
      flexWrap: 'wrap'
    }}>
      {[
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'customers', label: `Customers (${customers.length})`, icon: Users },
        { id: 'outlets', label: `Outlets (${outlets.length})`, icon: Building2 },
        { id: 'analytics', label: 'Analytics', icon: Activity }
      ].map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              borderRadius: '12px',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              ...(activeTab === tab.id
                ? {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                    transform: 'translateY(-2px)',
                    border: 'none'
                  }
                : {
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)'
                  }
              )
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <Icon size={16} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  const renderDeleteModal = () => {
    if (!showDeleteModal) return null;

    return (
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
          borderRadius: '20px',
          padding: '2rem',
          width: '90%',
          maxWidth: '500px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}>
            <AlertCircle size={24} color="#ef4444" />
            <h3 style={{
              color: 'white',
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: '600'
            }}>
              Confirm User Deletion
            </h3>
          </div>

          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <p style={{ 
              color: '#ef4444', 
              margin: 0, 
              fontSize: '0.875rem',
              fontWeight: '600'
            }}>
              🚨 DANGER: This action cannot be undone. The user and all associated data will be permanently removed.
            </p>
          </div>
          
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.875rem',
            marginBottom: '1rem'
          }}>
            Are you sure you want to delete this user?
          </p>

          {user && (
            <div style={{
              background: 'rgba(102, 126, 234, 0.1)',
              border: '1px solid rgba(102, 126, 234, 0.2)',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600',
                color: '#667eea',
                margin: 0
              }}>
                📧 {user.email}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={deleteLoading}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: deleteLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: deleteLoading ? 0.5 : 1
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: deleteLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: deleteLoading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {deleteLoading && <Loader size={16} className="animate-spin" />}
              {deleteLoading ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderToast = () => {
    if (!toast) return null;

    return (
      <div style={{
        position: 'fixed',
        top: '2rem',
        right: '2rem',
        background: toast.type === 'success' 
          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
          : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white',
        padding: '1rem 1.5rem',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        zIndex: 1001,
        fontSize: '0.875rem',
        fontWeight: '500',
        maxWidth: '400px'
      }}>
        {toast.message}
      </div>
    );
  };

  // 5. LOADING STATE
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          textAlign: 'center'
        }}>
          <Loader size={48} className="animate-spin" style={{ color: 'white', marginBottom: '1rem' }} />
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '1rem'
          }}>
            Loading user details...
          </p>
        </div>
      </div>
    );
  }

  // 6. USER NOT FOUND STATE
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'transparent',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'center',
          paddingTop: '4rem'
        }}>
          <Users size={64} style={{ color: 'rgba(255, 255, 255, 0.4)', marginBottom: '2rem' }} />
          <h3 style={{
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '1rem'
          }}>
            User not found
          </h3>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '1rem',
            marginBottom: '2rem'
          }}>
            The user you're looking for doesn't exist.
          </p>
          <button 
            onClick={() => navigate('/admin/users')} 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <ArrowLeft size={16} />
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  // 7. MAIN RENDER
  return (
    <div style={{
      minHeight: '100vh',
      background: 'transparent',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {renderHeader()}
        {renderUserProfile()}
        {renderTimePeriodFilter()}
        {renderAnalyticsCards()}
        {renderTabNavigation()}
        
        {/* Tab Content */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem',
          minHeight: '400px'
        }}>
          {analyticsLoading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4rem 0'
            }}>
              <div style={{ textAlign: 'center' }}>
                <Loader size={40} className="animate-spin" style={{ color: 'white', marginBottom: '1rem' }} />
                <p style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem'
                }}>
                  Loading analytics...
                </p>
              </div>
            </div>
          )}

          {!analyticsLoading && activeTab === 'overview' && (
            <div>
              <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Overview Dashboard</h3>
              
              {/* Customer Growth Chart */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '2rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.5rem'
                }}>
                  <TrendingUp size={24} color="#3b82f6" />
                  <h4 style={{ color: 'white', margin: 0, fontSize: '1.25rem' }}>Customer Growth Over Time</h4>
                </div>
                <div style={{
                  height: '300px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  padding: '2rem',
                  position: 'relative'
                }}>
                  {customers.length > 0 ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '2rem'
                      }}>
                        <div>
                          <h4 style={{ color: 'white', margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>
                            Customer Growth
                          </h4>
                          <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: '0.875rem' }}>
                            Total customers: {customers.length}
                          </p>
                        </div>
                        <div style={{
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid rgba(34, 197, 94, 0.2)',
                          borderRadius: '8px',
                          padding: '0.5rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <TrendingUp size={16} color="#22c55e" />
                          <span style={{ color: '#22c55e', fontSize: '0.875rem', fontWeight: '600' }}>
                            Growing
                          </span>
                        </div>
                      </div>
                      
                      {/* Real Customer Growth Chart */}
                      <div style={{ flex: 1, display: 'flex', alignItems: 'end', gap: '1rem', paddingTop: '1rem' }}>
                        {customerGrowth.length > 0 ? customerGrowth.map((day, i) => {
                          const maxCount = Math.max(...customerGrowth.map(d => d.count), 1);
                          const height = Math.max(20, (day.count / maxCount) * 80);
                          
                          return (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div 
                                style={{
                                  width: '100%',
                                  height: `${height}%`,
                                  background: day.isToday 
                                    ? 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)'
                                    : 'linear-gradient(180deg, rgba(59, 130, 246, 0.8) 0%, rgba(59, 130, 246, 0.4) 100%)',
                                  borderRadius: '4px 4px 0 0',
                                  marginBottom: '0.5rem',
                                  transition: 'all 0.3s ease',
                                  cursor: 'pointer',
                                  position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scaleY(1.1)';
                                  // Show tooltip
                                  const tooltip = document.createElement('div');
                                  tooltip.innerHTML = `${day.count} new customers`;
                                  tooltip.style.cssText = `
                                    position: absolute;
                                    bottom: 110%;
                                    left: 50%;
                                    transform: translateX(-50%);
                                    background: rgba(0, 0, 0, 0.8);
                                    color: white;
                                    padding: 0.5rem;
                                    border-radius: 4px;
                                    font-size: 0.75rem;
                                    white-space: nowrap;
                                    z-index: 1000;
                                  `;
                                  e.currentTarget.appendChild(tooltip);
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scaleY(1)';
                                  // Remove tooltip
                                  const tooltip = e.currentTarget.querySelector('div');
                                  if (tooltip) tooltip.remove();
                                }}
                              />
                              <span style={{
                                color: day.isToday ? '#3b82f6' : 'rgba(255, 255, 255, 0.6)',
                                fontSize: '0.75rem',
                                fontWeight: day.isToday ? '600' : '400'
                              }}>
                                {day.dayName}
                              </span>
                            </div>
                          );
                        }) : (
                          // Fallback if no growth data
                          Array.from({ length: 7 }, (_, i) => {
                            const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i];
                            const isToday = i === 6;
                            
                            return (
                              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{
                                  width: '100%',
                                  height: '20%',
                                  background: 'rgba(59, 130, 246, 0.3)',
                                  borderRadius: '4px 4px 0 0',
                                  marginBottom: '0.5rem'
                                }} />
                                <span style={{
                                  color: isToday ? '#3b82f6' : 'rgba(255, 255, 255, 0.6)',
                                  fontSize: '0.75rem',
                                  fontWeight: isToday ? '600' : '400'
                                }}>
                                  {dayName}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center'
                    }}>
                      <div>
                        <TrendingUp size={48} style={{ marginBottom: '1rem', opacity: 0.5, color: '#6b7280' }} />
                        <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
                          No customer data available yet
                        </p>
                        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
                          Customer growth will appear here once data is available
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Points Analytics */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '2rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.5rem'
                }}>
                  <Star size={24} color="#f59e0b" />
                  <h4 style={{ color: 'white', margin: 0, fontSize: '1.25rem' }}>Points Analytics</h4>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'rgba(34, 197, 94, 0.2)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1rem auto'
                    }}>
                      <TrendingUp size={20} color="#22c55e" />
                    </div>
                    <p style={{ color: '#22c55e', fontSize: '1.5rem', fontWeight: '700', margin: '0 0 0.25rem 0' }}>
                      {formatNumber(analytics?.totalCurrentPoints || 0)}
                    </p>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', margin: 0 }}>
                      Current Points
                    </p>
                  </div>
                  
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1rem auto'
                    }}>
                      <Gift size={20} color="#ef4444" />
                    </div>
                    <p style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: '700', margin: '0 0 0.25rem 0' }}>
                      {formatNumber(analytics?.totalPointsRedeemed || 0)}
                    </p>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', margin: 0 }}>
                      Points Redeemed
                    </p>
                  </div>
                  
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1rem auto'
                    }}>
                      <DollarSign size={20} color="#3b82f6" />
                    </div>
                    <p style={{ color: '#3b82f6', fontSize: '1.5rem', fontWeight: '700', margin: '0 0 0.25rem 0' }}>
                      {formatCurrency(analytics?.totalRevenue || 0)}
                    </p>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', margin: 0 }}>
                      Total Revenue
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!analyticsLoading && activeTab === 'customers' && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ color: 'white', margin: 0 }}>Customer List ({customers.filter(customer => {
                  if (!searchTerm) return true;
                  const name = customer.firstName && customer.lastName 
                    ? `${customer.firstName} ${customer.lastName}`
                    : customer.name || customer.displayName || '';
                  const phone = customer.phoneNumber || customer.phone || '';
                  const outlet = customer.outletName || '';
                  return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         phone.includes(searchTerm) ||
                         outlet.toLowerCase().includes(searchTerm.toLowerCase());
                }).length})</h3>
                
                <div style={{
                  position: 'relative',
                  width: '300px'
                }}>
                  <div style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255, 255, 255, 0.5)',
                    pointerEvents: 'none'
                  }}>
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search customers..."
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.5rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
              
              {customers.length > 0 ? (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '20px',
                  overflow: 'hidden'
                }}>
                  {/* Table Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr',
                    gap: '1rem',
                    padding: '1.5rem 2rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: '600', fontSize: '0.875rem' }}>
                      Customer Name
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: '600', fontSize: '0.875rem' }}>
                      Phone Number
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: '600', fontSize: '0.875rem' }}>
                      Total Points
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: '600', fontSize: '0.875rem' }}>
                      Home Outlet
                    </div>
                  </div>
                  
                  {/* Table Body */}
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {customers.filter(customer => {
                      if (!searchTerm) return true;
                      const name = customer.firstName && customer.lastName 
                        ? `${customer.firstName} ${customer.lastName}`
                        : customer.name || customer.displayName || '';
                      const phone = customer.phoneNumber || customer.phone || '';
                      const outlet = customer.outletName || '';
                      return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             phone.includes(searchTerm) ||
                             outlet.toLowerCase().includes(searchTerm.toLowerCase());
                    }).map((customer, index) => (
                      <div key={customer.id || index} style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr 1fr',
                        gap: '1rem',
                        padding: '1.5rem 2rem',
                        borderBottom: index < customers.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}>
                        <div style={{ color: 'white', fontWeight: '500' }}>
                          {customer.firstName && customer.lastName 
                            ? `${customer.firstName} ${customer.lastName}`
                            : customer.name || customer.displayName || 'N/A'
                          }
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                          {customer.phoneNumber || customer.phone || 'N/A'}
                        </div>
                        <div style={{ color: '#22c55e', fontWeight: '600' }}>
                          {formatNumber(customer.totalPoints || customer.points || 0)}
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          {customer.outletName || 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '20px',
                  padding: '3rem',
                  textAlign: 'center'
                }}>
                  <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5, color: '#6b7280' }} />
                  <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>No Customers Found</h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
                    This user doesn't have any customers yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {!analyticsLoading && activeTab === 'outlets' && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ color: 'white', margin: 0 }}>Business Outlets ({outlets.length})</h3>
                <button
                  onClick={handleAddOutlet}
                  style={{
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '0.75rem 1.5rem',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(34, 197, 94, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
                  }}
                >
                  <Plus size={16} />
                  Add Outlet
                </button>
              </div>
              
              {outlets.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '1.5rem'
                }}>
                  {outlets.map((outlet, index) => (
                    <div key={outlet.id || index} style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '20px',
                      padding: '2rem',
                      position: 'relative',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}>
                      {/* Outlet Header */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        marginBottom: '1.5rem'
                      }}>
                        <div style={{
                          width: '50px',
                          height: '50px',
                          background: 'rgba(34, 197, 94, 0.2)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(34, 197, 94, 0.3)'
                        }}>
                          <Building2 size={24} color="#22c55e" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ 
                            color: 'white', 
                            margin: '0 0 0.25rem 0',
                            fontSize: '1.25rem',
                            fontWeight: '700'
                          }}>
                            {outlet.displayName || outlet.name || 'Unnamed Outlet'}
                          </h4>
                          <p style={{ 
                            color: 'rgba(255, 255, 255, 0.6)', 
                            margin: 0,
                            fontSize: '0.875rem'
                          }}>
                            Outlet ID: {outlet.id}
                          </p>
                        </div>
                      </div>

                      {/* Customer Count */}
                      <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        textAlign: 'center',
                        marginBottom: '1rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.75rem',
                          marginBottom: '0.5rem'
                        }}>
                          <Users size={20} color="#3b82f6" />
                          <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                            Home Customers
                          </span>
                        </div>
                        <p style={{ 
                          color: '#3b82f6', 
                          fontSize: '2rem', 
                          fontWeight: '700', 
                          margin: 0 
                        }}>
                          {outlet.customerCount || 0}
                        </p>
                      </div>

                      {/* Outlet Details */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem'
                      }}>
                        <div>
                          <p style={{ 
                            color: 'rgba(255, 255, 255, 0.6)', 
                            fontSize: '0.75rem',
                            margin: '0 0 0.25rem 0',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            Location
                          </p>
                          <p style={{ color: 'white', margin: 0, fontSize: '0.875rem' }}>
                            {outlet.location || outlet.address || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p style={{ 
                            color: 'rgba(255, 255, 255, 0.6)', 
                            fontSize: '0.75rem',
                            margin: '0 0 0.25rem 0',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            Status
                          </p>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: outlet.isActive !== false ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            border: outlet.isActive !== false ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            padding: '0.25rem 0.5rem'
                          }}>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: outlet.isActive !== false ? '#22c55e' : '#ef4444'
                            }} />
                            <span style={{ 
                              color: outlet.isActive !== false ? '#22c55e' : '#ef4444',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              {outlet.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '20px',
                  padding: '3rem',
                  textAlign: 'center'
                }}>
                  <Building2 size={48} style={{ marginBottom: '1rem', opacity: 0.5, color: '#6b7280' }} />
                  <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>No Outlets Found</h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
                    This user doesn't have any business outlets yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {!analyticsLoading && activeTab === 'analytics' && (
            <div>
              <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Advanced Analytics</h3>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '3rem',
                textAlign: 'center'
              }}>
                <Activity size={48} style={{ marginBottom: '1.5rem', opacity: 0.5, color: '#f59e0b' }} />
                <h4 style={{ color: 'white', margin: '0 0 1rem 0' }}>Advanced Analytics Coming Soon</h4>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem', lineHeight: '1.6' }}>
                  This section will include detailed charts and reports such as:
                </p>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '1rem',
                  marginBottom: '2rem'
                }}>
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '12px',
                    padding: '1.5rem'
                  }}>
                    <TrendingUp size={24} color="#3b82f6" style={{ marginBottom: '0.5rem' }} />
                    <h5 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Revenue Trends</h5>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: '0.875rem' }}>
                      Monthly and yearly revenue analysis
                    </p>
                  </div>
                  
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    borderRadius: '12px',
                    padding: '1.5rem'
                  }}>
                    <Users size={24} color="#22c55e" style={{ marginBottom: '0.5rem' }} />
                    <h5 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Customer Behavior</h5>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: '0.875rem' }}>
                      Visit patterns and loyalty metrics
                    </p>
                  </div>
                  
                  <div style={{
                    background: 'rgba(168, 85, 247, 0.1)',
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                    borderRadius: '12px',
                    padding: '1.5rem'
                  }}>
                    <Building2 size={24} color="#a855f7" style={{ marginBottom: '0.5rem' }} />
                    <h5 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Outlet Performance</h5>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: '0.875rem' }}>
                      Comparative outlet analytics
                    </p>
                  </div>
                </div>
                
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: '12px',
                  padding: '1rem 1.5rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#f59e0b'
                  }} />
                  <span style={{ color: '#f59e0b', fontSize: '0.875rem', fontWeight: '500' }}>
                    Alternatively, this tab could be removed to simplify the interface
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {renderDeleteModal()}
        {renderToast()}

        {/* Add Outlet Modal */}
        {showAddOutletModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              borderRadius: '20px',
              padding: '2rem',
              width: '90%',
              maxWidth: '500px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(34, 197, 94, 0.3)'
                  }}>
                    <Building2 size={20} color="#22c55e" />
                  </div>
                  <h3 style={{ color: 'white', margin: 0, fontSize: '1.5rem' }}>Add New Outlet</h3>
                </div>
                <button
                  onClick={() => setShowAddOutletModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem'
                }}>
                  Outlet Name *
                </label>
                <input
                  type="text"
                  value={outletFormData.name}
                  onChange={(e) => setOutletFormData({ ...outletFormData, name: e.target.value })}
                  placeholder="Enter outlet name"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#22c55e';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem'
                }}>
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={outletFormData.location}
                  onChange={(e) => setOutletFormData({ ...outletFormData, location: e.target.value })}
                  placeholder="Enter outlet location"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#22c55e';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setShowAddOutletModal(false)}
                  disabled={addOutletLoading}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    padding: '0.75rem 1.5rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: addOutletLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: addOutletLoading ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!addOutletLoading) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!addOutletLoading) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                    }
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveOutlet}
                  disabled={addOutletLoading || !outletFormData.name.trim()}
                  style={{
                    background: addOutletLoading || !outletFormData.name.trim() 
                      ? 'rgba(34, 197, 94, 0.3)' 
                      : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '0.75rem 1.5rem',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: addOutletLoading || !outletFormData.name.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                    opacity: addOutletLoading || !outletFormData.name.trim() ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!addOutletLoading && outletFormData.name.trim()) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(34, 197, 94, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!addOutletLoading && outletFormData.name.trim()) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {addOutletLoading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Building2 size={16} />
                      Create Outlet
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: '20px',
            padding: '2rem',
            width: '90%',
            maxWidth: '500px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Edit size={24} color="#3b82f6" />
                <h3 style={{
                  color: 'white',
                  margin: 0,
                  fontSize: '1.5rem',
                  fontWeight: '600'
                }}>
                  Edit User
                </h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: '0.5rem'
              }}>
                Display Name
              </label>
              <input
                type="text"
                value={editFormData.displayName}
                onChange={(e) => setEditFormData(prev => ({ ...prev, displayName: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
                placeholder="Enter display name"
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: '0.5rem'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
                placeholder="Enter email address"
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowEditModal(false)}
                disabled={editLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: editLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: editLoading ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!editLoading) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!editLoading) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editLoading || !editFormData.displayName.trim() || !editFormData.email.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: editLoading || !editFormData.displayName.trim() || !editFormData.email.trim() 
                    ? 'rgba(59, 130, 246, 0.5)' 
                    : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: editLoading || !editFormData.displayName.trim() || !editFormData.email.trim() 
                    ? 'not-allowed' 
                    : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (!editLoading && editFormData.displayName.trim() && editFormData.email.trim()) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!editLoading) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {editLoading && <Loader size={16} className="animate-spin" />}
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetailsPage;
