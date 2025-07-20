import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDocs } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import Papa from 'papaparse';
import { type User } from 'firebase/auth';

interface CustomerData {
  id: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  phoneNumber?: string;
  phone?: string;
  points?: number;
  outletId?: string;
  dateJoined?: any;
  createdAt?: any;
  email?: string;
  lastVisitDate?: any;
  totalVisits?: number;
}

interface AdminDashboardProps {
  user: User;
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'csv' | 'outlets'>('users');
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  // Icons
  const UsersIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A2.98 2.98 0 0 0 17.14 7H16.5c-.8 0-1.54.37-2.01.99l-.49.71c-.81 1.17-2.13 1.98-3.61 2.23-.22-.91-.78-1.68-1.56-2.15A2.99 2.99 0 0 0 7 7H6.86c-1.31 0-2.43.83-2.82 2.02L1.5 16H4v6h2v-6h1.5l2-6H11v6h2v-6h1.5l2 6H18v6h2z"/>
    </svg>
  );

  const CSVIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
    </svg>
  );

  const StoreIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.36 9l.6 3H5.04l.6-3h12.72M20 4H4v2h16V4zm0 3H4l-1 5v2h1v6h10v-6h4v6h2v-6h1v-2l-1-5zM6 18v-4h6v4H6z"/>
    </svg>
  );

  const EditIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
    </svg>
  );

  const DeleteIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
  );

  const DownloadIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
    </svg>
  );

  const UploadIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
    </svg>
  );

  // Fetch customers and outlets
  useEffect(() => {
    const customersQuery = query(collection(firestore, `users/${user.uid}/web_customers`));
    const outletsQuery = query(collection(firestore, `users/${user.uid}/outlets`));

    const unsubscribeCustomers = onSnapshot(customersQuery, (snapshot) => {
      const customersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CustomerData[];
      setCustomers(customersList);
      setLoading(false);
    });

    const unsubscribeOutlets = onSnapshot(outletsQuery, (snapshot) => {
      const outletsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOutlets(outletsList);
    });

    return () => {
      unsubscribeCustomers();
      unsubscribeOutlets();
    };
  }, [user.uid]);

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    const name = customer.name || customer.fullName || customer.firstName || '';
    const phone = customer.phoneNumber || customer.phone || '';
    const email = customer.email || '';
    
    return name.toLowerCase().includes(searchLower) ||
           phone.includes(searchLower) ||
           email.toLowerCase().includes(searchLower);
  });

  // Toggle customer selection
  const toggleCustomerSelection = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  // Select all customers
  const selectAllCustomers = () => {
    setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedCustomers(new Set());
  };

  // Edit customer
  const handleEditCustomer = async (customer: CustomerData) => {
    if (!editingCustomer) return;
    
    try {
      const customerRef = doc(firestore, `users/${user.uid}/web_customers`, customer.id);
      await updateDoc(customerRef, {
        name: editingCustomer.name,
        phoneNumber: editingCustomer.phoneNumber,
        email: editingCustomer.email,
        points: editingCustomer.points || 0,
        outletId: editingCustomer.outletId
      });
      setEditingCustomer(null);
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  };

  // Delete customer(s)
  const handleDeleteCustomers = async (customerIds: string[]) => {
    if (!confirm(`Delete ${customerIds.length} customer(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      await Promise.all(
        customerIds.map(id => 
          deleteDoc(doc(firestore, `users/${user.uid}/web_customers`, id))
        )
      );
      setSelectedCustomers(new Set());
    } catch (error) {
      console.error('Error deleting customers:', error);
    }
  };

  // Export customers to CSV
  const exportToCSV = () => {
    const dataToExport = selectedCustomers.size > 0 
      ? customers.filter(c => selectedCustomers.has(c.id))
      : customers;

    const csvData = dataToExport.map(customer => ({
      Name: customer.name || customer.fullName || customer.firstName || '',
      Phone: customer.phoneNumber || customer.phone || '',
      Email: customer.email || '',
      Points: customer.points || 0,
      OutletId: customer.outletId || '',
      DateJoined: customer.dateJoined?.toDate?.()?.toISOString() || customer.createdAt?.toDate?.()?.toISOString() || '',
      TotalVisits: customer.totalVisits || 0
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rewin-customers-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle CSV file upload
  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setCsvData(results.data);
        console.log('📄 CSV Data Preview:', results.data.slice(0, 5));
      },
      error: (error) => {
        console.error('CSV Parse Error:', error);
      }
    });
  };

  // Import CSV data to Firestore
  const importCSVData = async () => {
    if (csvData.length === 0) return;

    setImportProgress({ current: 0, total: csvData.length });

    try {
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        
        // Skip empty rows
        if (!row.Name && !row.Phone && !row.Email) continue;

        const customerData = {
          name: row.Name || row.name || '',
          phoneNumber: row.Phone || row.phone || row.phoneNumber || '',
          email: row.Email || row.email || '',
          points: parseInt(row.Points || row.points || '0') || 0,
          outletId: row.OutletId || row.outletId || outlets[0]?.id || '',
          dateJoined: new Date(),
          createdAt: new Date(),
          totalVisits: parseInt(row.TotalVisits || row.totalVisits || '0') || 0,
          importedAt: new Date()
        };

        await addDoc(collection(firestore, `users/${user.uid}/web_customers`), customerData);
        setImportProgress({ current: i + 1, total: csvData.length });
      }

      setCsvData([]);
      setImportProgress(null);
      alert(`Successfully imported ${csvData.length} customers!`);
    } catch (error) {
      console.error('Error importing CSV:', error);
      setImportProgress(null);
    }
  };

  const tabButtonStyle = (isActive: boolean) => ({
    padding: '12px 24px',
    background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    fontSize: '14px',
    fontWeight: '500'
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      zIndex: 1000,
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(0,0,0,0.1)',
        padding: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div>
            <h1 style={{
              color: 'white',
              margin: 0,
              fontSize: '24px',
              fontWeight: '600'
            }}>
              👑 Admin Dashboard
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.8)',
              margin: '4px 0 0 0',
              fontSize: '14px'
            }}>
              User Management & Data Operations
            </p>
          </div>
          
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        background: 'rgba(0,0,0,0.1)',
        padding: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <button
            onClick={() => setActiveTab('users')}
            style={tabButtonStyle(activeTab === 'users')}
          >
            <UsersIcon />
            User Management
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            style={tabButtonStyle(activeTab === 'csv')}
          >
            <CSVIcon />
            CSV Operations
          </button>
          <button
            onClick={() => setActiveTab('outlets')}
            style={tabButtonStyle(activeTab === 'outlets')}
          >
            <StoreIcon />
            Outlet Management
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {activeTab === 'users' && (
          <UserManagementTab
            customers={filteredCustomers}
            outlets={outlets}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedCustomers={selectedCustomers}
            toggleCustomerSelection={toggleCustomerSelection}
            selectAllCustomers={selectAllCustomers}
            clearSelection={clearSelection}
            editingCustomer={editingCustomer}
            setEditingCustomer={setEditingCustomer}
            handleEditCustomer={handleEditCustomer}
            handleDeleteCustomers={handleDeleteCustomers}
            exportToCSV={exportToCSV}
            EditIcon={EditIcon}
            DeleteIcon={DeleteIcon}
            DownloadIcon={DownloadIcon}
          />
        )}

        {activeTab === 'csv' && (
          <CSVOperationsTab
            csvData={csvData}
            handleCSVUpload={handleCSVUpload}
            importCSVData={importCSVData}
            importProgress={importProgress}
            exportToCSV={exportToCSV}
            UploadIcon={UploadIcon}
            DownloadIcon={DownloadIcon}
          />
        )}

        {activeTab === 'outlets' && (
          <OutletManagementTab
            outlets={outlets}
            user={user}
          />
        )}
      </div>
    </div>
  );
};

// User Management Tab Component
const UserManagementTab: React.FC<any> = ({
  customers,
  outlets,
  searchTerm,
  setSearchTerm,
  selectedCustomers,
  toggleCustomerSelection,
  selectAllCustomers,
  clearSelection,
  editingCustomer,
  setEditingCustomer,
  handleEditCustomer,
  handleDeleteCustomers,
  exportToCSV,
  EditIcon,
  DeleteIcon,
  DownloadIcon
}) => (
  <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '24px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <h2 style={{ margin: 0, color: '#333', fontSize: '20px' }}>
        Customer Management ({customers.length} total)
      </h2>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={exportToCSV}
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px'
          }}
        >
          <DownloadIcon />
          Export Selected
        </button>
      </div>
    </div>

    {/* Search and Actions */}
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '20px',
      gap: '12px'
    }}>
      <input
        type="text"
        placeholder="Search customers..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          flex: 1,
          padding: '12px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          fontSize: '14px'
        }}
      />
      
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={selectAllCustomers}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Select All
        </button>
        <button
          onClick={clearSelection}
          style={{
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Clear
        </button>
        {selectedCustomers.size > 0 && (
          <button
            onClick={() => handleDeleteCustomers(Array.from(selectedCustomers))}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <DeleteIcon />
            Delete ({selectedCustomers.size})
          </button>
        )}
      </div>
    </div>

    {/* Customer Table */}
    <div style={{ 
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden',
      maxHeight: '500px',
      overflowY: 'auto'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
          <tr>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              <input
                type="checkbox"
                checked={selectedCustomers.size === customers.length && customers.length > 0}
                onChange={selectedCustomers.size === customers.length ? clearSelection : selectAllCustomers}
              />
            </th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Name</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Phone</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Points</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Outlet</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '12px' }}>
                <input
                  type="checkbox"
                  checked={selectedCustomers.has(customer.id)}
                  onChange={() => toggleCustomerSelection(customer.id)}
                />
              </td>
              <td style={{ padding: '12px' }}>
                {customer.name || customer.fullName || customer.firstName || 'No Name'}
              </td>
              <td style={{ padding: '12px' }}>
                {customer.phoneNumber || customer.phone || 'No Phone'}
              </td>
              <td style={{ padding: '12px', fontWeight: '600', color: '#10b981' }}>
                {customer.points || 0} pts
              </td>
              <td style={{ padding: '12px' }}>
                {outlets.find(o => o.id === customer.outletId)?.name || 'Unknown'}
              </td>
              <td style={{ padding: '12px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setEditingCustomer(customer)}
                    style={{
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={() => handleDeleteCustomers([customer.id])}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Edit Customer Modal */}
    {editingCustomer && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: '400px',
          maxWidth: '90vw'
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Edit Customer</h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#666', fontSize: '14px' }}>
              Name
            </label>
            <input
              type="text"
              value={editingCustomer.name || ''}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#666', fontSize: '14px' }}>
              Phone
            </label>
            <input
              type="text"
              value={editingCustomer.phoneNumber || ''}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, phoneNumber: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#666', fontSize: '14px' }}>
              Points
            </label>
            <input
              type="number"
              value={editingCustomer.points || 0}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, points: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setEditingCustomer(null)}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleEditCustomer(editingCustomer)}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);

// CSV Operations Tab Component
const CSVOperationsTab: React.FC<any> = ({
  csvData,
  handleCSVUpload,
  importCSVData,
  importProgress,
  exportToCSV,
  UploadIcon,
  DownloadIcon
}) => (
  <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '24px' }}>
    <h2 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '20px' }}>
      CSV Import/Export Operations
    </h2>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      {/* Import Section */}
      <div style={{
        border: '2px dashed #d1d5db',
        borderRadius: '12px',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <UploadIcon />
        </div>
        <h3 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '18px' }}>Import Customers</h3>
        <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '14px' }}>
          Upload a CSV file to import customers. Expected columns: Name, Phone, Email, Points, OutletId
        </p>
        
        <input
          type="file"
          accept=".csv"
          onChange={handleCSVUpload}
          style={{ marginBottom: '16px' }}
        />

        {csvData.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <p style={{ color: '#10b981', fontWeight: '600', margin: '0 0 12px 0' }}>
              ✅ {csvData.length} rows loaded
            </p>
            <button
              onClick={importCSVData}
              disabled={importProgress !== null}
              style={{
                background: importProgress ? '#6b7280' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                cursor: importProgress ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              {importProgress ? 
                `Importing... ${importProgress.current}/${importProgress.total}` :
                'Import to Database'
              }
            </button>
          </div>
        )}

        {importProgress && (
          <div style={{ marginTop: '16px' }}>
            <div style={{
              background: '#e5e7eb',
              borderRadius: '8px',
              height: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#10b981',
                height: '100%',
                width: `${(importProgress.current / importProgress.total) * 100}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Export Section */}
      <div style={{
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <DownloadIcon />
        </div>
        <h3 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '18px' }}>Export Customers</h3>
        <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '14px' }}>
          Download all customer data as CSV file for backup or migration purposes
        </p>
        
        <button
          onClick={exportToCSV}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '0 auto'
          }}
        >
          <DownloadIcon />
          Export All Data
        </button>
      </div>
    </div>

    {/* CSV Preview */}
    {csvData.length > 0 && (
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>CSV Preview (First 5 rows)</h3>
        <div style={{ 
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'auto',
          maxHeight: '300px'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                {Object.keys(csvData[0] || {}).map(key => (
                  <th key={key} style={{ 
                    padding: '12px', 
                    textAlign: 'left', 
                    borderBottom: '1px solid #e5e7eb',
                    fontWeight: '600'
                  }}>
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {csvData.slice(0, 5).map((row, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {Object.values(row).map((value: any, i) => (
                    <td key={i} style={{ padding: '12px' }}>
                      {String(value || '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
);

// Outlet Management Tab Component
const OutletManagementTab: React.FC<any> = ({ outlets, user }) => (
  <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '24px' }}>
    <h2 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '20px' }}>
      Outlet Management ({outlets.length} outlets)
    </h2>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
      {outlets.map(outlet => (
        <div key={outlet.id} style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          background: 'white'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '16px' }}>
            {outlet.name || 'Unnamed Outlet'}
          </h3>
          <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
            ID: {outlet.id}
          </p>
          {outlet.address && (
            <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
              📍 {outlet.address}
            </p>
          )}
          {outlet.phone && (
            <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
              📞 {outlet.phone}
            </p>
          )}
        </div>
      ))}
    </div>

    {outlets.length === 0 && (
      <div style={{
        textAlign: 'center',
        padding: '40px',
        color: '#666'
      }}>
        <p>No outlets found. Outlets will appear here once you add them to your system.</p>
      </div>
    )}
  </div>
);

export default AdminDashboard; 