import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Store, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  MapPin,
  Phone,
  Mail,
  Calendar,
  Users,
  DollarSign,
  Building2
} from 'lucide-react';
import { outletsAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

interface Outlet {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  ownerId: string;
  createdAt: string;
  customerCount: number;
  revenue: number;
}

const OutletsPage: React.FC = () => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOwner, setFilterOwner] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; onClose: () => void } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOutlets();
  }, []);

  const fetchOutlets = async () => {
    try {
      setLoading(true);
      const response = await outletsAPI.getAll();
      setOutlets(response);
    } catch (error) {
      console.error('Error fetching outlets:', error);
      setToast({ message: 'Error loading outlets', type: 'error', onClose: () => setToast(null) });
    } finally {
      setLoading(false);
    }
  };

  const handleViewOutlet = (outlet: Outlet) => {
    navigate(`/outlets/${outlet.id}`);
  };

  const handleEditOutlet = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    setShowEditModal(true);
  };

  const handleDeleteOutlet = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    setShowDeleteModal(true);
  };

  const handleAddOutlet = () => {
    setShowAddModal(true);
  };

  const filteredOutlets = outlets.filter(outlet => {
    const matchesSearch = outlet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         outlet.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterOwner === 'all' || outlet.ownerId === filterOwner;
    return matchesSearch && matchesFilter;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Outlets</h1>
          <p className="page-subtitle">Manage all business outlets and locations</p>
        </div>
        <button className="btn btn-primary" onClick={handleAddOutlet}>
          <Plus size={16} />
          Add Outlet
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div className="card">
        <div className="card-content">
          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
              <Search size={16} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255, 255, 255, 0.5)'
              }} />
              <input
                type="text"
                placeholder="Search outlets by name or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '40px' }}
              />
            </div>
            
            <select
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
              className="form-input"
              style={{ minWidth: '150px' }}
            >
              <option value="all">All Owners</option>
              {/* Add owner options dynamically */}
            </select>
          </div>
        </div>
      </div>

      {/* Outlets Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            Outlets ({filteredOutlets.length})
          </h2>
        </div>
        
        <div className="card-content">
          {filteredOutlets.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Outlet</th>
                    <th>Contact</th>
                    <th>Location</th>
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
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '1rem'
                          }}>
                            <Store size={20} />
                          </div>
                          <div>
                            <div style={{
                              color: 'white',
                              fontWeight: '500',
                              fontSize: '0.875rem'
                            }}>
                              {outlet.name}
                            </div>
                            <div style={{
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontSize: '0.75rem'
                            }}>
                              ID: {outlet.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem'
                        }}>
                          {outlet.email && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              <Mail size={12} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                              <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.75rem' }}>
                                {outlet.email}
                              </span>
                            </div>
                          )}
                          {outlet.phone && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              <Phone size={12} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                              <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.75rem' }}>
                                {outlet.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <MapPin size={14} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                          <span style={{ 
                            color: 'rgba(255, 255, 255, 0.9)', 
                            fontSize: '0.875rem',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {outlet.address}
                          </span>
                        </div>
                      </td>
                      
                      <td>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <Users size={14} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                          <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                            {outlet.customerCount}
                          </span>
                        </div>
                      </td>
                      
                      <td>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <DollarSign size={14} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                          <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                            {formatCurrency(outlet.revenue)}
                          </span>
                        </div>
                      </td>
                      
                      <td>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <Calendar size={14} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                          <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.875rem' }}>
                            {formatDate(outlet.createdAt)}
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
                            onClick={() => handleViewOutlet(outlet)}
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
                          
                          <button
                            onClick={() => handleEditOutlet(outlet)}
                            style={{
                              padding: '0.5rem',
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid rgba(34, 197, 94, 0.2)',
                              borderRadius: '8px',
                              color: '#22c55e',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
                            }}
                          >
                            <Edit size={16} />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteOutlet(outlet)}
                            style={{
                              padding: '0.5rem',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              borderRadius: '8px',
                              color: '#ef4444',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Store size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h3>No Outlets Found</h3>
              <p>No outlets match your current search criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Outlet"
        >
          <div style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            <p>Add outlet functionality will be implemented here.</p>
          </div>
        </Modal>
      )}

      {showEditModal && selectedOutlet && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Outlet"
        >
          <div style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            <p>Edit outlet functionality will be implemented here.</p>
            <p>Editing: {selectedOutlet.name}</p>
          </div>
        </Modal>
      )}

      {showDeleteModal && selectedOutlet && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Outlet"
        >
          <div style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            <p>Are you sure you want to delete this outlet?</p>
            <p><strong>{selectedOutlet.name}</strong></p>
            <p>This action cannot be undone.</p>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && <Toast {...toast} />}
    </div>
  );
};

export default OutletsPage; 