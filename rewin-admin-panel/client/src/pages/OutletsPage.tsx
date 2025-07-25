import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, Plus, Filter, MoreVertical, Edit, Trash2, Eye, MapPin, Phone, Mail, User, DollarSign } from 'lucide-react';
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
  customerCount?: number;
  totalRevenue?: number;
  userId: string;
  createdAt?: any;
}

const OutletsPage: React.FC = () => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showActions, setShowActions] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<Outlet | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newOutlet, setNewOutlet] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    type: 'restaurant'
  });
  const [editOutlet, setEditOutlet] = useState<Outlet | null>(null);
  const navigate = useNavigate();

  const fetchOutlets = async () => {
    try {
      setLoading(true);
      const data = await outletsAPI.getAll();
      setOutlets(data);
    } catch (error) {
      console.error('Error fetching outlets:', error);
      setToast({
        message: 'Failed to load outlets',
        type: 'error',
        onClose: () => setToast(null)
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutlets();
  }, []);

  const filteredOutlets = outlets.filter(outlet => {
    const matchesSearch = outlet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         outlet.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         outlet.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'active' && outlet.isActive) ||
                         (filterType === 'inactive' && !outlet.isActive);
    
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (outletId: string) => {
    try {
      setDeleting(true);
      const outlet = outlets.find(o => o.id === outletId);
      if (!outlet) throw new Error('Outlet not found');
      
      await outletsAPI.delete(outletId, outlet.userId);
      setOutlets(outlets.filter(o => o.id !== outletId));
      setShowDeleteModal(null);
      setToast({
        message: 'Outlet deleted successfully',
        type: 'success',
        onClose: () => setToast(null)
      });
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

  const handleEdit = async (outlet: Outlet) => {
    try {
      setSaving(true);
      await outletsAPI.update(outlet.id, outlet.userId, editOutlet!);
      setOutlets(outlets.map(o => o.id === outlet.id ? { ...o, ...editOutlet } : o));
      setShowEditModal(null);
      setEditOutlet(null);
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

  const handleAdd = async () => {
    try {
      setSaving(true);
      // For now, we'll use the first user's ID - in a real app, you'd get this from context
      const userId = outlets[0]?.userId || 'default-user-id';
      await outletsAPI.create(userId, newOutlet);
      await fetchOutlets(); // Refresh the list
      setShowAddModal(false);
      setNewOutlet({ name: '', address: '', phone: '', email: '', type: 'restaurant' });
      setToast({
        message: 'Outlet added successfully',
        type: 'success',
        onClose: () => setToast(null)
      });
    } catch (error) {
      console.error('Error adding outlet:', error);
      setToast({
        message: 'Failed to add outlet',
        type: 'error',
        onClose: () => setToast(null)
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">Loading outlets...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Outlets</h1>
            <p className="page-subtitle">Manage all business outlets</p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} />
            Add Outlet
          </button>
        </div>

        {/* Controls Section */}
        <div className="controls-section">
          <div className="search-filter-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search outlets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-container">
              <Filter size={16} />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Outlets</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="data-table-container">
          {filteredOutlets.length === 0 ? (
            <div className="empty-state">
              <Building2 size={48} />
              <h3>No outlets found</h3>
              <p>Create your first outlet to get started</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Contact</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Customers</th>
                  <th>Revenue</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOutlets.map((outlet) => (
                  <tr key={outlet.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 size={16} className="text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{outlet.name}</div>
                          <div className="text-sm text-gray-500">ID: {outlet.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {outlet.address || 'No address'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        {outlet.email && (
                          <div className="flex items-center gap-2">
                            <Mail size={14} className="text-gray-400" />
                            <span className="text-sm text-gray-600">{outlet.email}</span>
                          </div>
                        )}
                        {outlet.phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-gray-400" />
                            <span className="text-sm text-gray-600">{outlet.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {outlet.type || 'restaurant'}
                      </span>
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        outlet.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {outlet.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {outlet.customerCount || 0}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          ${outlet.totalRevenue || 0}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm text-gray-500">
                        {formatDate(outlet.createdAt)}
                      </span>
                    </td>
                    <td>
                      <div className="relative">
                        <button
                          className="p-1 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowActions(showActions === outlet.id ? null : outlet.id)}
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {showActions === outlet.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                            <div className="py-1">
                              <button
                                className="action-item"
                                onClick={() => {
                                  setShowActions(null);
                                  navigate(`/outlets/${outlet.id}?userId=${outlet.userId}`);
                                }}
                              >
                                <Eye size={16} />
                                View Details
                              </button>
                              <button
                                className="action-item"
                                onClick={() => {
                                  setShowActions(null);
                                  setEditOutlet(outlet);
                                  setShowEditModal(outlet);
                                }}
                              >
                                <Edit size={16} />
                                Edit
                              </button>
                              <button
                                className="action-item text-red-600"
                                onClick={() => {
                                  setShowActions(null);
                                  setShowDeleteModal(outlet.id);
                                }}
                              >
                                <Trash2 size={16} />
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal !== null}
        onClose={() => setShowDeleteModal(null)}
        title="Delete Outlet"
      >
        <p>Are you sure you want to delete this outlet? This action cannot be undone.</p>
        <div className="flex gap-3 mt-4">
          <button
            className="btn btn-secondary"
            onClick={() => setShowDeleteModal(null)}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={() => handleDelete(showDeleteModal!)}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal !== null}
        onClose={() => {
          setShowEditModal(null);
          setEditOutlet(null);
        }}
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
                onClick={() => {
                  setShowEditModal(null);
                  setEditOutlet(null);
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleEdit(editOutlet)}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Outlet"
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Name</label>
            <input
              type="text"
              value={newOutlet.name}
              onChange={(e) => setNewOutlet({ ...newOutlet, name: e.target.value })}
              className="form-input"
              placeholder="Enter outlet name"
            />
          </div>
          <div>
            <label className="form-label">Address</label>
            <input
              type="text"
              value={newOutlet.address}
              onChange={(e) => setNewOutlet({ ...newOutlet, address: e.target.value })}
              className="form-input"
              placeholder="Enter address"
            />
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input
              type="text"
              value={newOutlet.phone}
              onChange={(e) => setNewOutlet({ ...newOutlet, phone: e.target.value })}
              className="form-input"
              placeholder="Enter phone number"
            />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              value={newOutlet.email}
              onChange={(e) => setNewOutlet({ ...newOutlet, email: e.target.value })}
              className="form-input"
              placeholder="Enter email"
            />
          </div>
          <div>
            <label className="form-label">Type</label>
            <select
              value={newOutlet.type}
              onChange={(e) => setNewOutlet({ ...newOutlet, type: e.target.value })}
              className="form-input"
            >
              <option value="restaurant">Restaurant</option>
              <option value="cafe">Cafe</option>
              <option value="bar">Bar</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              className="btn btn-secondary"
              onClick={() => setShowAddModal(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={saving || !newOutlet.name}
            >
              {saving ? 'Adding...' : 'Add Outlet'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast && <Toast {...toast} />}
    </div>
  );
};

export default OutletsPage; 