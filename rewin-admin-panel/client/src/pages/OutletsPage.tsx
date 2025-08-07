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
  userId: string;
  userEmail: string;
  userName: string;
  createdAt: string | number;
  customerCount?: number;
  totalRevenue?: number;
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
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
      setToast({ message: 'Error loading outlets', type: 'error' });
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
    const matchesFilter = filterOwner === 'all' || outlet.userId === filterOwner;
    return matchesSearch && matchesFilter;
  });

  // Group outlets by owner
  const groupedOutlets = filteredOutlets.reduce((groups, outlet) => {
    const ownerKey = outlet.userId;
    if (!groups[ownerKey]) {
      groups[ownerKey] = {
        owner: {
          userId: outlet.userId,
          userName: outlet.userName,
          userEmail: outlet.userEmail
        },
        outlets: []
      };
    }
    groups[ownerKey].outlets.push(outlet);
    return groups;
  }, {} as Record<string, { owner: { userId: string; userName: string; userEmail: string }; outlets: Outlet[] }>);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateInput: string | number) => {
    let date: Date;
    
    if (typeof dateInput === 'number') {
      // Handle timestamp
      date = new Date(dateInput);
    } else {
      // Handle string date
      date = new Date(dateInput);
    }
    
    return date.toLocaleDateString('en-US', {
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
          <p className="page-subtitle">
            Manage all business outlets and locations • {Object.keys(groupedOutlets).length} Account{Object.keys(groupedOutlets).length !== 1 ? 's' : ''} • {filteredOutlets.length} Outlet{filteredOutlets.length !== 1 ? 's' : ''}
          </p>
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
              {Array.from(new Set(outlets.map(outlet => outlet.userId))).map(userId => {
                const outlet = outlets.find(o => o.userId === userId);
                return (
                  <option key={userId} value={userId}>
                    {outlet?.userName || outlet?.userEmail || userId}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Outlets Grouped Display */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            Accounts ({Object.keys(groupedOutlets).length})
          </h2>
        </div>
        
        <div className="card-content">
          {Object.keys(groupedOutlets).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {Object.values(groupedOutlets).map((group, groupIndex) => (
                <div key={group.owner.userId} style={{
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}>
                  {/* Account Header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '1.2rem'
                      }}>
                        {group.owner.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '1.1rem'
                        }}>
                          {group.owner.userName}
                        </div>
                        <div style={{
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontSize: '0.875rem'
                        }}>
                          {group.owner.userEmail}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      {group.outlets.length} Outlet{group.outlets.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Outlets List */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '1rem'
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                      gap: '1rem'
                    }}>
                      {group.outlets.map((outlet) => (
                        <div key={outlet.id} style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          padding: '1rem',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                        onClick={() => handleViewOutlet(outlet)}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginBottom: '0.75rem'
                          }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: '600',
                              fontSize: '0.875rem'
                            }}>
                              <Store size={16} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                color: 'white',
                                fontWeight: '500',
                                fontSize: '0.875rem',
                                marginBottom: '0.25rem'
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

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '0.75rem',
                            marginBottom: '1rem'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              <Users size={14} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                              <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.75rem' }}>
                                {outlet.customerCount || 0} customers
                              </span>
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              <DollarSign size={14} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                              <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.75rem' }}>
                                {formatCurrency(outlet.totalRevenue || 0)}
                              </span>
                            </div>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '1rem'
                          }}>
                            <Calendar size={14} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                              Created {formatDate(outlet.createdAt)}
                            </span>
                          </div>

                          <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            justifyContent: 'flex-end'
                          }}>
                            <button
                              onClick={() => handleViewOutlet(outlet)}
                              style={{
                                padding: '0.5rem',
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                borderRadius: '6px',
                                color: '#3b82f6',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontSize: '0.75rem'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                              }}
                            >
                              <Eye size={14} />
                            </button>
                            
                            <button
                              onClick={() => handleEditOutlet(outlet)}
                              style={{
                                padding: '0.5rem',
                                background: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                borderRadius: '6px',
                                color: '#22c55e',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontSize: '0.75rem'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
                              }}
                            >
                              <Edit size={14} />
                            </button>
                            
                            <button
                              onClick={() => handleDeleteOutlet(outlet)}
                              style={{
                                padding: '0.5rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '6px',
                                color: '#ef4444',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontSize: '0.75rem'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              <Store size={64} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <h3 style={{ marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                No Outlets Found
              </h3>
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
              {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default OutletsPage; 