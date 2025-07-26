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
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  LineChart,
  BarChart,
  PieChart as PieChartIcon
} from 'lucide-react';
import { usersAPI, analyticsAPI, outletsAPI, customersAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast, { ToastProps } from '../components/Toast';

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
  businessId?: string;
}

interface DailyStats {
  date: string;
  earnedPoints: number;
  redeemedPoints: number;
  checkIns: number;
  revenue: number;
  newCustomers: number;
  outletBreakdown: {
    [outletId: string]: {
      name: string;
      earnedPoints: number;
      redeemedPoints: number;
      checkIns: number;
      revenue: number;
    };
  };
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
  outletPerformance: {
    [outletId: string]: {
      name: string;
      totalCustomers: number;
      totalRevenue: number;
      totalPointsEarned: number;
      totalPointsRedeemed: number;
      totalCheckIns: number;
      dailyStats: DailyStats[];
    };
  };
}

type TimePeriod = 'today' | 'yesterday' | 'week' | 'month' | 'all';
type ChartType = 'line' | 'bar' | 'pie';

const UserAnalyticsPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  console.log('UserAnalyticsPage rendered with userId:', userId);
  
  // Redirect if no userId
  useEffect(() => {
    if (!userId) {
      console.error('No userId provided, redirecting to users page');
      navigate('/users');
      return;
    }
  }, [userId, navigate]);
  
  const [user, setUser] = useState<User | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  useEffect(() => {
    if (userId && timePeriod) {
      fetchAnalytics();
    }
  }, [userId, timePeriod, selectedDate]);

  const fetchUserData = async () => {
    try {
      console.log('Fetching user data for userId:', userId);
      setLoading(true);
      
      // Fetch user data
      const userResponse = await usersAPI.getById(userId!);
      console.log('User response:', userResponse);
      setUser(userResponse);

      // Fetch user's businesses
      const businessesResponse = await outletsAPI.getByUser(userId!);
      console.log('Businesses response:', businessesResponse);
      setBusinesses(businessesResponse);

      // Fetch user's customers
      const customersResponse = await customersAPI.getByUser(userId!);
      console.log('Customers response:', customersResponse);
      setCustomers(customersResponse);

    } catch (error) {
      console.error('Error fetching user data:', error);
      setToastMessage('Error loading user data');
      setToastType('error');
      setShowToast(true);
      
      // Set fallback data to prevent blank page
      setUser({
        uid: userId!,
        email: 'Loading...',
        displayName: 'Loading...',
        emailVerified: false,
        disabled: false,
        createdAt: '',
        lastSignIn: ''
      });
      setBusinesses([]);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      
      const params = new URLSearchParams({
        timePeriod,
        ...(selectedDate && { selectedDate }),
        ...(selectedOutlet !== 'all' && { outletId: selectedOutlet })
      });

      const response = await analyticsAPI.getUserAnalytics(userId!, params.toString());
      setAnalytics(response);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      setToastMessage('Error loading analytics data');
      setToastType('error');
      setShowToast(true);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const getTimePeriodLabel = (period: TimePeriod) => {
    switch (period) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'all': return 'All Time';
      default: return 'This Week';
    }
  };

  const handleDelete = async () => {
    try {
      await usersAPI.delete(userId!);
      setToastMessage('User deleted successfully');
      setToastType('success');
      setShowToast(true);
      navigate('/users');
    } catch (error) {
      console.error('Error deleting user:', error);
      setToastMessage('Error deleting user');
      setToastType('error');
      setShowToast(true);
    }
    setShowDeleteModal(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  const getProgressColor = (current: number, previous: number) => {
    if (current > previous) return '#10b981';
    if (current < previous) return '#ef4444';
    return '#6b7280';
  };

  const getProgressIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp size={16} />;
    if (current < previous) return <TrendingDown size={16} />;
    return <Activity size={16} />;
  };

  const renderChart = () => {
    if (!analytics?.dailyStats) return null;

    const data = analytics.dailyStats;
    const labels = data.map(stat => stat.date);
    const earnedPoints = data.map(stat => stat.earnedPoints);
    const redeemedPoints = data.map(stat => stat.redeemedPoints);
    const checkIns = data.map(stat => stat.checkIns);

    // Calculate max values for scaling
    const maxEarned = Math.max(...earnedPoints, 1);
    const maxRedeemed = Math.max(...redeemedPoints, 1);
    const maxCheckIns = Math.max(...checkIns, 1);

    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
          }}>
            Progress Overview
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['line', 'bar', 'pie'] as ChartType[]).map(type => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: chartType === type 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'rgba(255, 255, 255, 0.1)',
                  color: chartType === type ? 'white' : 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.3s ease'
                }}
              >
                {type === 'line' && <LineChart size={16} />}
                {type === 'bar' && <BarChart size={16} />}
                {type === 'pie' && <PieChartIcon size={16} />}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          height: '300px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '20px',
          position: 'relative'
        }}>
          {chartType === 'bar' && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'end', gap: '4px', justifyContent: 'center' }}>
              {data.slice(-7).map((stat, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '2px', height: '200px', alignItems: 'end' }}>
                    <div style={{
                      width: '20px',
                      height: `${(stat.earnedPoints / maxEarned) * 200}px`,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderRadius: '4px 4px 0 0',
                      minHeight: '4px'
                    }} />
                    <div style={{
                      width: '20px',
                      height: `${(stat.redeemedPoints / maxRedeemed) * 200}px`,
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      borderRadius: '4px 4px 0 0',
                      minHeight: '4px'
                    }} />
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {chartType === 'line' && (
            <div style={{ height: '100%', position: 'relative' }}>
              <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                <defs>
                  <linearGradient id="earnedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="redeemedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>
                </defs>
                
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((percent, i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={`${percent}%`}
                    x2="100%"
                    y2={`${percent}%`}
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="1"
                  />
                ))}

                {/* Line for earned points */}
                <polyline
                  fill="none"
                  stroke="url(#earnedGradient)"
                  strokeWidth="3"
                  points={data.slice(-7).map((stat, index) => {
                    const x = (index / 6) * 100;
                    const y = 100 - ((stat.earnedPoints / maxEarned) * 100);
                    return `${x}%,${y}%`;
                  }).join(' ')}
                />

                {/* Line for redeemed points */}
                <polyline
                  fill="none"
                  stroke="url(#redeemedGradient)"
                  strokeWidth="3"
                  points={data.slice(-7).map((stat, index) => {
                    const x = (index / 6) * 100;
                    const y = 100 - ((stat.redeemedPoints / maxRedeemed) * 100);
                    return `${x}%,${y}%`;
                  }).join(' ')}
                />
              </svg>
              
              {/* Legend */}
              <div style={{ position: 'absolute', bottom: '10px', left: '10px', display: 'flex', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }} />
                  <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)' }}>Earned</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px' }} />
                  <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)' }}>Redeemed</span>
                </div>
              </div>
            </div>
          )}

          {chartType === 'pie' && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '150px',
                  height: '150px',
                  borderRadius: '50%',
                  background: 'conic-gradient(from 0deg, #10b981 0deg, #10b981 180deg, #ef4444 180deg, #ef4444 360deg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {analytics.totalPointsEarned + analytics.totalPointsRedeemed}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#10b981' }}>
                      {formatNumber(analytics.totalPointsEarned)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>Earned</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#ef4444' }}>
                      {formatNumber(analytics.totalPointsRedeemed)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>Redeemed</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderOutletBreakdown = () => {
    if (!analytics?.outletPerformance) return null;

    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        marginBottom: '24px'
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '20px'
        }}>
          Outlet Performance
        </h3>

        <div style={{ display: 'grid', gap: '16px' }}>
          {Object.entries(analytics.outletPerformance).map(([outletId, outlet]) => (
            <div key={outletId} style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
            onClick={() => setSelectedOutlet(outletId)}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <div>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'white',
                    margin: '0 0 4px 0'
                  }}>
                    {outlet.name}
                  </h4>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: 0
                  }}>
                    {outlet.totalCustomers} customers
                  </p>
                </div>
                <div style={{
                  padding: '8px 12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {formatCurrency(outlet.totalRevenue)}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'white',
                    marginBottom: '4px'
                  }}>
                    {formatNumber(outlet.totalPointsEarned)}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    Points Earned
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'white',
                    marginBottom: '4px'
                  }}>
                    {formatNumber(outlet.totalPointsRedeemed)}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    Points Redeemed
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'white',
                    marginBottom: '4px'
                  }}>
                    {formatNumber(outlet.totalCheckIns)}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    Check-ins
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'white',
                    marginBottom: '4px'
                  }}>
                    {formatNumber(outlet.totalCustomers)}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    Customers
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '40px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          textAlign: 'center',
          color: 'white'
        }}>
          <Activity size={48} style={{ marginBottom: '16px' }} />
          <p>Loading user analytics...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '40px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          textAlign: 'center',
          color: 'white'
        }}>
          <AlertCircle size={48} style={{ marginBottom: '16px' }} />
          <p>User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => navigate('/users')}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '8px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: '0 0 8px 0'
              }}>
                User Analytics
              </h1>
              <p style={{
                fontSize: '16px',
                color: 'rgba(255, 255, 255, 0.8)',
                margin: 0
              }}>
                Detailed analytics for {user.displayName || user.email}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => navigate(`/users/${userId}/edit`)}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Edit size={16} />
              Edit User
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>

        {/* User Profile Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: '700',
              color: 'white'
            }}>
              {user.displayName?.[0]?.toUpperCase() || (user.email?.[0]?.toUpperCase() || '?')}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: 'white',
                margin: '0 0 8px 0'
              }}>
                {user.displayName || 'No Name'}
              </h2>
              <p style={{
                fontSize: '16px',
                color: 'rgba(255, 255, 255, 0.8)',
                margin: '0 0 8px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Mail size={16} />
                {user.email}
              </p>
              <div style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'center'
              }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: user.emailVerified 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white'
                }}>
                  {user.emailVerified ? 'Verified' : 'Unverified'}
                </span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: user.disabled
                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white'
                }}>
                  {user.disabled ? 'Disabled' : 'Active'}
                </span>
                <span style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Calendar size={14} />
                  Joined {formatDate(user.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Time Period Filter */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'white',
              margin: 0
            }}>
              Time Period Filter
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px'
            }}>
              <CalendarDays size={16} />
              {getTimePeriodLabel(timePeriod)}
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            {(['today', 'yesterday', 'week', 'month', 'all'] as TimePeriod[]).map(period => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: timePeriod === period
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'rgba(255, 255, 255, 0.1)',
                  color: timePeriod === period ? 'white' : 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (timePeriod !== period) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (timePeriod !== period) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
              >
                {getTimePeriodLabel(period)}
              </button>
            ))}
          </div>

          {selectedOutlet !== 'all' && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.8)',
                margin: 0
              }}>
                Filtering by outlet: {analytics?.outletPerformance[selectedOutlet]?.name || 'Unknown'}
              </p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {analytics && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '24px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderLeft: '4px solid #10b981'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white'
                }}>
                  <Users size={20} />
                </div>
                {getProgressIcon(analytics.totalCustomers, analytics.totalCustomers - 5)}
              </div>
              <h3 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: 'white',
                margin: '0 0 8px 0'
              }}>
                {formatNumber(analytics.totalCustomers)}
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.8)',
                margin: 0
              }}>
                Total Customers
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderLeft: '4px solid #f59e0b'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white'
                }}>
                  <DollarSign size={20} />
                </div>
                {getProgressIcon(analytics.totalRevenue, analytics.totalRevenue - 100)}
              </div>
              <h3 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: 'white',
                margin: '0 0 8px 0'
              }}>
                {formatCurrency(analytics.totalRevenue)}
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.8)',
                margin: 0
              }}>
                Total Revenue
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderLeft: '4px solid #667eea'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white'
                }}>
                  <Gift size={20} />
                </div>
                {getProgressIcon(analytics.totalPointsEarned, analytics.totalPointsEarned - 50)}
              </div>
              <h3 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: 'white',
                margin: '0 0 8px 0'
              }}>
                {formatNumber(analytics.totalPointsEarned)}
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.8)',
                margin: 0
              }}>
                Points Earned
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderLeft: '4px solid #ef4444'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white'
                }}>
                  <Zap size={20} />
                </div>
                {getProgressIcon(analytics.totalPointsRedeemed, analytics.totalPointsRedeemed - 25)}
              </div>
              <h3 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: 'white',
                margin: '0 0 8px 0'
              }}>
                {formatNumber(analytics.totalPointsRedeemed)}
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.8)',
                margin: 0
              }}>
                Points Redeemed
              </p>
            </div>
          </div>
        )}

        {/* Charts and Analytics */}
        {renderChart()}
        {renderOutletBreakdown()}

        {/* Recent Activity */}
        {analytics?.recentActivity && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '20px'
            }}>
              Recent Activity
            </h3>

            <div style={{ display: 'grid', gap: '12px' }}>
              {analytics.recentActivity.slice(0, 10).map((activity, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}>
                    <Activity size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: '14px',
                      color: 'white',
                      margin: '0 0 4px 0'
                    }}>
                      {activity.description}
                    </p>
                    <p style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      margin: 0
                    }}>
                      {formatDate(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modals */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete User"
        >
          <div style={{ padding: '20px' }}>
            <p style={{ marginBottom: '20px', color: '#374151' }}>
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: 'white',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Delete User
              </button>
            </div>
          </div>
        </Modal>

        {/* Toast */}
        {showToast && (
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={() => setShowToast(false)}
          />
        )}
      </div>
    </div>
  );
};

export default UserAnalyticsPage; 