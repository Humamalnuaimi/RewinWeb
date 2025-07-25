import React, { useState, useEffect } from 'react';
import { Users, UserCheck, BarChart3, Settings, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { analyticsAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface OverviewData {
  totalUsers: number;
  totalCustomers: number;
  totalOutlets: number;
  totalTransactions: number;
  totalRevenue: number;
  newUsersThisMonth: number;
  userGrowthRate: number;
}

const DashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const response = await analyticsAPI.getOverview();
        setOverview(response);
      } catch (error) {
        console.error('Failed to fetch overview:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  const stats = [
    {
      title: 'Total Users',
      value: overview?.totalUsers || 0,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      change: '+12%',
      changeType: 'positive',
      description: 'Active registered users'
    },
    {
      title: 'Total Customers',
      value: overview?.totalCustomers || 0,
      icon: UserCheck,
      color: 'from-green-500 to-green-600',
      change: '+8%',
      changeType: 'positive',
      description: 'Customer database'
    },
    {
      title: 'Total Outlets',
      value: overview?.totalOutlets || 0,
      icon: Settings,
      color: 'from-purple-500 to-purple-600',
      change: '+5%',
      changeType: 'positive',
      description: 'Business locations'
    },
    {
      title: 'Total Revenue',
      value: `$${overview?.totalRevenue?.toFixed(2) || '0.00'}`,
      icon: BarChart3,
      color: 'from-orange-500 to-orange-600',
      change: '+15%',
      changeType: 'positive',
      description: 'Monthly revenue'
    },
  ];

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
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Welcome to your Rewin Admin Panel. Here's an overview of your system performance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          // Map stat cards to their respective pages
          let cardLink = '/';
          if (stat.title === 'Total Users') cardLink = '/users';
          if (stat.title === 'Total Customers') cardLink = '/customers';
          if (stat.title === 'Total Outlets') cardLink = '/outlets';
          if (stat.title === 'Total Revenue') cardLink = '/analytics';
          return (
            <div key={index} className="stat-card hover:shadow-lg transition cursor-pointer" onClick={() => navigate(cardLink)}>
              <div className="stat-header">
                <div>
                  <p className="stat-title">{stat.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
                <div className={`stat-icon bg-gradient-to-r ${stat.color}`}>
                  <Icon size={20} />
                </div>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className={`stat-change ${stat.changeType}`}>
                {stat.changeType === 'positive' ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                {stat.change} from last month
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Users</h3>
            <p className="card-subtitle">Latest registered users</p>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {[1, 2, 3].map((_, index) => (
                <div key={index} className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/users/${index + 1}`)}>
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Users size={16} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">New User {index + 1}</p>
                    <p className="text-xs text-gray-500">user{index + 1}@example.com</p>
                  </div>
                  <span className="badge badge-success">Active</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card-footer">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/users')}>View All Users</button>
          </div>
        </div>

        {/* System Status */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">System Status</h3>
            <p className="card-subtitle">Current system health</p>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Database</span>
                </div>
                <span className="badge badge-success">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">API Server</span>
                </div>
                <span className="badge badge-success">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Authentication</span>
                </div>
                <span className="badge badge-success">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Storage</span>
                </div>
                <span className="badge badge-success">Online</span>
              </div>
            </div>
          </div>
          <div className="card-footer">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/system')}>View Details</button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
          <p className="card-subtitle">Common administrative tasks</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="btn btn-primary" onClick={() => navigate('/users')}>
              <Users size={16} />
              Add User
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/customers')}>
              <UserCheck size={16} />
              Manage Customers
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/system')}>
              <Settings size={16} />
              System Settings
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/analytics')}>
              <BarChart3 size={16} />
              View Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 