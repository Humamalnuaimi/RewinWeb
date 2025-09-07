import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Users, UserCheck, Settings, DollarSign, Activity } from 'lucide-react';
import { analyticsAPI } from '../services/api';

interface AnalyticsData {
  totalUsers: number;
  totalCustomers: number;
  totalOutlets: number;
  totalTransactions: number;
  totalRevenue: number;
}

const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await analyticsAPI.getOverview();
        setAnalytics(response);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

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
        <h1 className="page-title">Analytics Dashboard</h1>
        <p className="page-subtitle">
          Comprehensive analytics and insights for your business performance.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div>
              <p className="stat-title">Total Revenue</p>
              <p className="text-xs text-gray-500 mt-1">Monthly earnings</p>
            </div>
            <div className="stat-icon bg-gradient-to-r from-green-500 to-green-600">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="stat-value">${analytics?.totalRevenue?.toFixed(2) || '0.00'}</div>
          <div className="stat-change positive">
            <TrendingUp size={14} />
            +15% from last month
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div>
              <p className="stat-title">Total Transactions</p>
              <p className="text-xs text-gray-500 mt-1">All time transactions</p>
            </div>
            <div className="stat-icon bg-gradient-to-r from-blue-500 to-blue-600">
              <Activity size={20} />
            </div>
          </div>
          <div className="stat-value">{analytics?.totalTransactions || 0}</div>
          <div className="stat-change positive">
            <TrendingUp size={14} />
            +8% from last month
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div>
              <p className="stat-title">Active Users</p>
              <p className="text-xs text-gray-500 mt-1">Registered users</p>
            </div>
            <div className="stat-icon bg-gradient-to-r from-purple-500 to-purple-600">
              <Users size={20} />
            </div>
          </div>
          <div className="stat-value">{analytics?.totalUsers || 0}</div>
          <div className="stat-change positive">
            <TrendingUp size={14} />
            +12% from last month
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div>
              <p className="stat-title">Total Customers</p>
              <p className="text-xs text-gray-500 mt-1">Customer database</p>
            </div>
            <div className="stat-icon bg-gradient-to-r from-orange-500 to-orange-600">
              <UserCheck size={20} />
            </div>
          </div>
          <div className="stat-value">{analytics?.totalCustomers || 0}</div>
          <div className="stat-change positive">
            <TrendingUp size={14} />
            +5% from last month
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Revenue Overview</h3>
            <p className="card-subtitle">Monthly revenue trends</p>
          </div>
          <div className="card-body">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Chart coming soon...</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Growth Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">User Growth</h3>
            <p className="card-subtitle">User registration trends</p>
          </div>
          <div className="card-body">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <TrendingUp size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Chart coming soon...</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Detailed Analytics</h3>
          <p className="card-subtitle">Comprehensive business insights</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Conversion Rate</h4>
              <p className="text-2xl font-bold text-blue-600">12.5%</p>
              <p className="text-sm text-blue-700">+2.1% from last month</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Customer Retention</h4>
              <p className="text-2xl font-bold text-green-600">87.3%</p>
              <p className="text-sm text-green-700">+1.2% from last month</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">Average Order Value</h4>
              <p className="text-2xl font-bold text-purple-600">$45.20</p>
              <p className="text-sm text-purple-700">+5.3% from last month</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage; 