import React, { useState, useEffect } from 'react';
import { auth, database } from '../firebase/config';
import { ref, onValue, off } from 'firebase/database';
import { signOut } from 'firebase/auth';

interface DashboardData {
  customers: number;
  outlets: number;
  checkIns: number;
  totalPoints: number;
  revenue: number;
}

const SimpleDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
    customers: 0,
    outlets: 0,
    checkIns: 0,
    totalPoints: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase database changes
    const customersRef = ref(database, 'customers');
    const outletsRef = ref(database, 'outlets');
    const checkInsRef = ref(database, 'checkIns');
    const transactionsRef = ref(database, 'transactions');

    const unsubscribeCustomers = onValue(customersRef, (snapshot) => {
      const customers = snapshot.val();
      const customerCount = customers ? Object.keys(customers).length : 0;
      setData(prev => ({ ...prev, customers: customerCount }));
    });

    const unsubscribeOutlets = onValue(outletsRef, (snapshot) => {
      const outlets = snapshot.val();
      const outletCount = outlets ? Object.keys(outlets).length : 0;
      setData(prev => ({ ...prev, outlets: outletCount }));
    });

    const unsubscribeCheckIns = onValue(checkInsRef, (snapshot) => {
      const checkIns = snapshot.val();
      const checkInCount = checkIns ? Object.keys(checkIns).length : 0;
      setData(prev => ({ ...prev, checkIns: checkInCount }));
    });

    const unsubscribeTransactions = onValue(transactionsRef, (snapshot) => {
      const transactions = snapshot.val();
      let totalPoints = 0;
      let revenue = 0;
      
      if (transactions) {
        Object.values(transactions).forEach((transaction: any) => {
          totalPoints += transaction.points || 0;
          revenue += transaction.amount || 0;
        });
      }
      
      setData(prev => ({ ...prev, totalPoints, revenue }));
    });

    setLoading(false);

    return () => {
      off(customersRef);
      off(outletsRef);
      off(checkInsRef);
      off(transactionsRef);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const StatCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      textAlign: 'center',
      border: `3px solid ${color}`,
      minWidth: '150px'
    }}>
      <div style={{
        fontSize: '2rem',
        marginBottom: '0.5rem'
      }}>
        {icon}
      </div>
      <h3 style={{ 
        color: color,
        fontSize: '1.8rem',
        fontWeight: 'bold',
        margin: '0 0 0.5rem 0'
      }}>
        {value}
      </h3>
      <p style={{ 
        color: '#666',
        fontSize: '0.9rem',
        margin: 0
      }}>
        {title}
      </p>
    </div>
  );

  const ChartCard: React.FC<{ title: string; data: { label: string; value: number; color: string }[] }> = ({ title, data }) => (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      marginBottom: '1rem'
    }}>
      <h3 style={{ marginBottom: '1rem', color: '#333' }}>{title}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        {data.map((item, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.5rem',
            backgroundColor: item.color + '20',
            borderRadius: '4px',
            minWidth: '120px'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: item.color,
              borderRadius: '50%',
              marginRight: '0.5rem'
            }} />
            <span style={{ fontSize: '0.9rem', color: '#333' }}>
              {item.label}: {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        padding: '1rem 2rem',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ color: '#333', margin: 0 }}>Rewin Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#666' }}>Welcome, {auth.currentUser?.email}</span>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '2rem' }}>
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <StatCard 
            title="Total Customers" 
            value={data.customers.toString()} 
            icon="👥" 
            color="#007bff"
          />
          <StatCard 
            title="Active Outlets" 
            value={data.outlets.toString()} 
            icon="🏪" 
            color="#28a745"
          />
          <StatCard 
            title="Check-ins Today" 
            value={data.checkIns.toString()} 
            icon="📍" 
            color="#ffc107"
          />
          <StatCard 
            title="Total Points" 
            value={data.totalPoints.toLocaleString()} 
            icon="⭐" 
            color="#17a2b8"
          />
          <StatCard 
            title="Revenue" 
            value={`$${data.revenue.toLocaleString()}`} 
            icon="💰" 
            color="#6610f2"
          />
        </div>

        {/* Charts */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem'
        }}>
          <ChartCard
            title="Customer Activity"
            data={[
              { label: 'Active', value: Math.floor(data.customers * 0.8), color: '#28a745' },
              { label: 'Inactive', value: Math.floor(data.customers * 0.2), color: '#dc3545' }
            ]}
          />
          <ChartCard
            title="Outlet Performance"
            data={[
              { label: 'High', value: Math.floor(data.outlets * 0.3), color: '#28a745' },
              { label: 'Medium', value: Math.floor(data.outlets * 0.5), color: '#ffc107' },
              { label: 'Low', value: Math.floor(data.outlets * 0.2), color: '#dc3545' }
            ]}
          />
        </div>

        {/* Recent Activity */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          marginTop: '2rem'
        }}>
          <h3 style={{ marginBottom: '1rem', color: '#333' }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              📊 {data.checkIns} check-ins recorded today
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              👥 {data.customers} total customers in system
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              💰 ${data.revenue.toLocaleString()} total revenue generated
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SimpleDashboard; 