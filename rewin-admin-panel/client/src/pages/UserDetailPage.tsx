import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Building2, UserCheck, Mail, Calendar, Shield, Settings, Activity } from 'lucide-react';

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
  customerCount?: number;
}

interface Business {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  createdAt: any;
}

const UserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    try {
      // Fetch user details
      const userResponse = await fetch(`/api/users/${userId}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      }

      // Fetch user's businesses
      const businessesResponse = await fetch(`/api/analytics/users/${userId}/businesses`);
      if (businessesResponse.ok) {
        const businessesData = await businessesResponse.json();
        setBusinesses(businessesData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/users/${userId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          navigate('/users');
        } else {
          console.error('Failed to delete user');
        }
      } catch (error) {
        console.error('Error deleting user:', error);
      }
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

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">Loading user details...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <UserCheck size={48} className="text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">User not found</h3>
          <p className="text-gray-500">The user you're looking for doesn't exist.</p>
          <button onClick={() => navigate('/users')} className="btn btn-primary">
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/users')}
            className="btn btn-secondary"
          >
            <ArrowLeft size={16} />
            Back to Users
          </button>
          <div>
            <h1 className="page-title">User Details</h1>
            <p className="page-subtitle">Manage user information and permissions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="btn btn-secondary"
          >
            <Edit size={16} />
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-danger"
          >
            <Trash2 size={16} />
            Delete User
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Information Card */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">User Information</h2>
              </div>
              <div className="card-content">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Email Address</label>
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-gray-400" />
                        <span className="text-gray-900">{user.email}</span>
                        {user.emailVerified && (
                          <Shield size={16} className="text-green-500" />
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Display Name</label>
                      <span className="text-gray-900">{user.displayName || 'Not set'}</span>
                    </div>
                    <div>
                      <label className="form-label">Account Status</label>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.disabled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {user.disabled ? 'Disabled' : 'Active'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Created</label>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-gray-900">{formatDate(user.metadata.creationTime)}</span>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Last Sign In</label>
                      <div className="flex items-center gap-2">
                        <Activity size={16} className="text-gray-400" />
                        <span className="text-gray-900">{formatDate(user.metadata.lastSignInTime)}</span>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">User ID</label>
                      <span className="text-sm text-gray-500 font-mono">{user.uid}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Statistics</h2>
              </div>
              <div className="card-content">
                <div className="space-y-4">
                  <div className="stat-item">
                    <div className="stat-icon bg-blue-100">
                      <Building2 size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="stat-value">{businesses.length}</div>
                      <div className="stat-label">Businesses</div>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon bg-green-100">
                      <UserCheck size={20} className="text-green-600" />
                    </div>
                    <div>
                      <div className="stat-value">{user.customerCount || 0}</div>
                      <div className="stat-label">Customers</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Businesses Section */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">User's Businesses</h2>
          </div>
          <div className="card-content">
            {businesses.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Business Name</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businesses.map((business) => (
                      <tr key={business.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                              <Building2 size={14} className="text-white" />
                            </div>
                            <span className="font-medium">{business.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            business.type === 'restaurant' ? 'bg-red-100 text-red-800' :
                            business.type === 'cafe' ? 'bg-yellow-100 text-yellow-800' :
                            business.type === 'retail' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {business.type}
                          </span>
                        </td>
                        <td>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            business.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {business.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-sm text-gray-500">
                          {business.createdAt ? formatDate(business.createdAt) : 'N/A'}
                        </td>
                        <td>
                          <button
                            onClick={() => navigate(`/outlets/${business.id}`)}
                            className="btn btn-sm btn-secondary"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <Building2 size={48} className="text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900">No businesses found</h3>
                <p className="text-gray-500">This user hasn't created any businesses yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailPage; 