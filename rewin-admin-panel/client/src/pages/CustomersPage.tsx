import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Plus, Filter, MoreVertical, Edit, Trash2, Eye, Mail, Phone, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { customersAPI, usersAPI } from '../services/api';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  businessId?: string;
  businessName?: string;
  createdAt: string;
  status: 'active' | 'inactive';
  totalPoints?: number;
  redeemedPoints?: number;
  lastVisit?: string;
  checkInCount?: number;
}

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        
        if (userId) {
          // Fetch customers for specific user
          const customersResponse = await customersAPI.getByUser(userId);
          setCustomers(customersResponse);
          
          // Fetch user info
          const userResponse = await usersAPI.getById(userId);
          setUser(userResponse);
        } else {
          // Fetch all customers
          const customersResponse = await customersAPI.getAll();
          setCustomers(customersResponse);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [userId]);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.businessName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div>
          {userId && user && (
            <div style={{ marginBottom: '8px' }}>
              <button
                onClick={() => navigate('/users')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <ArrowLeft size={16} />
                Back to Users
              </button>
            </div>
          )}
          <h1 className="page-title">
            {userId && user ? `Customers for ${user.displayName || user.email}` : 'Customers Management'}
          </h1>
          <p className="page-subtitle">
            {userId && user 
              ? `View and manage customers for ${user.displayName || user.email}`
              : 'View and manage all customer data across all businesses and users.'
            }
          </p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10 w-64"
            />
          </div>
          <button className="btn btn-secondary">
            <Filter size={16} />
            Filter
          </button>
        </div>
        <button className="btn btn-primary">
          <Plus size={16} />
          Add Customer
        </button>
      </div>

      {/* Customers Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">All Customers</h3>
          <p className="card-subtitle">{filteredCustomers.length} customers found</p>
        </div>
        <div className="card-body p-0">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Points</th>
                  <th>Check-ins</th>
                  <th>Last Visit</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr 
                    key={customer.id} 
                    style={{ 
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease'
                    }} 
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ color: 'white', fontWeight: '500', fontSize: '0.875rem' }}>
                            {customer.name}
                          </div>
                          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem' }}>
                            ID: {customer.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        {customer.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                            <Mail size={12} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                            <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.875rem' }}>
                              {customer.email}
                            </span>
                          </div>
                        )}
                        {customer.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={12} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                              {customer.phone}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ color: 'white', fontWeight: '500', fontSize: '0.875rem' }}>
                          {customer.totalPoints || 0} pts
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem' }}>
                          Redeemed: {customer.redeemedPoints || 0}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.875rem' }}>
                        {customer.checkInCount || 0}
                      </div>
                    </td>
                    <td>
                      <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                        {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : 'Never'}
                      </div>
                    </td>
                    <td>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: customer.status === 'active' ? '#10b981' : '#f59e0b'
                        }} />
                        <span style={{ 
                          color: customer.status === 'active' ? '#10b981' : '#f59e0b',
                          fontSize: '0.875rem'
                        }}>
                          {customer.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center'
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${customer.id}`);
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomersPage; 