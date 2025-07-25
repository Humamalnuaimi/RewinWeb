import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, UserCheck, Mail, Phone, Calendar, MapPin, Activity, ShoppingBag, Heart } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  createdAt: string;
  lastVisit?: string;
  totalOrders: number;
  totalSpent: number;
  favoriteItems: string[];
  status: 'active' | 'inactive' | 'vip';
}

const CustomerDetailPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  const fetchCustomerData = async () => {
    // Simulate fetching customer data
    // In a real app, this would fetch from your API
    setTimeout(() => {
      const mockCustomer: Customer = {
        id: customerId!,
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1 (555) 123-4567',
        address: '123 Main St, New York, NY 10001',
        createdAt: '2024-01-15T10:30:00Z',
        lastVisit: '2024-07-20T14:45:00Z',
        totalOrders: 12,
        totalSpent: 1250.75,
        favoriteItems: ['Coffee', 'Sandwich', 'Cake'],
        status: 'active'
      };
      setCustomer(mockCustomer);
      setLoading(false);
    }, 1000);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/customers/${customerId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          navigate('/customers');
        } else {
          console.error('Failed to delete customer');
        }
      } catch (error) {
        console.error('Error deleting customer:', error);
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
        <div className="loading-spinner">Loading customer details...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <UserCheck size={48} className="text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">Customer not found</h3>
          <p className="text-gray-500">The customer you're looking for doesn't exist.</p>
          <button onClick={() => navigate('/customers')} className="btn btn-primary">
            Back to Customers
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
            onClick={() => navigate('/customers')}
            className="btn btn-secondary"
          >
            <ArrowLeft size={16} />
            Back to Customers
          </button>
          <div>
            <h1 className="page-title">{customer.name}</h1>
            <p className="page-subtitle">Customer profile and order history</p>
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
            Delete Customer
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Information Card */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Customer Information</h2>
              </div>
              <div className="card-content">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Full Name</label>
                      <div className="flex items-center gap-2">
                        <UserCheck size={16} className="text-gray-400" />
                        <span className="text-gray-900">{customer.name}</span>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Email Address</label>
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-gray-400" />
                        <span className="text-gray-900">{customer.email}</span>
                      </div>
                    </div>
                    {customer.phone && (
                      <div>
                        <label className="form-label">Phone Number</label>
                        <div className="flex items-center gap-2">
                          <Phone size={16} className="text-gray-400" />
                          <span className="text-gray-900">{customer.phone}</span>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="form-label">Status</label>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        customer.status === 'active' ? 'bg-green-100 text-green-800' :
                        customer.status === 'vip' ? 'bg-purple-100 text-purple-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {customer.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {customer.address && (
                      <div>
                        <label className="form-label">Address</label>
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-gray-400" />
                          <span className="text-gray-900">{customer.address}</span>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="form-label">Member Since</label>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-gray-900">{formatDate(customer.createdAt)}</span>
                      </div>
                    </div>
                                         <div>
                       <label className="form-label">Last Visit</label>
                       <div className="flex items-center gap-2">
                         <Activity size={16} className="text-gray-400" />
                         <span className="text-gray-900">{customer.lastVisit ? formatDate(customer.lastVisit) : 'Never'}</span>
                       </div>
                     </div>
                    <div>
                      <label className="form-label">Customer ID</label>
                      <span className="text-sm text-gray-500 font-mono">{customer.id}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Card */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Statistics</h2>
              </div>
              <div className="card-content">
                <div className="space-y-4">
                  <div className="stat-item">
                    <div className="stat-icon bg-blue-100">
                      <ShoppingBag size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="stat-value">{customer.totalOrders}</div>
                      <div className="stat-label">Total Orders</div>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon bg-green-100">
                      <Activity size={20} className="text-green-600" />
                    </div>
                    <div>
                      <div className="stat-value">${customer.totalSpent.toFixed(2)}</div>
                      <div className="stat-label">Total Spent</div>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon bg-purple-100">
                      <Heart size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <div className="stat-value">{customer.favoriteItems.length}</div>
                      <div className="stat-label">Favorite Items</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Favorite Items Section */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Favorite Items</h2>
          </div>
          <div className="card-content">
            {customer.favoriteItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {customer.favoriteItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Heart size={16} className="text-red-500" />
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Heart size={48} className="text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900">No favorite items</h3>
                <p className="text-gray-500">This customer hasn't marked any items as favorites yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders Section */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Orders</h2>
          </div>
          <div className="card-content">
            <div className="empty-state">
              <ShoppingBag size={48} className="text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900">No recent orders</h3>
              <p className="text-gray-500">Order history will appear here when available.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailPage; 