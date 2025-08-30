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
  Loader
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
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
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
            <div style={{
              color: 'white',
              textAlign: 'center',
              padding: '2rem'
            }}>
              <TrendingUp size={48} style={{ marginBottom: '1rem', opacity: 0.7 }} />
              <h3 style={{ marginBottom: '0.5rem' }}>Overview Dashboard</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Detailed overview charts and metrics will be implemented here
              </p>
            </div>
          )}

          {!analyticsLoading && activeTab === 'customers' && (
            <div>
              <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Customer List</h3>
              <div style={{
                color: 'white',
                textAlign: 'center',
                padding: '2rem'
              }}>
                <Users size={48} style={{ marginBottom: '1rem', opacity: 0.7 }} />
                <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Customer management table will be implemented here
                </p>
              </div>
            </div>
          )}

          {!analyticsLoading && activeTab === 'outlets' && (
            <div>
              <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Business Outlets</h3>
              <div style={{
                color: 'white',
                textAlign: 'center',
                padding: '2rem'
              }}>
                <Building2 size={48} style={{ marginBottom: '1rem', opacity: 0.7 }} />
                <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Outlets management interface will be implemented here
                </p>
              </div>
            </div>
          )}

          {!analyticsLoading && activeTab === 'analytics' && (
            <div>
              <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Advanced Analytics</h3>
              <div style={{
                color: 'white',
                textAlign: 'center',
                padding: '2rem'
              }}>
                <Activity size={48} style={{ marginBottom: '1rem', opacity: 0.7 }} />
                <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Advanced analytics charts and reports will be implemented here
                </p>
              </div>
            </div>
          )}
        </div>

        {renderDeleteModal()}
        {renderToast()}
      </div>
    </div>
  );
};

export default UserDetailsPage;
