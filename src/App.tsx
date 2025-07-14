import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { ref, onValue, off } from 'firebase/database';
import { auth, database } from './firebase/config';
import './App.css';

// Login Page Component
const LoginPage = ({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onLogin(email, password);
    } catch (error: any) {
      setError(error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#333', marginBottom: '0.5rem' }}>🎯 Rewin Dashboard</h1>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Sign in with your app credentials</p>
        </div>
        
        {error && (
          <div style={{
            backgroundColor: '#fee',
            color: '#c33',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your email"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <p style={{ color: '#666', fontSize: '0.8rem' }}>
            🔗 Connected to your Firebase database
          </p>
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = ({ user, onLogout }: { user: User; onLogout: () => void }) => {
  const [data, setData] = useState({
    customers: 0,
    outlets: 0,
    checkIns: 0,
    totalPoints: 0,
    revenue: 0,
    loading: true
  });

  useEffect(() => {
    // Listen to real Firebase database changes
    const customersRef = ref(database, 'customers');
    const outletsRef = ref(database, 'outlets');
    const checkInsRef = ref(database, 'checkIns');
    const transactionsRef = ref(database, 'transactions');
    const pointsRef = ref(database, 'points');

    // Listen for customers
    const unsubscribeCustomers = onValue(customersRef, (snapshot) => {
      const customers = snapshot.val();
      const customerCount = customers ? Object.keys(customers).length : 0;
      setData(prev => ({ ...prev, customers: customerCount }));
    }, (error) => {
      console.log('Customers data not available:', error.message);
      setData(prev => ({ ...prev, customers: 0 }));
    });

    // Listen for outlets
    const unsubscribeOutlets = onValue(outletsRef, (snapshot) => {
      const outlets = snapshot.val();
      const outletCount = outlets ? Object.keys(outlets).length : 0;
      setData(prev => ({ ...prev, outlets: outletCount }));
    }, (error) => {
      console.log('Outlets data not available:', error.message);
      setData(prev => ({ ...prev, outlets: 0 }));
    });

    // Listen for check-ins
    const unsubscribeCheckIns = onValue(checkInsRef, (snapshot) => {
      const checkIns = snapshot.val();
      const checkInCount = checkIns ? Object.keys(checkIns).length : 0;
      setData(prev => ({ ...prev, checkIns: checkInCount }));
    }, (error) => {
      console.log('Check-ins data not available:', error.message);
      setData(prev => ({ ...prev, checkIns: 0 }));
    });

    // Listen for transactions/revenue
    const unsubscribeTransactions = onValue(transactionsRef, (snapshot) => {
      const transactions = snapshot.val();
      let revenue = 0;
      
      if (transactions) {
        Object.values(transactions).forEach((transaction: any) => {
          revenue += transaction.amount || 0;
        });
      }
      
      setData(prev => ({ ...prev, revenue }));
    }, (error) => {
      console.log('Transactions data not available:', error.message);
      setData(prev => ({ ...prev, revenue: 0 }));
    });

    // Listen for total points
    const unsubscribePoints = onValue(pointsRef, (snapshot) => {
      const points = snapshot.val();
      let totalPoints = 0;
      
      if (points) {
        Object.values(points).forEach((point: any) => {
          totalPoints += point.amount || 0;
        });
      }
      
      setData(prev => ({ ...prev, totalPoints, loading: false }));
    }, (error) => {
      console.log('Points data not available:', error.message);
      setData(prev => ({ ...prev, totalPoints: 0, loading: false }));
    });

    // Cleanup listeners
    return () => {
      off(customersRef);
      off(outletsRef);
      off(checkInsRef);
      off(transactionsRef);
      off(pointsRef);
    };
  }, []);

  if (data.loading) {
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
          <p>Loading your data...</p>
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
        <h1 style={{ color: '#333', margin: 0 }}>🎯 Rewin Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#666' }}>Welcome, {user.email}</span>
          <button
            onClick={onLogout}
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

      {/* Live Stats from Your App */}
      <main style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ color: '#333', margin: 0 }}>📊 Live Data from Your App</h2>
          <p style={{ color: '#666', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>
            Real-time data from your Firebase database
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {[
            { title: 'Total Customers', value: data.customers, icon: '👥', color: '#007bff' },
            { title: 'Active Outlets', value: data.outlets, icon: '🏪', color: '#28a745' },
            { title: 'Total Check-ins', value: data.checkIns, icon: '📍', color: '#ffc107' },
            { title: 'Total Points', value: data.totalPoints.toLocaleString(), icon: '⭐', color: '#17a2b8' },
            { title: 'Revenue', value: `$${data.revenue.toLocaleString()}`, icon: '💰', color: '#6f42c1' }
          ].map((stat, index) => (
            <div key={index} style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
              border: `3px solid ${stat.color}`
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                {stat.icon}
              </div>
              <h3 style={{ 
                color: stat.color,
                fontSize: '1.8rem',
                fontWeight: 'bold',
                margin: '0 0 0.5rem 0'
              }}>
                {stat.value}
              </h3>
              <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
                {stat.title}
              </p>
            </div>
          ))}
        </div>

        {/* Real-time Activity */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ marginBottom: '1rem', color: '#333' }}>📈 Live Statistics</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: '#e3f2fd', borderRadius: '4px', borderLeft: '4px solid #2196f3' }}>
              👥 <strong>{data.customers}</strong> customers registered in your system
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#e8f5e8', borderRadius: '4px', borderLeft: '4px solid #4caf50' }}>
              🏪 <strong>{data.outlets}</strong> outlets currently active
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#fff3e0', borderRadius: '4px', borderLeft: '4px solid #ff9800' }}>
              📍 <strong>{data.checkIns}</strong> total check-ins recorded
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#f3e5f5', borderRadius: '4px', borderLeft: '4px solid #9c27b0' }}>
              ⭐ <strong>{data.totalPoints.toLocaleString()}</strong> loyalty points distributed
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#ede7f6', borderRadius: '4px', borderLeft: '4px solid #673ab7' }}>
              💰 <strong>${data.revenue.toLocaleString()}</strong> total revenue generated
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Main App Component
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleLogin = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

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
          <p>Connecting to Firebase...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        {/* OBVIOUS INDICATOR - NEW VERSION IS LOADING */}
        <div style={{
          backgroundColor: '#ff0000',
          color: 'white',
          padding: '10px',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '16px'
        }}>
          🚀 NEW VERSION WITH REAL AUTHENTICATION LOADED! 🚀
        </div>
        <LoginPage onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div>
      {/* OBVIOUS INDICATOR - NEW VERSION IS LOADING */}
      <div style={{
        backgroundColor: '#ff0000',
        color: 'white',
        padding: '10px',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '16px'
      }}>
        🚀 NEW VERSION WITH REAL AUTHENTICATION LOADED! 🚀
      </div>
      <Dashboard user={user} onLogout={handleLogout} />
    </div>
  );
}

export default App; 