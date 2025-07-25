import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Plus, Filter, MoreVertical, Edit, Trash2, Eye, Mail, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  businessId: string;
  businessName: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate loading customers data
    setTimeout(() => {
      setCustomers([
        {
          id: '1',
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1 (555) 123-4567',
          businessId: 'business1',
          businessName: 'Restaurant A',
          createdAt: '2024-01-15',
          status: 'active'
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          phone: '+1 (555) 987-6543',
          businessId: 'business2',
          businessName: 'Cafe B',
          createdAt: '2024-01-20',
          status: 'active'
        },
        {
          id: '3',
          name: 'Mike Johnson',
          email: 'mike.johnson@example.com',
          phone: '+1 (555) 456-7890',
          businessId: 'business1',
          businessName: 'Restaurant A',
          createdAt: '2024-01-25',
          status: 'inactive'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.businessName.toLowerCase().includes(searchTerm.toLowerCase())
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
        <h1 className="page-title">Customers Management</h1>
        <p className="page-subtitle">
          View and manage all customer data across all businesses and users.
        </p>
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
                  <th>Business</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/customers/${customer.id}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                          <p className="text-xs text-gray-500">ID: {customer.id}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Mail size={12} className="text-gray-400" />
                          <p className="text-sm text-gray-900">{customer.email}</p>
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-1">
                            <Phone size={12} className="text-gray-400" />
                            <p className="text-xs text-gray-500">{customer.phone}</p>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="text-sm text-gray-900">{customer.businessName}</span>
                    </td>
                    <td>
                      <span className={`badge ${customer.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{customer.status === 'active' ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-500">{new Date(customer.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="View" onClick={e => { e.stopPropagation(); navigate(`/customers/${customer.id}`); }}>
                          <Eye size={16} />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-green-600 transition-colors" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                          <Trash2 size={16} />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors" title="More">
                          <MoreVertical size={16} />
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