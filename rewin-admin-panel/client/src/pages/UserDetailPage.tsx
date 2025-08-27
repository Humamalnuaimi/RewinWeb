import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Building2, 
  UserCheck, 
  Mail, 
  Calendar, 
  Shield, 
  Settings, 
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Star,
  Clock,
  MapPin,
  Phone,
  Award,
  BarChart3,
  PieChart,
  Target,
  Zap,
  Gift,
  CheckCircle,
  AlertCircle,
  Clock3,
  Filter,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { usersAPI, analyticsAPI, outletsAPI, customersAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast, { ToastProps } from '../components/Toast';
import TwilioSetup from '../components/TwilioSetup';
import LoadingSpinner from '../components/LoadingSpinner';

interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  disabled: boolean;
  createdAt: string;
  lastSignIn: string;
  businessCount?: number;
  customerCount?: number;
}

interface Business {
  id: string;
  name: string;
  address?: string;
  type: string;
  isActive: boolean;
  createdAt: any;
  ownerId: string;
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

interface DailyStats {
  date: string;
  earnedPoints: number;
  redeemedPoints: number;
  checkIns: number;
  revenue: number;
  newCustomers: number;
}

interface UserAnalytics {
  totalCustomers: number;
  totalRevenue: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  totalCheckIns: number;
  averageCustomerRating: number;
  topPerformingOutlet: string;
  dailyStats: DailyStats[];
  recentActivity: any[];
}

type TimePeriod = 'today' | 'yesterday' | 'week' | 'month' | 'all';

const UserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'businesses' | 'analytics'>('overview');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

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

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch user details
      const userResponse = await usersAPI.getById(userId!);
      if (userResponse.success) {
        setUser(userResponse.user);
      }

      // Fetch user's businesses/outlets
      const businessesResponse = await outletsAPI.getByUser(userId!);
      setBusinesses(businessesResponse);

      // Fetch user's customers
      const customersResponse = await customersAPI.getByUser(userId!);
      setCustomers(customersResponse);

    } catch (error) {
      console.error('Error fetching user data:', error);
      setToast({ message: 'Failed to fetch user data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      
      const params = new URLSearchParams({
        timePeriod
      });

      // Fetch analytics data from the backend
      const analyticsResponse = await analyticsAPI.getUserAnalytics(userId!, params.toString());
      
      // For 'all' time period, we need to get total check-ins from customer data
      let totalCheckIns = 0;
      if (timePeriod === 'all') {
        const customersResponse = await customersAPI.getByUser(userId!);
        totalCheckIns = customersResponse.reduce((total: number, customer: any) => {
          return total + (customer.visitCount || 0);
        }, 0);
      } else {
        // For specific time periods, use the backend's checkInsToday field
        // which represents check-ins for the selected period
        totalCheckIns = analyticsResponse.analytics?.checkInsToday || 0;
      }
      
      // Extract analytics data from the response with the correct structure
      const analyticsData = {
        totalCustomers: analyticsResponse.analytics?.totalCustomers || 0,
        totalRevenue: analyticsResponse.analytics?.totalRevenue || 0,
        totalPointsEarned: analyticsResponse.analytics?.totalPointsEarned || 0,
        totalPointsRedeemed: analyticsResponse.analytics?.totalPointsRedeemed || 0,
        totalCheckIns: totalCheckIns, // Use actual backend data for specific periods
        averageCustomerRating: analyticsResponse.analytics?.averageRating || 0,
        topPerformingOutlet: analyticsResponse.analytics?.topPerformingOutlet || '',
        dailyStats: analyticsResponse.dailyStats || [],
        recentActivity: analyticsResponse.recentActivity || []
      };
      
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setToast({ message: 'Failed to fetch analytics data', type: 'error' });
    } finally {
      setAnalyticsLoading(false);
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

  const handleDelete = async () => {
    if (!user) return;
    
    try {
      setDeleteUserLoading(true);
      
      console.log('🗑️ Deleting user:', user.uid, user.email);
      
      const response = await usersAPI.delete(user.uid);
      
      console.log('🗑️ Delete response:', response);
      
      if (response.success) {
        setToast({ 
          message: `User ${user.email} deleted successfully from Firebase Auth and Firestore`, 
          type: 'success' 
        });
        setShowDeleteModal(false);
        
        // Navigate back to users list after successful deletion
        setTimeout(() => {
          navigate('/users');
        }, 2000);
      } else {
        setToast({ message: response.error || 'Failed to delete user', type: 'error' });
      }
    } catch (error) {
      console.error('❌ Delete user error:', error);
      setToast({ message: 'Failed to delete user', type: 'error' });
    } finally {
      setDeleteUserLoading(false);
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

  if (loading) {
    return <LoadingSpinner message="Loading user details..." showAppName={true} />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-12">
            <UserCheck size={64} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">User not found</h3>
            <p className="text-gray-500 mb-6">The user you're looking for doesn't exist.</p>
            <button 
              onClick={() => navigate('/users')} 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Users
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        {/* Enhanced Header */}
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
                onClick={() => navigate('/users')}
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
                  {user.displayName || 'User Details'}
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
                onClick={() => setEditing(!editing)}
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
                {editing ? 'Cancel' : 'Edit'}
              </button>

              <button
                onClick={() => navigate(`/admin/users/${userId}/twilio`)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)';
                }}
              >
                <Phone size={16} />
                Twilio Management
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

        {/* Enhanced User Profile Card */}
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
                {user.displayName?.charAt(0) || user.email.charAt(0).toUpperCase()}
              </span>
            </div>
            
            <div style={{ flex: 1 }}>
              <h2 style={{
                color: 'white',
                fontSize: '2rem',
                fontWeight: '700',
                margin: '0 0 1rem 0'
              }}>
                {user.displayName || 'No Name Set'}
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
                  {user.email}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.95rem'
                }}>
                  <Calendar size={16} />
                  Member since {formatDate(user.createdAt)}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.95rem'
                }}>
                  <Activity size={16} />
                  Last active {formatDate(user.lastSignIn)}
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
                ...(user.disabled 
                  ? { background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }
                  : { background: 'rgba(34, 197, 94, 0.2)', color: '#86efac', border: '1px solid rgba(34, 197, 94, 0.3)' }
                )
              }}>
                {user.disabled ? 'Disabled' : 'Active'}
              </div>
              {user.emailVerified && (
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

        {/* Enhanced Time Period Filter */}
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
                          transform: 'translateY(-2px)'
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

        {/* Enhanced Quick Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
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
              background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
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
        </div>

        {/* Tabs */}
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
              gap: '0.5rem'
            }}>
              <BarChart3 size={18} />
              <span style={{
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                Overview
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Users size={18} />
              <span style={{
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                Customers ({customers.length})
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Building2 size={18} />
              <span style={{
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                Businesses ({businesses.length})
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <TrendingUp size={18} />
              <span style={{
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                Analytics
              </span>
            </div>
          </div>
        </div>

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
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
            borderRadius: '20px',
            pointerEvents: 'none'
          }} />
          
          <div style={{
            position: 'relative',
            zIndex: 1,
            padding: '2rem'
          }}>
            {analyticsLoading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem 0'
              }}>
                <div style={{
                  textAlign: 'center'
                }}>
                  <div style={{
                    animation: 'spin 1s linear infinite',
                    border: '4px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '4px solid white',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    margin: '0 auto 1rem auto'
                  }} />
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.875rem'
                  }}>
                    Loading analytics...
                  </p>
                </div>
              </div>
            )}

            {/* Overview Tab */}
            {activeTab === 'overview' && !analyticsLoading && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem'
              }}>
                {/* Daily Activity Chart */}
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
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.5rem'
                  }}>
                    <h3 style={{
                      color: 'white',
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      margin: 0
                    }}>
                      Daily Activity ({getTimePeriodLabel(timePeriod)})
                    </h3>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    {analytics?.dailyStats?.slice(-7).map((stat, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem 1.5rem',
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '15px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'rgba(102, 126, 234, 0.2)',
                            borderRadius: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(102, 126, 234, 0.3)'
                          }}>
                            <Calendar size={20} color="white" />
                          </div>
                          <div>
                            <p style={{
                              color: 'white',
                              fontSize: '1rem',
                              fontWeight: '600',
                              margin: 0
                            }}>
                              {formatDate(stat.date)}
                            </p>
                            <p style={{
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontSize: '0.875rem',
                              margin: 0
                            }}>
                              {stat.checkIns} check-ins
                            </p>
                          </div>
                        </div>
                        <div style={{
                          textAlign: 'right'
                        }}>
                          <p style={{
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: '600',
                            margin: 0
                          }}>
                            +{stat.earnedPoints} pts
                          </p>
                          <p style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '0.875rem',
                            margin: 0
                          }}>
                            -{stat.redeemedPoints} pts
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Performance Metrics */}
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
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.5rem',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '15px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          background: 'rgba(34, 197, 94, 0.2)',
                          borderRadius: '15px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(34, 197, 94, 0.3)'
                        }}>
                          <TrendingUp size={20} color="white" />
                        </div>
                        <span style={{
                          color: 'white',
                          fontSize: '1rem',
                          fontWeight: '600'
                        }}>
                          Average Rating
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{
                          color: 'white',
                          fontSize: '1.5rem',
                          fontWeight: '700'
                        }}>
                          {analytics?.averageCustomerRating?.toFixed(1) || '0.0'}
                        </span>
                        <Star size={20} color="#f59e0b" />
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.5rem',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '15px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          background: 'rgba(139, 92, 246, 0.2)',
                          borderRadius: '15px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(139, 92, 246, 0.3)'
                        }}>
                          <Target size={20} color="white" />
                        </div>
                        <span style={{
                          color: 'white',
                          fontSize: '1rem',
                          fontWeight: '600'
                        }}>
                          Top Outlet
                        </span>
                      </div>
                      <span style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.875rem'
                      }}>
                        {analytics?.topPerformingOutlet || 'N/A'}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.5rem',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '15px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          borderRadius: '15px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(245, 158, 11, 0.3)'
                        }}>
                          <Zap size={20} color="white" />
                        </div>
                        <span style={{
                          color: 'white',
                          fontSize: '1rem',
                          fontWeight: '600'
                        }}>
                          Points Redeemed
                        </span>
                      </div>
                      <span style={{
                        color: 'white',
                        fontSize: '1.5rem',
                        fontWeight: '700'
                      }}>
                        {formatNumber(analytics?.totalPointsRedeemed || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
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
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '1.5rem'
                    }}>
                      <h3 style={{
                        color: 'white',
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        margin: 0
                      }}>
                        Recent Activity ({getTimePeriodLabel(timePeriod)})
                      </h3>
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      {analytics?.recentActivity?.slice(0, 10).map((activity, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          padding: '1rem 1.5rem',
                          background: 'rgba(255, 255, 255, 0.08)',
                          borderRadius: '15px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'rgba(102, 126, 234, 0.2)',
                            borderRadius: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(102, 126, 234, 0.3)'
                          }}>
                            <Activity size={20} color="white" />
                          </div>
                          <div style={{
                            flex: 1
                          }}>
                            <p style={{
                              color: 'white',
                              fontSize: '1rem',
                              fontWeight: '600',
                              margin: 0
                            }}>
                              {activity.description}
                            </p>
                            <p style={{
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontSize: '0.875rem',
                              margin: 0
                            }}>
                              {formatDate(activity.timestamp)}
                            </p>
                          </div>
                          <div style={{
                            textAlign: 'right'
                          }}>
                            <span style={{
                              padding: '0.5rem 1rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              borderRadius: '15px',
                              ...(activity.type === 'earned'
                                ? { background: 'rgba(34, 197, 94, 0.2)', color: '#86efac', border: '1px solid rgba(34, 197, 94, 0.3)' }
                                : activity.type === 'redeemed'
                                ? { background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }
                                : { background: 'rgba(102, 126, 234, 0.2)', color: '#a78bfa', border: '1px solid rgba(102, 126, 234, 0.3)' }
                              )
                            }}>
                              {activity.type}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Customers Tab */}
            {activeTab === 'customers' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{
                    color: 'white',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    margin: 0
                  }}>
                    Customer List
                  </h3>
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    <input
                      type="text"
                      placeholder="Search customers..."
                      style={{
                        padding: '0.75rem 1rem',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        width: '200px'
                      }}
                    />
                  </div>
                </div>

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
                    zIndex: 1,
                    overflowX: 'auto'
                  }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      borderSpacing: '0'
                    }}>
                      <thead style={{
                        background: 'rgba(255, 255, 255, 0.08)'
                      }}>
                        <tr>
                          <th style={{
                            padding: '0.75rem 1rem',
                            textAlign: 'left',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: 'rgba(255, 255, 255, 0.8)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>Customer</th>
                          <th style={{
                            padding: '0.75rem 1rem',
                            textAlign: 'left',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: 'rgba(255, 255, 255, 0.8)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>Contact</th>
                          <th style={{
                            padding: '0.75rem 1rem',
                            textAlign: 'left',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: 'rgba(255, 255, 255, 0.8)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>Points</th>
                          <th style={{
                            padding: '0.75rem 1rem',
                            textAlign: 'left',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: 'rgba(255, 255, 255, 0.8)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>Check-ins</th>
                          <th style={{
                            padding: '0.75rem 1rem',
                            textAlign: 'left',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: 'rgba(255, 255, 255, 0.8)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>Last Visit</th>
                          <th style={{
                            padding: '0.75rem 1rem',
                            textAlign: 'left',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: 'rgba(255, 255, 255, 0.8)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody style={{
                        background: 'rgba(255, 255, 255, 0.08)'
                      }}>
                        {customers.map((customer) => (
                                                     <tr key={customer.id} style={{
                             transition: 'all 0.3s ease'
                           }}
                           onMouseEnter={(e) => {
                             e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                           }}
                           onMouseLeave={(e) => {
                             e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                           }}>
                            <td style={{
                              padding: '0.75rem 1rem',
                              color: 'white',
                              fontSize: '0.875rem',
                              fontWeight: '500'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem'
                              }}>
                                <div style={{
                                  width: '30px',
                                  height: '30px',
                                  background: 'linear-gradient(135deg, #a78bfa 0%, #d946ef 100%)',
                                  borderRadius: '15px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '1px solid rgba(167, 139, 250, 0.3)'
                                }}>
                                  <span style={{
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    fontWeight: '600'
                                  }}>
                                    {customer.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p style={{
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    fontWeight: '600'
                                  }}>
                                    {customer.name}
                                  </p>
                                  <p style={{
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    fontSize: '0.75rem'
                                  }}>
                                    ID: {customer.id.slice(0, 8)}...
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td style={{
                              padding: '0.75rem 1rem',
                              color: 'rgba(255, 255, 255, 0.8)',
                              fontSize: '0.875rem'
                            }}>
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem'
                              }}>
                                {customer.email && (
                                  <p style={{
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                  }}>
                                    {customer.email}
                                  </p>
                                )}
                                {customer.phone && (
                                  <p style={{
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    fontSize: '0.75rem'
                                  }}>
                                    {customer.phone}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td style={{
                              padding: '0.75rem 1rem',
                              color: 'white',
                              fontSize: '0.875rem',
                              fontWeight: '500'
                            }}>
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem'
                              }}>
                                <p style={{
                                  color: 'white',
                                  fontSize: '0.875rem',
                                  fontWeight: '600'
                                }}>
                                  {formatNumber(customer.totalPoints)} total
                                </p>
                                <p style={{
                                  color: 'rgba(255, 255, 255, 0.7)',
                                  fontSize: '0.75rem'
                                }}>
                                  {formatNumber(customer.redeemedPoints)} redeemed
                                </p>
                              </div>
                            </td>
                            <td style={{
                              padding: '0.75rem 1rem',
                              color: 'white',
                              fontSize: '0.875rem',
                              fontWeight: '500'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}>
                                <CheckCircle size={16} color="white" />
                                <span style={{
                                  color: 'white',
                                  fontSize: '0.875rem',
                                  fontWeight: '600'
                                }}>
                                  {customer.checkInCount}
                                </span>
                              </div>
                            </td>
                            <td style={{
                              padding: '0.75rem 1rem',
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontSize: '0.875rem'
                            }}>
                              <span style={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontSize: '0.875rem'
                              }}>
                                {customer.lastVisit ? formatDate(customer.lastVisit) : 'Never'}
                              </span>
                            </td>
                            <td style={{
                              padding: '0.75rem 1rem',
                              color: 'rgba(255, 255, 255, 0.8)',
                              fontSize: '0.875rem',
                              fontWeight: '500'
                            }}>
                              <button
                                onClick={() => navigate(`/customers/${customer.id}`)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: 'rgba(102, 126, 234, 0.2)',
                                  border: '1px solid rgba(102, 126, 234, 0.3)',
                                  borderRadius: '12px',
                                  color: 'white',
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
                                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.3)';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }}
                              >
                                <Eye size={14} />
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Businesses Tab */}
            {activeTab === 'businesses' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{
                    color: 'white',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    margin: 0
                  }}>
                    Business Outlets
                  </h3>
                  <button
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
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
                      boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)';
                    }}
                  >
                    <Building2 size={16} />
                    Add Business
                  </button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '1.5rem'
                }}>
                  {businesses.map((business) => (
                    <div key={business.id} style={{
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
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'start',
                        justifyContent: 'space-between',
                        marginBottom: '1.5rem'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                          borderRadius: '15px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(34, 197, 94, 0.3)'
                        }}>
                          <Building2 size={24} color="white" />
                        </div>
                        <span style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          borderRadius: '15px',
                          ...(business.isActive
                            ? { background: 'rgba(34, 197, 94, 0.2)', color: '#86efac', border: '1px solid rgba(34, 197, 94, 0.3)' }
                            : { background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }
                          )
                        }}>
                          {business.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <h4 style={{
                        color: 'white',
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        margin: '0 0 1rem 0'
                      }}>
                        {business.name}
                      </h4>
                      
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: '0.875rem'
                      }}>
                        {business.address && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <MapPin size={16} color="white" />
                            {business.address}
                          </div>
                        )}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            borderRadius: '10px',
                            ...(business.type === 'restaurant'
                              ? { background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }
                              : business.type === 'cafe'
                              ? { background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }
                              : business.type === 'retail'
                              ? { background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }
                              : { background: 'rgba(156, 163, 175, 0.2)', color: '#9ca3af', border: '1px solid rgba(156, 163, 175, 0.3)' }
                            )
                          }}>
                            {business.type}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <Calendar size={16} color="white" />
                          <span style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '0.875rem'
                          }}>
                            Created {business.createdAt ? formatDate(business.createdAt) : 'N/A'}
                          </span>
                        </div>
                      </div>

                      <div style={{
                        paddingTop: '1.5rem',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <button
                          onClick={() => navigate(`/outlets/${business.id}`)}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1.5rem',
                            background: 'rgba(102, 126, 234, 0.2)',
                            border: '1px solid rgba(102, 126, 234, 0.3)',
                            borderRadius: '12px',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.3s ease',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            backdropFilter: 'blur(10px)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(102, 126, 234, 0.3)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <Eye size={16} />
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem'
              }}>
                {/* Revenue Chart */}
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
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.5rem'
                  }}>
                    <h3 style={{
                      color: 'white',
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      margin: 0
                    }}>
                      Revenue Analytics ({getTimePeriodLabel(timePeriod)})
                    </h3>
                  </div>
                  <div style={{
                    height: '200px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    textAlign: 'center'
                  }}>
                    <BarChart3 size={48} color="white" />
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.875rem',
                      marginTop: '0.5rem'
                    }}>
                      Revenue chart coming soon
                    </p>
                  </div>
                </div>

                {/* Points Analytics */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '1.5rem'
                }}>
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
                      zIndex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '1.5rem'
                    }}>
                      <h3 style={{
                        color: 'white',
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        margin: 0
                      }}>
                        Points Distribution ({getTimePeriodLabel(timePeriod)})
                      </h3>
                    </div>
                    <div style={{
                      height: '200px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      textAlign: 'center'
                    }}>
                      <PieChart size={48} color="white" />
                      <p style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.875rem',
                        marginTop: '0.5rem'
                      }}>
                        Points chart coming soon
                      </p>
                    </div>
                  </div>

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
                      zIndex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '1.5rem'
                    }}>
                      <h3 style={{
                        color: 'white',
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        margin: 0
                      }}>
                        Customer Growth ({getTimePeriodLabel(timePeriod)})
                      </h3>
                    </div>
                    <div style={{
                      height: '200px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      textAlign: 'center'
                    }}>
                      <TrendingUp size={48} color="white" />
                      <p style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.875rem',
                        marginTop: '0.5rem'
                      }}>
                        Growth chart coming soon
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <Modal 
          isOpen={showDeleteModal} 
          onClose={() => setShowDeleteModal(false)} 
          variant="danger"
          title="🔥 CONFIRM DELETE 🔥"
          actions={
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteUserLoading}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: '2px solid rgba(102, 126, 234, 0.2)',
                  background: 'white',
                  color: '#667eea',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: deleteUserLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: deleteUserLoading ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteUserLoading}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: '2px solid #ef4444',
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: deleteUserLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: deleteUserLoading ? 0.7 : 1
                }}
              >
                {deleteUserLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          }
        >
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <p style={{
              fontSize: '13px',
              color: '#ef4444',
              margin: 0,
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🚨 DANGER: This action cannot be undone. The user and all associated data will be permanently removed.
            </p>
          </div>
          
          <div style={{ color: '#1f2937' }}>
            <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
              Are you sure you want to delete this user?
            </p>
            {user && (
              <div style={{
                background: 'rgba(102, 126, 234, 0.1)',
                border: '1px solid rgba(102, 126, 234, 0.2)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <p style={{ 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: '#667eea',
                  margin: 0
                }}>
                  📧 {user.email}
                </p>
              </div>
            )}
            <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
              This will permanently remove:
            </p>
            <ul style={{ 
              fontSize: '13px', 
              color: '#6b7280', 
              marginLeft: '16px',
              lineHeight: '1.6'
            }}>
              <li>User from Firebase Authentication</li>
              <li>All user data from Firestore</li>
              <li>All associated outlets, customers, and transactions</li>
              <li>All campaign and analytics data</li>
            </ul>
          </div>
        </Modal>

        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
};

export default UserDetailPage; 