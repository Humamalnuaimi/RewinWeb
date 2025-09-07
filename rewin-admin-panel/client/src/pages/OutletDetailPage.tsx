import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Building2, MapPin, Phone, Mail, Calendar, Settings, Activity, DollarSign, Clock, UserCheck, Users, TrendingUp, Package } from 'lucide-react';
import Modal from '../components/Modal';
import Toast, { ToastProps } from '../components/Toast';
import { outletsAPI } from '../services/api';

interface Outlet {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  type?: string;
  createdAt?: any;
  settings?: {
    currency: string;
    timezone: string;
  };
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  outletId: string;
  outletName?: string;
  createdAt?: any;
}

interface Transaction {
  id: string;
  amount: number;
  customerId: string;
  customerName?: string;
  outletId: string;
  type: string;
  createdAt?: any;
}

interface OutletDetails {
  outlet: Outlet;
  customers: Customer[];
  transactions: Transaction[];
  totalRevenue: number;
  customerCount: number;
  transactionCount: number;
}

const OutletDetailPage: React.FC = () => {
  const { outletId } = useParams<{ outletId: string }>();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const navigate = useNavigate();
  
  const [outletDetails, setOutletDetails] = useState<OutletDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOutlet, setEditOutlet] = useState<Outlet | null>(null);

  const fetchOutletData = async () => {
    if (!outletId || !userId) {
      setToast({
        message: 'Missing outlet ID or user ID',
        type: 'error',
        onClose: () => setToast(null)
      });
      return;
    }

    try {
      setLoading(true);
      const data = await outletsAPI.getById(outletId, userId);
      setOutletDetails(data);
      setEditOutlet(data.outlet);
    } catch (error) {
      console.error('Error fetching outlet details:', error);
      setToast({
        message: 'Failed to load outlet details',
        type: 'error',
        onClose: () => setToast(null)
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutletData();
  }, [outletId, userId]);

  const handleEdit = async () => {
    if (!editOutlet || !outletId || !userId) return;

    try {
      setSaving(true);
      await outletsAPI.update(outletId, userId, editOutlet);
      await fetchOutletData(); // Refresh data
      setShowEditModal(false);
      setToast({
        message: 'Outlet updated successfully',
        type: 'success',
        onClose: () => setToast(null)
      });
    } catch (error) {
      console.error('Error updating outlet:', error);
      setToast({
        message: 'Failed to update outlet',
        type: 'error',
        onClose: () => setToast(null)
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!outletId || !userId) return;

    try {
      setDeleting(true);
      await outletsAPI.delete(outletId, userId);
      setToast({
        message: 'Outlet deleted successfully',
        type: 'success',
        onClose: () => setToast(null)
      });
      navigate('/outlets');
    } catch (error) {
      console.error('Error deleting outlet:', error);
      setToast({
        message: 'Failed to delete outlet',
        type: 'error',
        onClose: () => setToast(null)
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">Loading outlet details...</div>
      </div>
    );
  }

  if (!outletDetails) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <Building2 size={48} />
          <h3>Outlet not found</h3>
          <p>The outlet you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const { outlet, customers, transactions, totalRevenue, customerCount, transactionCount } = outletDetails;

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/outlets')}
              className="btn btn-secondary"
            >
              <ArrowLeft size={16} />
              Back to Outlets
            </button>
            <div>
              <h1 className="page-title">{outlet.name}</h1>
              <p className="page-subtitle">Outlet Details & Analytics</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="btn btn-primary"
            >
              <Edit size={16} />
              Edit
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-danger"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>

        {/* Outlet Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Outlet Information</h2>
              </div>
              <div className="card-content">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Name</label>
                      <p className="text-gray-900 font-medium">{outlet.name}</p>
                    </div>
                    <div>
                      <label className="form-label">Type</label>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {outlet.type || 'restaurant'}
                      </span>
                    </div>
                    <div>
                      <label className="form-label">Status</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        outlet.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {outlet.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {outlet.address && (
                      <div>
                        <label className="form-label">Address</label>
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-gray-400" />
                          <p className="text-gray-900">{outlet.address}</p>
                        </div>
                      </div>
                    )}
                    {outlet.phone && (
                      <div>
                        <label className="form-label">Phone</label>
                        <div className="flex items-center gap-2">
                          <Phone size={16} className="text-gray-400" />
                          <p className="text-gray-900">{outlet.phone}</p>
                        </div>
                      </div>
                    )}
                    {outlet.email && (
                      <div>
                        <label className="form-label">Email</label>
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-gray-400" />
                          <p className="text-gray-900">{outlet.email}</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="form-label">Created</label>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <p className="text-gray-900">{formatDate(outlet.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Statistics</h3>
              </div>
              <div className="card-content">
                <div className="space-y-4">
                  <div className="stat-item">
                    <div className="stat-card-icon bg-blue-100">
                      <Users size={20} className="text-blue-600" />
                    </div>
                    <div className="stat-card-content">
                      <div className="stat-card-value">{customerCount}</div>
                      <div className="stat-card-label">Total Customers</div>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-card-icon bg-green-100">
                      <DollarSign size={20} className="text-green-600" />
                    </div>
                    <div className="stat-card-content">
                      <div className="stat-card-value">{formatCurrency(totalRevenue)}</div>
                      <div className="stat-card-label">Total Revenue</div>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-card-icon bg-purple-100">
                      <Activity size={20} className="text-purple-600" />
                    </div>
                    <div className="stat-card-content">
                      <div className="stat-card-value">{transactionCount}</div>
                      <div className="stat-card-label">Total Transactions</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Settings */}
            {outlet.settings && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Settings</h3>
                </div>
                <div className="card-content">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Settings size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Currency: {outlet.settings.currency || 'USD'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Timezone: {outlet.settings.timezone || 'UTC'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customers Section */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Customers</h2>
            <span className="text-sm text-gray-500">{customerCount} customers</span>
          </div>
          <div className="card-content">
            {customers.length === 0 ? (
              <div className="empty-state">
                <UserCheck size={48} />
                <h3>No customers found</h3>
                <p>This outlet doesn't have any customers yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Contact</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <UserCheck size={16} className="text-green-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{customer.name}</div>
                              <div className="text-sm text-gray-500">ID: {customer.id}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-1">
                            {customer.email && (
                              <div className="flex items-center gap-2">
                                <Mail size={14} className="text-gray-400" />
                                <span className="text-sm text-gray-600">{customer.email}</span>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-2">
                                <Phone size={14} className="text-gray-400" />
                                <span className="text-sm text-gray-600">{customer.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="text-sm text-gray-500">
                            {formatDate(customer.createdAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Transactions</h2>
            <span className="text-sm text-gray-500">{transactionCount} transactions</span>
          </div>
          <div className="card-content">
            {transactions.length === 0 ? (
              <div className="empty-state">
                <TrendingUp size={48} />
                <h3>No transactions found</h3>
                <p>This outlet doesn't have any transactions yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Type</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 10).map((transaction) => (
                      <tr key={transaction.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Users size={16} className="text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {transaction.customerName || 'Unknown Customer'}
                              </div>
                              <div className="text-sm text-gray-500">ID: {transaction.customerId}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="font-medium text-green-600">
                            {formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {transaction.type}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm text-gray-500">
                            {formatDate(transaction.createdAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Outlet"
      >
        {editOutlet && (
          <div className="space-y-4">
            <div>
              <label className="form-label">Name</label>
              <input
                type="text"
                value={editOutlet.name}
                onChange={(e) => setEditOutlet({ ...editOutlet, name: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Address</label>
              <input
                type="text"
                value={editOutlet.address || ''}
                onChange={(e) => setEditOutlet({ ...editOutlet, address: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input
                type="text"
                value={editOutlet.phone || ''}
                onChange={(e) => setEditOutlet({ ...editOutlet, phone: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                value={editOutlet.email || ''}
                onChange={(e) => setEditOutlet({ ...editOutlet, email: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Type</label>
              <select
                value={editOutlet.type || 'restaurant'}
                onChange={(e) => setEditOutlet({ ...editOutlet, type: e.target.value })}
                className="form-input"
              >
                <option value="restaurant">Restaurant</option>
                <option value="cafe">Cafe</option>
                <option value="bar">Bar</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={editOutlet.isActive || false}
                onChange={(e) => setEditOutlet({ ...editOutlet, isActive: e.target.checked })}
                className="form-checkbox"
              />
              <label htmlFor="isActive" className="form-label">Active</label>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                className="btn btn-secondary"
                onClick={() => setShowEditModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleEdit}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Outlet"
      >
        <p>Are you sure you want to delete "{outlet.name}"? This action cannot be undone.</p>
        <div className="flex gap-3 mt-4">
          <button
            className="btn btn-secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>

      {/* Toast */}
      {toast && <Toast {...toast} />}
    </div>
  );
};

export default OutletDetailPage; 