import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, firestore } from './firebase/config';
import './App.css';
import CampaignManager from './components/CampaignManager';
import SMSCampaignManager from './components/SMSCampaignManager';

import AdminDashboard from './components/AdminDashboard';

// Timezone utility functions
const convertToLocalDate = (firebaseTimestamp: any): Date => {
  if (!firebaseTimestamp) return new Date();
  
  // If it's a Firebase timestamp, convert it
  if (firebaseTimestamp.toDate) {
    return firebaseTimestamp.toDate();
  }
  
  // If it's already a Date object, return it
  if (firebaseTimestamp instanceof Date) {
    return firebaseTimestamp;
  }
  
  // If it's a string or number, create a new Date
  return new Date(firebaseTimestamp);
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

const isDateInRange = (date: Date, startDate: Date, endDate: Date): boolean => {
  // Compare dates in local timezone
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
  const localStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startDate.getHours(), startDate.getMinutes(), startDate.getSeconds());
  const localEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), endDate.getHours(), endDate.getMinutes(), endDate.getSeconds());
  
  return localDate >= localStartDate && localDate <= localEndDate;
};

// Modern SVG Icons as components
const AnalyticsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 3v18h18v-2H5V3H3zm16 4V5l-4 2-4-2-4 2v12l4-2 4 2 4-2z"/>
  </svg>
);

const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A2.98 2.98 0 0 0 17.14 7H16.5c-.8 0-1.54.37-2.01.99l-.49.71c-.81 1.17-2.13 1.98-3.61 2.23-.22-.91-.78-1.68-1.56-2.15A2.99 2.99 0 0 0 7 7H6.86c-1.31 0-2.43.83-2.82 2.02L1.5 16H4v6h2v-6h1.5l2-6H11v6h2v-6h1.5l2 6H18v6h2z"/>
  </svg>
);

const StoreIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.36 9l.6 3H5.04l.6-3h12.72M20 4H4v2h16V4zm0 3H4l-1 5v2h1v6h10v-6h4v6h2v-6h1v-2l-1-5zM6 18v-4h6v4H6z"/>
  </svg>
);

const RevenueIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
  </svg>
);

const SignupIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

// Login Page Component - Full Website Layout
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
      height: '100vh',
      width: '100vw',
      background: 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      margin: 0,
      padding: 0,
      overflow: 'hidden'
    }}>
      {/* Left Side - Rewin Branding */}
      <div style={{
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '4rem',
        color: 'white',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.2)',
          backdropFilter: 'blur(10px)'
        }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          {/* Rewin Logo */}
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2rem auto',
            boxShadow: '0 8px 32px rgba(255, 107, 107, 0.3)'
          }}>
            <span style={{ 
              fontSize: '2.5rem', 
              fontWeight: '900',
              color: 'white',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>R</span>
          </div>
          
          <h1 style={{ 
            fontSize: '4rem', 
            fontWeight: '900',
            margin: '0 0 1rem 0',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            letterSpacing: '-2px'
          }}>
            Rewin
          </h1>
          <p style={{ 
            fontSize: '1.4rem', 
            opacity: 0.9,
            margin: '0 0 3rem 0',
            maxWidth: '400px',
            fontWeight: '400'
          }}>
            Your comprehensive loyalty program management platform
          </p>
          
          {/* Modern Feature Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1.5rem',
            maxWidth: '400px'
          }}>
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              padding: '1.5rem',
              borderRadius: '16px',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ 
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '0.75rem',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <AnalyticsIcon />
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '500' }}>Analytics</div>
            </div>
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              padding: '1.5rem',
              borderRadius: '16px',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ 
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '0.75rem',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <UsersIcon />
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '500' }}>Customers</div>
            </div>
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              padding: '1.5rem',
              borderRadius: '16px',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ 
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '0.75rem',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <StoreIcon />
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '500' }}>Outlets</div>
            </div>
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              padding: '1.5rem',
              borderRadius: '16px',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ 
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '0.75rem',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <RevenueIcon />
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '500' }}>Revenue</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div style={{
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        position: 'relative'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '450px',
          padding: '3rem'
        }}>
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ 
              fontSize: '2.5rem', 
              fontWeight: '700',
              color: '#2d3748',
              margin: '0 0 0.5rem 0'
            }}>
              Welcome Back
            </h2>
            <p style={{ 
              color: '#718096', 
              fontSize: '1.1rem',
              margin: 0
            }}>
              Sign in to access your dashboard
            </p>
          </div>
          
          {error && (
            <div style={{
              backgroundColor: '#fed7d7',
              color: '#c53030',
              padding: '1rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              border: '1px solid #feb2b2'
            }}>
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '600', 
                color: '#2d3748',
                fontSize: '0.95rem'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  transition: 'border-color 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = '#667eea'}
                onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = '#e2e8f0'}
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '600', 
                color: '#2d3748',
                fontSize: '0.95rem'
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  transition: 'border-color 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = '#667eea'}
                onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = '#e2e8f0'}
                placeholder="Enter your password"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                background: loading ? '#a0aec0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.4)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  (e.target as HTMLButtonElement).style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.6)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                  (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                }
              }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
          
          <div style={{ 
            textAlign: 'center', 
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: '#f7fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <p style={{ color: '#718096', fontSize: '0.9rem', margin: 0 }}>
              🔐 Use the same credentials as your mobile app
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard Component - Full Website Layout  
const Dashboard = ({ user, onLogout }: { user: User; onLogout: () => void }) => {
  const [data, setData] = useState({
    customers: 0,
    outlets: 0,
    checkIns: 0,
    newSignupsToday: 0,
    totalPoints: 0,
    revenue: 0,
    loading: true
  });

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedOutlet, setSelectedOutlet] = useState('all');
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [previousPage, setPreviousPage] = useState<string>('customers');
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  
  // Time period filter states
  const [timePeriod, setTimePeriod] = useState('today'); // Show only today's data by default
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);

  // Admin functionality - only authorized emails
  const adminEmails = ['alnuaimi.humam@gmail.com', 'admin@rewin.com', 'humamal@rewin.com'];
  const isAuthorizedAdmin = adminEmails.includes(user?.email || '');

  // Admin system ready - no additional setup needed

  // Navigation handler for dashboard cards
  const handleCardClick = (page: string) => {
    setCurrentPage(page);
    setShowAdminDashboard(false); // Reset admin dashboard when navigating to other pages
    // Reset selected customer when navigating away from customer pages
    if (page !== 'customers') {
      setSelectedCustomer(null);
      setPreviousPage('customers'); // Reset to default when navigating away
    }
  };

  // Simple admin button for authorized users
  const headerButtons = (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <button
        onClick={onLogout}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: 'rgba(255,255,255,0.2)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '12px',
          cursor: 'pointer',
          fontWeight: '500',
          transition: 'all 0.2s',
          backdropFilter: 'blur(10px)'
        }}
      >
        Sign Out
      </button>
    </div>
  );

  // Add CSS animation for dropdown
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes dropdownFade {
        from {
          opacity: 0;
          transform: translateY(-10px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (dropdownOpen && !target.closest('[data-dropdown]')) {
        setDropdownOpen(false);
      }
      if (timeDropdownOpen && !target.closest('[data-time-dropdown="true"]')) {
        setTimeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, timeDropdownOpen]);

  useEffect(() => {
    // Listen to real Firebase Firestore changes
    console.log('🔍 === CONNECTING TO FIRESTORE ===');
    console.log('Project ID:', 'rewin-f4ca1');
    console.log('User ID:', user.uid);
    console.log('Selected Outlet:', selectedOutlet);
    console.log('Time Period:', timePeriod);
    console.log('🚀 useEffect triggered - data will be fetched for:', timePeriod);
    
    let unsubscribes: (() => void)[] = [];

    // Calculate date range based on timePeriod
    const getDateRange = () => {
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();

      switch (timePeriod) {
        case 'today':
          // Use local timezone for today's range
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
          endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
          break;
        case 'this_week':
          const thisWeekStart = new Date(now);
          thisWeekStart.setDate(now.getDate() - now.getDay());
          startDate = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate(), 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          break;
        case 'last_week':
          const lastWeekStart = new Date(now);
          lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
          const lastWeekEnd = new Date(lastWeekStart);
          lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
          startDate = new Date(lastWeekStart.getFullYear(), lastWeekStart.getMonth(), lastWeekStart.getDate(), 0, 0, 0, 0);
          endDate = new Date(lastWeekEnd.getFullYear(), lastWeekEnd.getMonth(), lastWeekEnd.getDate(), 23, 59, 59, 999);
          break;
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      }
      
      return { startDate, endDate };
    };

    const { startDate, endDate } = getDateRange();
    console.log(`📅 Date range for ${timePeriod}:`, startDate, 'to', endDate);
    console.log(`🌍 Local timezone:`, Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log(`🕐 Current local time:`, new Date().toISOString());
    console.log(`📅 Today's local date:`, new Date().toLocaleDateString());
    console.log(`🕐 Today's local time:`, new Date().toLocaleTimeString());

    // Listen for customers collection under user's path
    const customersQuery = query(collection(firestore, `users/${user.uid}/web_customers`));
    console.log('🔍 Setting up web_customers listener for user:', user.uid);
    console.log('🔍 Collection path:', `users/${user.uid}/web_customers`);
        
    const unsubscribeCustomers = onSnapshot(customersQuery, (snapshot) => {
      console.log('📊 Web customers snapshot received:', snapshot.docs.length, 'documents');
      // Create a Set to track unique phone numbers (deduplication)
      const uniquePhoneNumbers = new Set<string>();
      
      // Filter and deduplicate customers
      snapshot.docs.forEach(doc => {
        const customer = doc.data();
        const phone = customer.phoneNumber || customer.phone;
        
        // Skip customers without phone numbers
        if (!phone) return;
        
        // Check if customer matches the selected outlet
        let matchesOutlet = false;
        if (selectedOutlet === 'all') {
          matchesOutlet = true; // Include all customers for "All outlets"
        } else {
          // Count customers ONLY where this is their LAST VISITED outlet
          // This ensures each customer is counted in only ONE outlet
          const lastVisitedOutlet = customer.lastVisitOutletId === selectedOutlet;
          const isCurrentOutlet = customer.outletId === selectedOutlet;
          
          // If no lastVisitOutletId, fall back to outletId
          matchesOutlet = lastVisitedOutlet || (isCurrentOutlet && !customer.lastVisitOutletId);
        }
        
        // Add to unique set if matches outlet
        if (matchesOutlet) {
          uniquePhoneNumbers.add(phone);
        }
      });
      
      const customerCount = uniquePhoneNumbers.size;
      console.log(`✅ Customers data received (${selectedOutlet === 'all' ? 'All Outlets' : 'HOME Outlet: ' + selectedOutlet}):`, customerCount, 'UNIQUE customers');
      console.log('📍 Customer counting logic: HOME OUTLET ONLY (outletId field)');
      console.log('Total customer documents in DB:', snapshot.docs.length);
      console.log('Unique customers after deduplication:', customerCount);
      console.log('📞 Unique phone numbers:', Array.from(uniquePhoneNumbers).slice(0, 5), '...');
      
      // Debug web_customers integration
      console.log('🔍 WEB_CUSTOMERS INTEGRATION:');
      console.log('- Collection: web_customers ✅');
      console.log('- Multi-outlet support: visitedOutlets array ✅');
      
      if (snapshot.docs.length > 0) {
        const sampleCustomer = snapshot.docs[0].data();
        console.log('📱 Sample customer from mobile app:', {
          phone: sampleCustomer.phoneNumber || sampleCustomer.phone,
          visitedOutlets: sampleCustomer.visitedOutlets,
          totalPoints: sampleCustomer.totalPoints,
          lastVisitOutletId: sampleCustomer.lastVisitOutletId
        });
      } else {
        console.warn('⚠️ No customers found. Mobile app may still be populating web_customers collection.');
      }
      
      // Debug: Show outlet distribution
      if (selectedOutlet === 'all') {
        const outletDistribution: { [key: string]: number } = {};
        let customersWithoutOutlet = 0;
        
        snapshot.docs.forEach(doc => {
          const customer = doc.data();
          if (customer.outletId) {
            outletDistribution[customer.outletId] = (outletDistribution[customer.outletId] || 0) + 1;
          } else {
            customersWithoutOutlet++;
          }
        });
        
        console.log('📊 Customer distribution by HOME outlet (outletId):', outletDistribution);
        console.log('⚠️ Customers without outletId (no home outlet):', customersWithoutOutlet);
      }
      
      // Log some sample data
      if (snapshot.docs.length > 0) {
        console.log('Sample customer from collection:', snapshot.docs[0].data());
      }
      
      setData(prev => ({ ...prev, customers: customerCount }));
    }, (error) => {
      console.log('❌ Customers data not available:', error.message);
      console.log('🔍 Error details:', error);
      console.log('🔍 User authentication status:', user?.uid, user?.email);
      setData(prev => ({ ...prev, customers: 0 }));
    });
    unsubscribes.push(unsubscribeCustomers);

    // Listen for outlets collection under user's path
    const outletsQuery = query(collection(firestore, `users/${user.uid}/outlets`));
    const unsubscribeOutlets = onSnapshot(outletsQuery, (snapshot) => {
      const outletCount = snapshot.docs.length;
      const outletList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('✅ Outlets data received:', outletCount, 'documents');
      if (snapshot.docs.length > 0) {
        console.log('Sample outlet:', snapshot.docs[0].data());
        console.log('All outlets:', outletList);
        console.log('🔍 OUTLET ID MAPPING:');
        outletList.forEach((outlet: any) => {
          console.log(`  - ID: "${outlet.id}" → Name: "${outlet.name || outlet.outletName}"`);
        });
      }
      
      setData(prev => ({ ...prev, outlets: outletCount }));
      setOutlets(outletList);
    }, (error) => {
      console.log('❌ Outlets data not available:', error.message);
      setData(prev => ({ ...prev, outlets: 0 }));
      setOutlets([]);
    });
    unsubscribes.push(unsubscribeOutlets);

    // Calculate check-ins from customers who visited in the selected time period (using web_visits collection as per app team)
    const visitsQuery = query(collection(firestore, `users/${user.uid}/web_visits`));
    console.log('🔍 Setting up web_visits listener for user:', user.uid);
    console.log('🔍 Collection path:', `users/${user.uid}/web_visits`);
    
    const unsubscribeCheckIns = onSnapshot(visitsQuery, (snapshot) => {
      console.log('📊 Web visits snapshot received:', snapshot.docs.length, 'documents');
      console.log('📅 Date range filter:', startDate, 'to', endDate);
      console.log('🏪 Selected outlet filter:', selectedOutlet);
      
      let checkInCount = 0;
      let totalVisits = 0;
      let filteredByDate = 0;
      let filteredByOutlet = 0;
      
      snapshot.docs.forEach(doc => {
        const visit = doc.data();
        const visitDate = convertToLocalDate(visit.timestamp);
        totalVisits++;
        
        console.log('🔍 Visit data:', {
          customerId: visit.customerId,
          outletId: visit.outletId,
          timestamp: visit.timestamp,
          visitDate: visitDate,
          isInDateRange: isDateInRange(visitDate, startDate, endDate),
          matchesOutlet: selectedOutlet === 'all' || visit.outletId === selectedOutlet
        });
        
        if (isDateInRange(visitDate, startDate, endDate)) {
          filteredByDate++;
          // Filter by outlet if specific outlet is selected
          if (selectedOutlet === 'all' || visit.outletId === selectedOutlet) {
            filteredByOutlet++;
            // Count ALL visits, including multiple visits by same customer at different outlets
            checkInCount++;
            console.log('✅ Counted visit for customer:', visit.customerId, 'at outlet:', visit.outletId);
          }
        }
      });
      
      console.log(`📊 Check-ins filtering summary:`);
      console.log(`- Total visits in collection: ${totalVisits}`);
      console.log(`- Visits in date range: ${filteredByDate}`);
      console.log(`- Visits matching outlet filter: ${filteredByOutlet}`);
      console.log(`- Final check-in count: ${checkInCount}`);
      
      const uniqueCustomersInPeriod = new Set<string>();
      snapshot.docs.forEach(doc => {
        const visit = doc.data();
        const visitDate = visit.timestamp?.toDate();
        
        if (visitDate && visitDate >= startDate && visitDate <= endDate) {
          if (selectedOutlet === 'all' || visit.outletId === selectedOutlet) {
            uniqueCustomersInPeriod.add(visit.customerId);
          }
        }
      });
      
      console.log(`✅ Check-ins for ${timePeriod} calculated (${selectedOutlet === 'all' ? 'All Outlets' : 'Outlet: ' + selectedOutlet}):`, checkInCount, 'total visits');
      console.log('🔍 DEBUG: Unique customers in period:', uniqueCustomersInPeriod.size);
      console.log('📅 Date range:', startDate, 'to', endDate);
      
      setData(prev => ({ ...prev, checkIns: checkInCount }));
    }, (error) => {
      console.log('❌ Check-ins calculation failed:', error.message);
      console.log('🔍 Error details:', error);
      console.log('🔍 User authentication status:', user?.uid, user?.email);
      console.log('⚠️ Falling back to web_customers lastVisit method');
      
      // Fallback: Use customers collection if web_visits doesn't exist yet
      const fallbackUnsubscribe = onSnapshot(customersQuery, (customerSnapshot) => {
        let fallbackCheckInCount = 0;
        customerSnapshot.docs.forEach(doc => {
          const customer = doc.data();
          
          // Check if customer visited in the selected time period and matches outlet filter
          const visitDate = convertToLocalDate(customer.lastVisit);
          const visitedInPeriod = isDateInRange(visitDate, startDate, endDate);
          const matchesOutlet = selectedOutlet === 'all' || 
                               customer.lastVisitOutletId === selectedOutlet ||
                               customer.outletId === selectedOutlet ||
                               customer.visitedOutlets?.includes(selectedOutlet);
          
          if (visitedInPeriod && matchesOutlet) {
            fallbackCheckInCount++;
          }
        });
        
        console.log(`✅ Check-ins for ${timePeriod} (fallback) calculated:`, fallbackCheckInCount, 'customers');
        setData(prev => ({ ...prev, checkIns: fallbackCheckInCount }));
      });
      
      unsubscribes.push(fallbackUnsubscribe);
    });
    unsubscribes.push(unsubscribeCheckIns);

    // Calculate new signups for the selected time period from web_customers collection
    const unsubscribeNewSignups = onSnapshot(customersQuery, (snapshot) => {
      let newSignupsCount = 0;
      
      snapshot.docs.forEach(doc => {
        const customer = doc.data();
        const joinDate = convertToLocalDate(customer.dateJoined || customer.createdAt);
        
        if (isDateInRange(joinDate, startDate, endDate)) {
          // Filter by outlet if specific outlet is selected
          const matchesOutlet = selectedOutlet === 'all' || 
                               customer.registrationOutletId === selectedOutlet ||
                               customer.outletId === selectedOutlet ||
                               customer.visitedOutlets?.includes(selectedOutlet);
          
          if (matchesOutlet) {
            newSignupsCount++;
          }
        }
      });
      
      console.log(`✅ New signups for ${timePeriod} calculated (${selectedOutlet === 'all' ? 'All Outlets' : 'Outlet: ' + selectedOutlet}):`, newSignupsCount, 'new customers');
      
      setData(prev => ({ ...prev, newSignupsToday: newSignupsCount }));
    }, (error) => {
      console.log('❌ New signups calculation failed:', error.message);
      setData(prev => ({ ...prev, newSignupsToday: 0 }));
    });
    unsubscribes.push(unsubscribeNewSignups);

    // Listen for transactions collection under user's path (using web_transactions collection as per app team)
    const transactionsQuery = query(collection(firestore, `users/${user.uid}/web_transactions`));
    const customersForTransactionsQuery = query(collection(firestore, `users/${user.uid}/web_customers`));
    
    console.log('🔍 Setting up web_transactions listener for user:', user.uid);
    console.log('🔍 Collection path:', `users/${user.uid}/web_transactions`);
        
    const unsubscribeTransactions = onSnapshot(transactionsQuery, (transactionSnapshot) => {
        console.log('📊 Web transactions snapshot received:', transactionSnapshot.docs.length, 'documents');
        console.log('📅 Date range filter:', startDate, 'to', endDate);
        console.log('🏪 Selected outlet filter:', selectedOutlet);
        
        let totalPointsEarned = 0;
        let totalPointsRedeemed = 0;
        let filteredTransactions = transactionSnapshot.docs;
        let totalTransactions = 0;
        let filteredByDate = 0;
        let filteredByOutlet = 0;
        
      console.log(`🔍 WEB TRANSACTION FILTERING (${selectedOutlet === 'all' ? 'All Outlets' : 'Outlet: ' + selectedOutlet})`);
      console.log('Total web_transactions in DB:', transactionSnapshot.docs.length);
      
      // Filter transactions by outlet using the new transactionOutletId field
      if (selectedOutlet !== 'all') {
        filteredTransactions = transactionSnapshot.docs.filter(doc => {
          const transaction = doc.data();
          totalTransactions++;
          // Use the new transactionOutletId field directly - no more customer mapping needed!
          const matchesOutlet = transaction.transactionOutletId === selectedOutlet;
          if (matchesOutlet) filteredByOutlet++;
          return matchesOutlet;
        });
        
        console.log(`✅ Filtered transactions by outlet: ${filteredTransactions.length} / ${transactionSnapshot.docs.length}`);
      }
      
      // Debug: Show outlet distribution in transactions
        if (selectedOutlet === 'all') {
          const outletDistribution: { [key: string]: number } = {};
        let transactionsWithoutOutlet = 0;
          
          transactionSnapshot.docs.forEach(doc => {
            const transaction = doc.data();
          const outletId = transaction.transactionOutletId;
            
            if (outletId) {
              outletDistribution[outletId] = (outletDistribution[outletId] || 0) + 1;
            } else {
            transactionsWithoutOutlet++;
          }
        });
        
        console.log('📊 Transaction distribution by outlet (direct):', outletDistribution);
        console.log('⚠️ Transactions without outlet:', transactionsWithoutOutlet);
      }
              
        // Calculate points from filtered transactions FOR THE SELECTED TIME PERIOD
        filteredTransactions.forEach(doc => {
          const transaction = doc.data();
          const pointsChanged = transaction.pointsChanged || 0;
          const transactionType = transaction.transactionType || '';
          const isManualTransaction = transaction.isManualTransaction || false;
          const transactionDate = convertToLocalDate(transaction.timestamp);
          
          console.log('🔍 Transaction data:', {
            customerId: transaction.customerId,
            transactionOutletId: transaction.transactionOutletId,
            pointsChanged: pointsChanged,
            transactionType: transactionType,
            isManualTransaction: isManualTransaction,
            timestamp: transaction.timestamp,
            transactionDate: transactionDate,
            isInDateRange: isDateInRange(transactionDate, startDate, endDate),
            isEarned: transactionType.toUpperCase() === 'EARNED',
            isRedeemed: transactionType.toUpperCase() === 'REDEEMED'
          });
          
          // Only count transactions from the selected time period
          if (isDateInRange(transactionDate, startDate, endDate)) {
            filteredByDate++;
            // For EARNED transactions, only count manual ones
            if (transactionType.toUpperCase() === 'EARNED' && isManualTransaction && pointsChanged > 0) {
              totalPointsEarned += pointsChanged;
              console.log('✅ Counted earned points:', pointsChanged, 'for customer:', transaction.customerId);
            } else if (transactionType.toUpperCase() === 'REDEEMED' && pointsChanged < 0) {
              totalPointsRedeemed += Math.abs(pointsChanged);
              console.log('✅ Counted redeemed points:', Math.abs(pointsChanged), 'for customer:', transaction.customerId);
            }
          }
        });
        
        console.log(`📊 Points filtering summary:`);
        console.log(`- Total transactions in collection: ${transactionSnapshot.docs.length}`);
        console.log(`- Transactions matching outlet filter: ${filteredTransactions.length}`);
        console.log(`- Transactions in date range: ${filteredByDate}`);
        console.log(`- Points earned: ${totalPointsEarned}`);
        console.log(`- Points redeemed: ${totalPointsRedeemed}`);
        
        console.log(`✅ Transactions data received for ${timePeriod} (${selectedOutlet === 'all' ? 'All Outlets' : 'Outlet: ' + selectedOutlet}):`, filteredTransactions.length, '/', transactionSnapshot.docs.length, 'documents');
        console.log('💰 Points earned (manual only):', totalPointsEarned, 'Points redeemed:', totalPointsRedeemed);
        
        // Calculate revenue 
        const revenue = totalPointsEarned * 0.1; // Assuming 1 point = $0.10
        console.log(`💵 Calculated revenue for ${timePeriod}: $${revenue.toFixed(2)} (${totalPointsEarned} points * $0.10)`);
        
        setData(prev => ({ 
          ...prev, 
          revenue,
          totalPoints: totalPointsEarned,
          loading: false 
        }));
      
    }, (error) => {
      console.log('❌ Transactions data not available:', error.message);
      console.log('🔍 Error details:', error);
      console.log('🔍 User authentication status:', user?.uid, user?.email);
      setData(prev => ({ ...prev, revenue: 0, totalPoints: 0, loading: false }));
    });
    unsubscribes.push(unsubscribeTransactions);

    // Cleanup listeners on unmount
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [user.uid, selectedOutlet, timePeriod]); // Re-run when outlet selection or time period changes

  // Filter suggestions for different pages
  const FilterSuggestions = ({ page }: { page: string }) => {
    const filterOptions = {
      customers: {
        title: 'Customer Management & Filters',
        filters: [
          '🏢 Filter by Outlet',
          '📅 Date Joined (Today, This Week, This Month, Custom Range)',
          '🎯 Visit Count (New customers, Regular visitors, VIP customers)',
          '⭐ Points Range (0-100, 100-500, 500+ points)',
          '✅ Status (Active, Inactive, Processed, Unprocessed)',
          '🎂 Birthday Month (Send birthday rewards)',
          '📱 Phone Number Search',
          '📧 Email Domain Analysis',
          '📊 Customer Lifetime Value',
          '🔄 Recent Activity (Last visit, Last transaction)'
        ]
      },
      outlets: {
        title: 'Outlet Management & Analytics',
        filters: [
          '📈 Performance Metrics (Revenue, Customer count, Growth rate)',
          '🎯 Customer Distribution per Outlet',
          '⏰ Operating Hours & Peak Times',
          '💰 Revenue Comparison',
          '👥 Staff Performance per Outlet',
          '📍 Location Analytics',
          '🏆 Top Performing Outlets',
          '📊 Monthly/Quarterly Reports',
          '🔄 Customer Retention by Outlet',
          '⚠️ Low Performance Alerts'
        ]
      },
      analytics: {
        title: 'Advanced Analytics & Reports',
        filters: [
          '📊 Transaction Type Analysis (Earned vs Redeemed)',
          '📅 Time Period Comparison (Daily, Weekly, Monthly, Yearly)',
          '🎯 Points Program Effectiveness',
          '👥 Customer Segmentation (New, Regular, VIP, Churned)',
          '💰 Revenue Trends & Forecasting',
          '🔄 Customer Retention Rates',
          '⏰ Peak Hours Analysis',
          '🎁 Reward Redemption Patterns',
          '📱 SMS Campaign Performance (Twilio Integration)',
          '🏆 Outlet Performance Rankings'
        ]
      }
    };

    const currentFilters = filterOptions[page as keyof typeof filterOptions];
    if (!currentFilters) return null;

    return (
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: '2rem',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.2)',
        marginTop: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <h2 style={{ color: 'white', margin: 0, fontSize: '1.8rem' }}>{currentFilters.title}</h2>
          <button
            onClick={() => setCurrentPage('dashboard')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem'
        }}>
          {currentFilters.filters.map((filter, index) => (
            <div
              key={index}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                padding: '1rem',
                borderRadius: '12px',
                color: 'white',
                fontSize: '0.95rem',
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.1)';
              }}
            >
              {filter}
            </div>
          ))}
        </div>
        
        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          backgroundColor: 'rgba(255,107,107,0.2)',
          borderRadius: '12px',
          border: '1px solid rgba(255,107,107,0.3)'
        }}>
          <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>🚀 Coming Soon</h3>
          <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0, fontSize: '0.95rem' }}>
            These filtering options will be implemented as individual pages with full CRUD operations, 
            advanced search, export capabilities, and real-time updates. Each filter will provide 
            detailed insights and actionable data for your loyalty program management.
          </p>
        </div>
      </div>
    );
  };

  // Signups Details Page Component
  const SignupsDetailsPage = () => {
    const [signupsData, setSignupsData] = useState<{
      totalSignups: number;
      customers: any[];
      loading: boolean;
    }>({
      totalSignups: 0,
      customers: [],
      loading: true
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    const navigateDate = (direction: 'prev' | 'next') => {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
      setSelectedDate(newDate);
    };

    const goToToday = () => {
      setSelectedDate(new Date());
    };

    const isToday = (date: Date) => {
      const today = new Date();
      return date.toDateString() === today.toDateString();
    };

    const isFuture = (date: Date) => {
      const today = new Date();
      return date > today;
    };

    useEffect(() => {
      // Fetch signups data for selected date
      const fetchSignupsData = () => {
        const selectedStart = new Date(selectedDate);
        selectedStart.setHours(0, 0, 0, 0);
        const selectedEnd = new Date(selectedDate);
        selectedEnd.setHours(23, 59, 59, 999);

        console.log('🔍 Fetching signups data for:', formatDate(selectedDate));
        
                 const customersQuery = query(collection(firestore, `users/${user.uid}/web_customers`));
         const outletsQuery = query(collection(firestore, `users/${user.uid}/outlets`));
         
         const unsubscribe = onSnapshot(customersQuery, async (snapshot) => {
           let daySignups: any[] = [];
           let totalSignups = 0;

           // Get outlets data to match outlet names
           const outletsSnapshot = await new Promise<any>((resolve) => {
             const unsubscribeOutlets = onSnapshot(outletsQuery, (outletSnapshot) => {
               unsubscribeOutlets();
               resolve(outletSnapshot);
             });
           });

           // Create a map of outlet ID to outlet name
           const outletNameMap: { [key: string]: string } = {};
           outletsSnapshot.docs.forEach((doc: any) => {
             const outlet = doc.data();
             outletNameMap[doc.id] = outlet.name || outlet.outletName || `Outlet ${doc.id}`;
           });

           snapshot.docs.forEach(doc => {
             const customer = doc.data();
             const joinDate = customer.dateJoined?.toDate() || customer.createdAt?.toDate();
             
             if (joinDate && joinDate >= selectedStart && joinDate <= selectedEnd) {
               // Filter by outlet
               const matchesOutlet = selectedOutlet === 'all' || 
                                  customer.registrationOutletId === selectedOutlet ||
                                  customer.outletId === selectedOutlet ||
                                  customer.visitedOutlets?.includes(selectedOutlet);
               
               if (matchesOutlet) {
                 totalSignups++;
                 
                 const name = customer.name || customer.fullName || customer.firstName;
                 const phone = customer.phoneNumber || customer.phone;
                 const outletId = customer.registrationOutletId || customer.outletId;
                 const outletName = outletNameMap[outletId] || 'Unknown Outlet';
                 
                 daySignups.push({
                   id: doc.id,
                   ...customer,
                   joinDate: joinDate,
                   displayName: name && name.trim() !== '' ? name : (phone || 'Unknown'),
                   outletDisplayName: outletName,
                   searchableText: `${name || ''} ${phone || ''}`.toLowerCase()
                 });
               }
             }
           });

           // Sort signups by join date (newest first)
           daySignups.sort((a, b) => b.joinDate - a.joinDate);

           setSignupsData({
             totalSignups,
             customers: daySignups,
             loading: false
           });
           
           // Filter customers based on search term
           if (!searchTerm.trim()) {
             setFilteredCustomers(daySignups);
           } else {
             const filtered = daySignups.filter(customer =>
               customer.searchableText.includes(searchTerm.toLowerCase())
             );
             setFilteredCustomers(filtered);
           }
         });

        return unsubscribe;
      };

      const unsubscribe = fetchSignupsData();
      return unsubscribe;
    }, [selectedDate, selectedOutlet, user.uid]);

    // Filter customers based on search term
    useEffect(() => {
      if (!searchTerm.trim()) {
        setFilteredCustomers(signupsData.customers);
      } else {
        const filtered = signupsData.customers.filter(customer =>
          customer.searchableText?.includes(searchTerm.toLowerCase())
        );
        setFilteredCustomers(filtered);
      }
    }, [searchTerm, signupsData.customers]);



    return (
      <div style={{
        minHeight: '100vh',
        width: '100%',
        background: 'transparent',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        margin: 0,
        padding: 0,
        overflowX: 'hidden',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <header style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 100%)',
          color: 'white',
          padding: '1rem 2rem',
          boxShadow: '0 2px 20px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(10px)',
          zIndex: 100
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => setCurrentPage('dashboard')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                ← Back to Dashboard
              </button>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
              }}>
                <SignupIcon />
              </div>
                             <div>
                 <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>New Signups</h1>
                 <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
                   {selectedOutlet === 'all' ? 'All outlets' : `Outlet: ${outlets.find(outlet => outlet.id === selectedOutlet)?.name || outlets.find(outlet => outlet.id === selectedOutlet)?.outletName || selectedOutlet}`}
                 </p>
               </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search customers by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '300px',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    outline: 'none',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.5)';
                    (e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.15)';
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.3)';
                    (e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.1)';
                  }}
                />
                <div style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255,255,255,0.7)',
                  pointerEvents: 'none'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                </div>
              </div>
              {headerButtons}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ 
          flex: 1,
          padding: '2rem',
          maxWidth: '1400px', 
          margin: '0 auto',
          width: '100%'
        }}>
          {/* Date Navigation */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '1.5rem',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <button
                onClick={() => navigateDate('prev')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                ← Previous Day
              </button>
              
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem' }}>
                  {formatDate(selectedDate)}
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                  {isToday(selectedDate) ? 'Today' : `${Math.abs(Math.floor((new Date().getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24)))} days ago`}
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                {!isToday(selectedDate) && (
                  <button
                    onClick={goToToday}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'rgba(255,107,107,0.3)',
                      color: 'white',
                      border: '1px solid rgba(255,107,107,0.5)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Today
                  </button>
                )}
                <button
                  onClick={() => navigateDate('next')}
                  disabled={isFuture(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: isFuture(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)) 
                      ? 'rgba(255,255,255,0.1)' 
                      : 'rgba(255,255,255,0.2)',
                    color: isFuture(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)) 
                      ? 'rgba(255,255,255,0.5)' 
                      : 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '12px',
                    cursor: isFuture(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)) 
                      ? 'not-allowed' 
                      : 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  Next Day →
                </button>
              </div>
            </div>
          </div>

          {/* Signups Summary */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2rem',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '2rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>New Signups</h3>
                <p style={{ fontSize: '3rem', fontWeight: '900', margin: 0, color: 'white' }}>
                  {signupsData.totalSignups.toLocaleString()}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                  New customers
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Growth Rate</h3>
                <p style={{ fontSize: '3rem', fontWeight: '900', margin: 0, color: 'white' }}>
                  {signupsData.totalSignups > 0 ? '+' : ''}{signupsData.totalSignups}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                  Daily increase
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Customer Base</h3>
                <p style={{ fontSize: '3rem', fontWeight: '900', margin: 0, color: 'white' }}>
                  {data.customers.toLocaleString()}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                  Total customers
                </p>
              </div>
            </div>
          </div>

          {/* Customer List */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2rem',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 1.5rem 0', fontSize: '1.4rem' }}>
              Customer Details
              {searchTerm && (
                <span style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: '400', 
                  color: 'rgba(255,255,255,0.7)' 
                }}>
                  {' '}• Searching for "{searchTerm}" ({filteredCustomers.length} results)
                </span>
              )}
            </h3>
            
            {signupsData.loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid rgba(255,255,255,0.3)',
                  borderTop: '4px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem'
                }} />
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>Loading new signups...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '1.1rem' }}>
                  {searchTerm ? `No customers found matching "${searchTerm}"` : `No new signups found for ${formatDate(selectedDate)}`}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      marginTop: '1rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredCustomers.map((customer, index) => (
                  <div key={customer.id} style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    // Create proper customer object for navigation
                    const customerForNavigation = {
                      id: customer.id,
                      name: customer.displayName,
                      phoneNumber: customer.phoneNumber || customer.phone,
                      displayName: customer.displayName
                    };
                    setSelectedCustomer(customerForNavigation);
                    setPreviousPage('signups'); // Track that we came from signups page
                    setCurrentPage('customers');
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.2)';
                    (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                    (e.target as HTMLElement).style.transform = 'translateY(0)';
                  }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1.1rem', cursor: 'pointer' }}>
                          {customer.displayName}
                        </h4>
                        <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
                          {customer.joinDate.toLocaleString()}
                        </p>
                                                 <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '0.8rem' }}>
                           Phone: {customer.phoneNumber || customer.phone || 'Not provided'} • 
                           Outlet: {customer.outletDisplayName}
                         </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ 
                          color: '#4ade80',
                          margin: 0,
                          fontSize: '1.2rem',
                          fontWeight: '600'
                        }}>
                          NEW
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
                          customer
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0.5rem 0 0 0', fontSize: '0.7rem' }}>
                          Click for transactions →
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  };

  // Points Details Page Component
  const PointsDetailsPage = () => {
    const [pointsData, setPointsData] = useState<{
      totalPoints: number;
      transactions: any[];
      loading: boolean;
    }>({
      totalPoints: 0,
      transactions: [],
      loading: true
    });

    const [outletName, setOutletName] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    const navigateDate = (direction: 'prev' | 'next') => {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
      setSelectedDate(newDate);
    };

    const goToToday = () => {
      setSelectedDate(new Date());
    };

    const isToday = (date: Date) => {
      const today = new Date();
      return date.toDateString() === today.toDateString();
    };

    const isFuture = (date: Date) => {
      const today = new Date();
      return date > today;
    };

    // Calendar navigation functions
    const navigateCalendar = (direction: 'prev' | 'next') => {
      const newDate = new Date(selectedDate);
      newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
      setSelectedDate(newDate);
    };

    // Get date range for current time period
    const getCurrentDateRange = () => {
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();

      switch (timePeriod) {
        case 'today':
          // Use selectedDate for 'today' mode (can be any specific date)
          startDate = new Date(selectedDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(selectedDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          startDate = new Date(yesterday);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(yesterday);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'this_week':
          const thisWeekStart = new Date(now);
          thisWeekStart.setDate(now.getDate() - now.getDay());
          startDate = new Date(thisWeekStart);
          startDate.setHours(0, 0, 0, 0);
          const thisWeekEnd = new Date(thisWeekStart);
          thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
          endDate = new Date(thisWeekEnd);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'last_week':
          const lastWeekStart = new Date(now);
          lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
          const lastWeekEnd = new Date(lastWeekStart);
          lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
          startDate = new Date(lastWeekStart);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(lastWeekEnd);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        default:
          startDate = new Date(selectedDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(selectedDate);
          endDate.setHours(23, 59, 59, 999);
      }
      
      return { startDate, endDate };
    };

    // Check if a date is in the selected range
    const isDateInSelectedRange = (date: Date) => {
      const { startDate, endDate } = getCurrentDateRange();
      const checkDate = new Date(date);
      checkDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
      return checkDate >= startDate && checkDate <= endDate;
    };

    useEffect(() => {
      if (!user?.uid) return;

      console.log('🔍 Fetching points data for time period:', timePeriod);
      console.log('📅 Selected date:', selectedDate.toLocaleDateString());
      const { startDate, endDate } = getCurrentDateRange();
      console.log('📅 Date range:', startDate.toLocaleDateString(), 'to', endDate.toLocaleDateString());
      
      setPointsData(prev => ({ ...prev, loading: true }));
      
      const transactionsQuery = query(collection(firestore, `users/${user.uid}/web_transactions`));
      const customersQuery = query(collection(firestore, `users/${user.uid}/web_customers`));
      
      // Set up customers listener first
      const unsubscribeCustomers = onSnapshot(customersQuery, (customersSnapshot) => {
        // Create a map of customer ID to display name (name or phone)
        const customerDisplayMap: { [key: string]: string } = {};
        customersSnapshot.docs.forEach((doc: any) => {
          const customer = doc.data();
          const name = customer.name || customer.fullName || customer.firstName;
          const phone = customer.phoneNumber || customer.phone;
          
          // Prioritize name over phone number
          if (name && name.trim() !== '') {
            customerDisplayMap[doc.id] = name;
          } else if (phone) {
            customerDisplayMap[doc.id] = phone;
          } else {
            customerDisplayMap[doc.id] = 'Unknown';
          }
        });

        // Now set up transactions listener with customer data
        const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
          let dayTransactions: any[] = [];
          let totalPoints = 0;

          snapshot.docs.forEach(doc => {
            const transaction = doc.data();
            const transactionDate = transaction.timestamp?.toDate();
            
            if (transactionDate && transactionDate >= startDate && transactionDate <= endDate) {
              // Filter by outlet
              const matchesOutlet = selectedOutlet === 'all' || transaction.transactionOutletId === selectedOutlet;
              
              if (matchesOutlet) {
                const pointsChanged = transaction.pointsChanged || 0;
                const transactionType = transaction.transactionType || '';
                const isManualTransaction = transaction.isManualTransaction || false;
                
                // Only count manual earned points
                if (transactionType.toUpperCase() === 'EARNED' && isManualTransaction && pointsChanged > 0) {
                  totalPoints += pointsChanged;
                }
                
                dayTransactions.push({
                  id: doc.id,
                  ...transaction,
                  timestamp: transactionDate,
                  customerDisplay: customerDisplayMap[transaction.customerId] || 'Unknown'
                });
              }
            }
          });

          // Sort transactions by timestamp (newest first)
          dayTransactions.sort((a, b) => b.timestamp - a.timestamp);

          setPointsData({
            totalPoints,
            transactions: dayTransactions,
            loading: false
          });
        });

        return unsubscribeTransactions;
      });

      return () => {
        unsubscribeCustomers();
      };
    }, [timePeriod, selectedDate, selectedOutlet, user.uid]);

    // Separate useEffect for outlet name to avoid infinite loops
    useEffect(() => {
      if (!user?.uid || selectedOutlet === 'all') {
        setOutletName('');
        return;
      }

      const outletsQuery = query(collection(firestore, `users/${user.uid}/outlets`));
      const unsubscribeOutlets = onSnapshot(outletsQuery, (outletSnapshot) => {
        const outlet = outletSnapshot.docs.find((doc: any) => doc.id === selectedOutlet);
        if (outlet) {
          const outletData = outlet.data();
          setOutletName(outletData.name || outletData.outletName || selectedOutlet);
        } else {
          setOutletName(selectedOutlet);
        }
      });

      return () => unsubscribeOutlets();
    }, [selectedOutlet, user.uid]);

    return (
      <div style={{
        minHeight: '100vh',
        width: '100%',
        background: 'transparent',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        margin: 0,
        padding: 0,
        overflowX: 'hidden',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <header style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 100%)',
          color: 'white',
          padding: '1rem 2rem',
          boxShadow: '0 2px 20px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(10px)',
          zIndex: 100
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => setCurrentPage('dashboard')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                ← Back to Dashboard
              </button>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
                             <div>
                 <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>Points History</h1>
                 <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
                   {selectedOutlet === 'all' ? 'All outlets' : `Outlet: ${outlets.find(outlet => outlet.id === selectedOutlet)?.name || outlets.find(outlet => outlet.id === selectedOutlet)?.outletName || selectedOutlet}`}
                 </p>
               </div>
            </div>
            <button
              onClick={onLogout}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)'
              }}
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ 
          flex: 1,
          padding: '2rem',
          maxWidth: '1400px', 
          margin: '0 auto',
          width: '100%'
        }}>
          {/* Date Navigation */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '1.5rem',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <button
                onClick={() => navigateDate('prev')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                ← Previous Day
              </button>
              
                            <div style={{ textAlign: 'center', position: 'relative' }}>
                <button
                  onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
                  data-time-dropdown
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'center',
                    padding: '0.5rem 1rem',
                    borderRadius: '12px',
                    transition: 'all 0.2s',
                    backgroundColor: timeDropdownOpen ? 'rgba(255,255,255,0.1)' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!timeDropdownOpen) {
                      (e.target as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!timeDropdownOpen) {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    {formatDate(selectedDate)}
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                      style={{ 
                        transform: timeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        opacity: 0.7
                      }}
                    >
                      <path d="M7 10l5 5 5-5z"/>
                    </svg>
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                    {timePeriod === 'today' ? 'Today' : 
                     timePeriod === 'yesterday' ? 'Yesterday' :
                     timePeriod === 'this_week' ? 'This Week' :
                     timePeriod === 'last_week' ? 'Last Week' :
                     timePeriod === 'this_month' ? 'This Month' :
                     timePeriod === 'last_month' ? 'Last Month' :
                     isToday(selectedDate) ? 'Today' : `${Math.abs(Math.floor((new Date().getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24)))} days ago`}
                  </p>
                </button>
                

              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                {!isToday(selectedDate) && (
                  <button
                    onClick={goToToday}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'rgba(255,107,107,0.3)',
                      color: 'white',
                      border: '1px solid rgba(255,107,107,0.5)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Today
                  </button>
                )}
                <button
                  onClick={() => navigateDate('next')}
                  disabled={isFuture(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: isFuture(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)) 
                      ? 'rgba(255,255,255,0.1)' 
                      : 'rgba(255,255,255,0.2)',
                    color: isFuture(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)) 
                      ? 'rgba(255,255,255,0.5)' 
                      : 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '12px',
                    cursor: isFuture(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)) 
                      ? 'not-allowed' 
                      : 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  Next Day →
                </button>
              </div>
            </div>
          </div>

          {/* Points Summary */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2rem',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '2rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Points Earned</h3>
                <p style={{ fontSize: '3rem', fontWeight: '900', margin: 0, color: 'white' }}>
                  {pointsData.totalPoints.toLocaleString()}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                  Manual points only
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Revenue Generated</h3>
                <p style={{ fontSize: '3rem', fontWeight: '900', margin: 0, color: 'white' }}>
                  ${(pointsData.totalPoints * 0.1).toFixed(2)}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                  @ $0.10 per point
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Transactions</h3>
                <p style={{ fontSize: '3rem', fontWeight: '900', margin: 0, color: 'white' }}>
                  {pointsData.transactions.length}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                  Total transactions
                </p>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2rem',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 1.5rem 0', fontSize: '1.4rem' }}>Transaction Details</h3>
            
            {pointsData.loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid rgba(255,255,255,0.3)',
                  borderTop: '4px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem'
                }} />
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>Loading transactions...</p>
              </div>
            ) : pointsData.transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '1.1rem' }}>
                  No transactions found for {formatDate(selectedDate)}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pointsData.transactions.map((transaction, index) => (
                  <div 
                    key={transaction.id} 
                    onClick={() => {
                      // Create customer object for navigation
                      const customer = {
                        id: transaction.customerId,
                        name: transaction.customerDisplay,
                        phoneNumber: transaction.customerPhone,
                        displayName: transaction.customerDisplay
                      };
                      setSelectedCustomer(customer);
                      setPreviousPage('points'); // Track that we came from points page
                      setCurrentPage('customers');
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      padding: '1.5rem',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).closest('div')!.style.background = 'rgba(255,255,255,0.2)';
                      (e.target as HTMLElement).closest('div')!.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).closest('div')!.style.background = 'rgba(255,255,255,0.1)';
                      (e.target as HTMLElement).closest('div')!.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}>
                                             <div style={{ flex: 1 }}>
                         <h4 style={{ 
                           color: 'white', 
                           margin: '0 0 0.5rem 0', 
                           fontSize: '1.1rem',
                           textDecoration: 'underline',
                           userSelect: 'none',
                           WebkitUserSelect: 'none',
                           MozUserSelect: 'none',
                           msUserSelect: 'none'
                         }}>
                           {transaction.customerDisplay}
                         </h4>
                         <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
                           {transaction.timestamp.toLocaleString()}
                         </p>
                         <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '0.8rem' }}>
                           {transaction.transactionType} • {transaction.isManualTransaction ? 'Manual' : 'Automatic'}
                         </p>
                         <p style={{ 
                           color: 'rgba(255,255,255,0.6)', 
                           margin: '0.25rem 0 0 0', 
                           fontSize: '0.75rem',
                           fontStyle: 'italic' 
                         }}>
                           Click for full transaction history →
                         </p>
                       </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ 
                          color: transaction.pointsChanged > 0 ? '#4ade80' : '#f87171',
                          margin: 0,
                          fontSize: '1.2rem',
                          fontWeight: '600'
                        }}>
                          {transaction.pointsChanged > 0 ? '+' : ''}{transaction.pointsChanged}
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
                          points
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Time Period Modal - Two Panel Design */}
        {timeDropdownOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(10px)',
              zIndex: 999999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'fadeIn 0.3s ease-out',
              padding: '2rem'
            }}
            onClick={(e) => {
              // Only close if clicking directly on the backdrop, not on child elements
              if (e.target === e.currentTarget) {
                console.log('🔒 Modal backdrop clicked - closing time period selector');
                setTimeDropdownOpen(false);
              }
            }}
          >
            {/* Modal Content */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(20,24,45,0.6)',
                borderRadius: '24px',
                padding: '0',
                width: '800px',
                maxWidth: '90vw',
                height: '500px',
                maxHeight: '80vh',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                position: 'relative',
                animation: 'slideIn 0.3s ease-out',
                display: 'flex',
                overflow: 'hidden'
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setTimeDropdownOpen(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  zIndex: 10
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                ×
              </button>

              {/* Left Panel - Time Period Options */}
              <div
                style={{
                  flex: '0 0 300px',
                  padding: '2rem',
                  borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.05)'
                }}
              >
                <h3
                  style={{
                    color: 'white',
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    marginBottom: '1.5rem',
                    textAlign: 'left'
                  }}
                >
                  Time Periods
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { value: 'today', label: 'Today' },
                    { value: 'yesterday', label: 'Yesterday' },
                    { value: 'this_week', label: 'This Week' },
                    { value: 'last_week', label: 'Last Week' },
                    { value: 'this_month', label: 'This Month' },
                    { value: 'last_month', label: 'Last Month' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🎯 TIME PERIOD SELECTED:', option.value);
                        console.log('🔄 Changing timePeriod from:', timePeriod, 'to:', option.value);
                        setTimePeriod(option.value);
                        
                        // Reset selected date to today when switching to non-specific date periods
                        if (option.value !== 'today') {
                          setSelectedDate(new Date());
                          console.log('📅 Reset selectedDate to today for period:', option.value);
                        }
                        
                        setTimeDropdownOpen(false);
                        console.log('✅ Time period updated and modal closed');
                      }}
                      style={{
                        background: timePeriod === option.value 
                          ? 'rgba(255, 255, 255, 0.3)' 
                          : 'transparent',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '1rem 1.5rem',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: timePeriod === option.value ? '600' : '400',
                        transition: 'all 0.2s ease',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                      onMouseEnter={(e) => {
                        if (timePeriod !== option.value) {
                          (e.target as HTMLElement).style.background = 'rgba(255, 255, 255, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (timePeriod !== option.value) {
                          (e.target as HTMLElement).style.background = 'transparent';
                        }
                      }}
                    >
                      <span>{option.label}</span>
                      {timePeriod === option.value && (
                        <span style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.9)' }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Panel - Calendar */}
              <div
                style={{
                  flex: 1,
                  padding: '2rem',
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#333'
                }}
              >
                <h3
                  style={{
                    color: '#333',
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    marginBottom: '1.5rem',
                    textAlign: 'center'
                  }}
                >
                  {(() => {
                    const now = new Date();
                    switch (timePeriod) {
                      case 'today':
                        return `Today - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                      case 'yesterday':
                        const yesterday = new Date(now);
                        yesterday.setDate(now.getDate() - 1);
                        return `Yesterday - ${yesterday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                      case 'this_week':
                        const weekStart = new Date(now);
                        weekStart.setDate(now.getDate() - now.getDay());
                        const weekEnd = new Date(weekStart);
                        weekEnd.setDate(weekStart.getDate() + 6);
                        return `This Week - ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                      case 'last_week':
                        const lastWeekStart = new Date(now);
                        lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
                        const lastWeekEnd = new Date(lastWeekStart);
                        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
                        return `Last Week - ${lastWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${lastWeekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                      case 'this_month':
                        return `This Month - ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
                      case 'last_month':
                        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        return `Last Month - ${lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
                      default:
                        return 'Selected Period';
                    }
                  })()}
                </h3>

                

                 {/* Calendar Preview */}
                 <div
                   style={{
                     display: 'flex',
                     flexDirection: 'column',
                     alignItems: 'center',
                     gap: '1rem'
                   }}
                 >
                                     {/* Month/Year Navigation */}
                   <div
                     style={{
                       display: 'flex',
                       alignItems: 'center',
                       gap: '1rem',
                       marginBottom: '1rem'
                     }}
                   >
                     <button
                       onClick={() => navigateCalendar('prev')}
                       style={{
                         background: 'none',
                         border: '1px solid #ccc',
                         borderRadius: '6px',
                         padding: '0.5rem',
                         cursor: 'pointer',
                         color: '#666',
                         transition: 'all 0.2s ease'
                       }}
                       onMouseEnter={(e) => {
                         (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
                         (e.target as HTMLElement).style.borderColor = '#999';
                       }}
                       onMouseLeave={(e) => {
                         (e.target as HTMLElement).style.backgroundColor = 'transparent';
                         (e.target as HTMLElement).style.borderColor = '#ccc';
                       }}
                     >
                       ←
                     </button>
                     <span style={{ fontSize: '1.1rem', fontWeight: '600', minWidth: '150px', textAlign: 'center' }}>
                       {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                     </span>
                     <button
                       onClick={() => navigateCalendar('next')}
                       style={{
                         background: 'none',
                         border: '1px solid #ccc',
                         borderRadius: '6px',
                         padding: '0.5rem',
                         cursor: 'pointer',
                         color: '#666',
                         transition: 'all 0.2s ease'
                       }}
                       onMouseEnter={(e) => {
                         (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
                         (e.target as HTMLElement).style.borderColor = '#999';
                       }}
                       onMouseLeave={(e) => {
                         (e.target as HTMLElement).style.backgroundColor = 'transparent';
                         (e.target as HTMLElement).style.borderColor = '#ccc';
                       }}
                     >
                       →
                     </button>
                   </div>

                  {/* Calendar Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '0.5rem',
                      width: '100%',
                      maxWidth: '350px'
                    }}
                  >
                    {/* Day Headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div
                        key={day}
                        style={{
                          padding: '0.5rem',
                          textAlign: 'center',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          color: '#666'
                        }}
                      >
                        {day}
                      </div>
                    ))}

                                         {/* Calendar Days */}
                     {(() => {
                       const year = selectedDate.getFullYear();
                       const month = selectedDate.getMonth();
                       const firstDay = new Date(year, month, 1);
                       const lastDay = new Date(year, month + 1, 0);
                       const startingDayOfWeek = firstDay.getDay();
                       const daysInMonth = lastDay.getDate();
                       const today = new Date();
                       
                       console.log('🗓️ Rendering calendar for:', year, month + 1, 'with', daysInMonth, 'days');
                       
                       const days = [];
                       
                       // Empty cells for days before the first day of the month
                       for (let i = 0; i < startingDayOfWeek; i++) {
                         days.push(
                           <div key={`empty-${i}`} style={{ padding: '0.75rem' }}></div>
                         );
                       }
                       
                       // Days of the month
                       for (let day = 1; day <= daysInMonth; day++) {
                         const currentDate = new Date(year, month, day);
                         const isToday = currentDate.toDateString() === today.toDateString();
                         const isInSelectedRange = isDateInSelectedRange(currentDate);
                         const isFutureDate = currentDate > today;
                         
                         days.push(
                           <button
                             key={day}
                             onClick={(e) => {
                               console.log('🔥 CALENDAR BUTTON CLICKED!', day, 'isFutureDate:', isFutureDate);
                               e.preventDefault();
                               e.stopPropagation();
                               e.nativeEvent.stopImmediatePropagation();
                                                              if (!isFutureDate) {
                                // Set the specific date and switch to single day view
                                console.log('📅 Date selected from calendar:', currentDate.toLocaleDateString());
                                setSelectedDate(currentDate);
                                setTimePeriod('today'); // Use today mode for single date
                                setTimeDropdownOpen(false);
                                console.log('🔄 Switching to single date view for:', currentDate.toLocaleDateString());
                                console.log('✅ Updated state - selectedDate:', currentDate, 'timePeriod:', 'today');
                              } else {
                                console.log('❌ Future date clicked, ignoring');
                              }
                             }}
                             disabled={isFutureDate}
                             style={{
                               padding: '0.75rem',
                               textAlign: 'center',
                               borderRadius: '6px',
                               cursor: isFutureDate ? 'not-allowed' : 'pointer',
                               border: 'none',
                               background: isInSelectedRange 
                                 ? '#667eea' 
                                 : isToday 
                                   ? '#e0e7ff' 
                                   : isFutureDate 
                                     ? '#f5f5f5' 
                                     : 'transparent',
                               color: isInSelectedRange 
                                 ? 'white' 
                                 : isToday 
                                   ? '#667eea' 
                                   : isFutureDate 
                                     ? '#ccc' 
                                     : '#333',
                               fontWeight: isToday ? '600' : isInSelectedRange ? '500' : '400',
                               transition: 'all 0.2s ease',
                               opacity: isFutureDate ? 0.5 : 1
                             }}
                             onMouseEnter={(e) => {
                               if (!isFutureDate && !isInSelectedRange) {
                                 (e.target as HTMLElement).style.backgroundColor = '#f0f4ff';
                                 (e.target as HTMLElement).style.color = '#667eea';
                               }
                             }}
                             onMouseLeave={(e) => {
                               if (!isFutureDate && !isInSelectedRange) {
                                 (e.target as HTMLElement).style.backgroundColor = isToday ? '#e0e7ff' : isFutureDate ? '#f5f5f5' : 'transparent';
                                 (e.target as HTMLElement).style.color = isToday ? '#667eea' : isFutureDate ? '#ccc' : '#333';
                               }
                             }}
                           >
                             {day}
                           </button>
                         );
                       }
                       
                       return days;
                     })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Check-ins Details Page Component
  const CheckinsDetailsPage = () => {
    const [checkinsData, setCheckinsData] = useState<{
      totalCheckins: number;
      customers: any[];
      loading: boolean;
    }>({
      totalCheckins: 0,
      customers: [],
      loading: true
    });

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    const navigateDate = (direction: 'prev' | 'next') => {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
      setSelectedDate(newDate);
    };

    const goToToday = () => {
      setSelectedDate(new Date());
    };

    const isToday = (date: Date) => {
      const today = new Date();
      return date.toDateString() === today.toDateString();
    };

    const isFuture = (date: Date) => {
      const today = new Date();
      return date > today;
    };

    useEffect(() => {
      // Fetch check-ins data for selected date
      const fetchCheckinsData = () => {
        const selectedStart = new Date(selectedDate);
        selectedStart.setHours(0, 0, 0, 0);
        const selectedEnd = new Date(selectedDate);
        selectedEnd.setHours(23, 59, 59, 999);

        console.log('🔍 Fetching check-ins data for:', formatDate(selectedDate));
        console.log('📅 Selected date:', selectedDate.toDateString());
        console.log('📅 Date range:', selectedStart.toISOString(), 'to', selectedEnd.toISOString());
        console.log('📅 Current time:', new Date().toISOString());
        
        const visitsQuery = query(collection(firestore, `users/${user.uid}/web_visits`));
        const outletsQuery = query(collection(firestore, `users/${user.uid}/outlets`));
        const customersQuery = query(collection(firestore, `users/${user.uid}/web_customers`));
         
        const unsubscribe = onSnapshot(visitsQuery, async (visitsSnapshot) => {
          let dayCheckins: any[] = [];
          let totalCheckins = 0;

          // Get outlets data to match outlet names
          const outletsSnapshot = await new Promise<any>((resolve) => {
            const unsubscribeOutlets = onSnapshot(outletsQuery, (outletSnapshot) => {
              unsubscribeOutlets();
              resolve(outletSnapshot);
            });
          });

          // Get customers data to match customer info
          const customersSnapshot = await new Promise<any>((resolve) => {
            const unsubscribeCustomers = onSnapshot(customersQuery, (customersSnapshot) => {
              unsubscribeCustomers();
              resolve(customersSnapshot);
            });
          });

          // Create a map of outlet ID to outlet name
          const outletNameMap: { [key: string]: string } = {};
          outletsSnapshot.docs.forEach((doc: any) => {
            const outlet = doc.data();
            outletNameMap[doc.id] = outlet.name || outlet.outletName || `Outlet ${doc.id}`;
          });

          // Create a map of customer ID to customer info
          const customerInfoMap: { [key: string]: any } = {};
          customersSnapshot.docs.forEach((doc: any) => {
            const customer = doc.data();
            customerInfoMap[doc.id] = customer;
          });

          visitsSnapshot.docs.forEach(doc => {
            const visit = doc.data();
            const visitDate = visit.timestamp?.toDate() || visit.createdAt?.toDate();
            
            if (visitDate && visitDate >= selectedStart && visitDate <= selectedEnd) {
              // Filter by outlet
              const matchesOutlet = selectedOutlet === 'all' || visit.outletId === selectedOutlet;
              
              if (matchesOutlet) {
                const customerId = visit.customerId;
                
                // Count ALL visits, including multiple visits by same customer at different outlets
                totalCheckins++;
                
                const customerInfo = customerInfoMap[customerId];
                const name = customerInfo?.name || customerInfo?.fullName || customerInfo?.firstName;
                const phone = customerInfo?.phoneNumber || customerInfo?.phone;
                const outletName = outletNameMap[visit.outletId] || 'Unknown Outlet';
                
                dayCheckins.push({
                  id: doc.id,
                  customerId,
                  visitDate,
                  displayName: name && name.trim() !== '' ? name : (phone || 'Unknown Customer'),
                  outletDisplayName: outletName,
                  customerInfo,
                  ...visit
                });
              }
            }
          });

          // Sort check-ins by visit date (newest first)
          dayCheckins.sort((a, b) => b.visitDate - a.visitDate);

          setCheckinsData({
            totalCheckins,
            customers: dayCheckins,
            loading: false
          });
        });

        return unsubscribe;
      };

      const unsubscribe = fetchCheckinsData();
      return unsubscribe;
    }, [selectedDate, selectedOutlet, user.uid]);

    return (
      <div style={{
        minHeight: '100vh',
        width: '100%',
        background: 'transparent',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        margin: 0,
        padding: 0,
        overflowX: 'hidden',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <header style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 100%)',
          color: 'white',
          padding: '1rem 2rem',
          boxShadow: '0 2px 20px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(10px)',
          zIndex: 100
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => setCurrentPage('dashboard')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                ← Back to Dashboard
              </button>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
              }}>
                <AnalyticsIcon />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>Check-ins Today</h1>
                <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
                  {selectedOutlet === 'all' ? 'All outlets' : `Outlet: ${outlets.find(outlet => outlet.id === selectedOutlet)?.name || outlets.find(outlet => outlet.id === selectedOutlet)?.outletName || selectedOutlet}`}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)'
              }}
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ 
          flex: 1,
          padding: '2rem',
          maxWidth: '1400px', 
          margin: '0 auto',
          width: '100%'
        }}>
          {/* Date Navigation */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '1.5rem',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <button
                onClick={() => navigateDate('prev')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                ← Previous Day
              </button>
              
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem' }}>
                  {formatDate(selectedDate)}
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                  {isToday(selectedDate) ? 'Today' : `${Math.abs(Math.floor((new Date().getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24)))} days ago`}
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                {!isToday(selectedDate) && (
                  <button
                    onClick={goToToday}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'rgba(102, 126, 234, 0.3)',
                      color: 'white',
                      border: '1px solid rgba(102, 126, 234, 0.5)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Today
                  </button>
                )}
                <button
                  onClick={() => navigateDate('next')}
                  disabled={isFuture(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: isFuture(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)) 
                      ? 'rgba(255,255,255,0.1)' 
                      : 'rgba(255,255,255,0.2)',
                    color: isFuture(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)) 
                      ? 'rgba(255,255,255,0.5)' 
                      : 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '12px',
                    cursor: isFuture(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)) 
                      ? 'not-allowed' 
                      : 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  Next Day →
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '2rem',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              textAlign: 'center'
            }}>
              <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Check-ins</h3>
              <p style={{ color: 'white', fontSize: '3rem', fontWeight: '900', margin: 0 }}>
                {checkinsData.totalCheckins}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                Unique customers
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '2rem',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              textAlign: 'center'
            }}>
              <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Visit Rate</h3>
              <p style={{ color: 'white', fontSize: '3rem', fontWeight: '900', margin: 0 }}>
                {checkinsData.totalCheckins > 0 ? `${((checkinsData.totalCheckins / Math.max(data.customers, 1)) * 100).toFixed(1)}%` : '0%'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                Of total customers
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '2rem',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              textAlign: 'center'
            }}>
              <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Customer Base</h3>
              <p style={{ color: 'white', fontSize: '3rem', fontWeight: '900', margin: 0 }}>
                {data.customers}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                Total customers
              </p>
            </div>
          </div>

          {/* Check-ins List */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '2rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '1.5rem' }}>Customer Check-ins</h3>
            </div>
            <div style={{ padding: '0 0 2rem 0' }}>
              {checkinsData.loading ? (
                <div style={{ 
                  padding: '3rem', 
                  textAlign: 'center', 
                  color: 'rgba(255,255,255,0.7)' 
                }}>
                  Loading check-ins...
                </div>
              ) : checkinsData.customers.length === 0 ? (
                <div style={{ 
                  padding: '3rem', 
                  textAlign: 'center', 
                  color: 'rgba(255,255,255,0.7)' 
                }}>
                  No check-ins found for {formatDate(selectedDate)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
                  {checkinsData.customers.map((customer, index) => (
                    <div
                      key={customer.id}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none'
                      }}
                      onClick={() => {
                        // Create proper customer object for navigation
                        const customerForNavigation = {
                          id: customer.customerId,
                          name: customer.displayName,
                          phoneNumber: customer.customerInfo?.phoneNumber,
                          displayName: customer.displayName
                        };
                        setSelectedCustomer(customerForNavigation);
                        setPreviousPage('checkins'); // Track that we came from check-ins page
                        setCurrentPage('customers');
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.2)';
                        (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                        (e.target as HTMLElement).style.transform = 'translateY(0)';
                      }}
                    >
                      <div>
                        <p style={{ 
                          color: 'white', 
                          margin: 0, 
                          fontSize: '1.1rem', 
                          fontWeight: '600'
                        }}>
                          {customer.displayName}
                        </p>
                        <p style={{ 
                          color: 'rgba(255,255,255,0.7)', 
                          margin: '0.25rem 0 0 0', 
                          fontSize: '0.9rem' 
                        }}>
                          {customer.visitDate.toLocaleDateString()} at {customer.visitDate.toLocaleTimeString()} • Outlet: {customer.outletDisplayName}
                        </p>
                        {customer.customerInfo?.phoneNumber && (
                          <p style={{ 
                            color: 'rgba(255,255,255,0.6)', 
                            margin: '0.25rem 0 0 0', 
                            fontSize: '0.8rem' 
                          }}>
                            Phone: {customer.customerInfo.phoneNumber}
                          </p>
                        )}
                        <p style={{ 
                          color: 'rgba(255,255,255,0.5)', 
                          margin: '0.25rem 0 0 0', 
                          fontSize: '0.75rem',
                          fontStyle: 'italic' 
                        }}>
                          Click for transaction history →
                        </p>
                      </div>
                      <div style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'rgba(102, 126, 234, 0.2)',
                        color: 'white',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        CHECK-IN
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  };

  // Transactions Details Page Component
  const TransactionsDetailsPage = () => {
    const [transactionsData, setTransactionsData] = useState<{
      totalTransactions: number;
      totalPoints: number;
      totalRevenue: number;
      transactions: any[];
      loading: boolean;
    }>({
      totalTransactions: 0,
      totalPoints: 0,
      totalRevenue: 0,
      transactions: [],
      loading: true
    });

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    const navigateDate = (direction: 'prev' | 'next') => {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
      setSelectedDate(newDate);
    };

    const goToToday = () => {
      setSelectedDate(new Date());
    };

    const isToday = (date: Date) => {
      const today = new Date();
      return date.toDateString() === today.toDateString();
    };

    const isFuture = (date: Date) => {
      const today = new Date();
      return date > today;
    };

    useEffect(() => {
      // Fetch all transactions data for selected date
      const fetchTransactionsData = () => {
        const selectedStart = new Date(selectedDate);
        selectedStart.setHours(0, 0, 0, 0);
        const selectedEnd = new Date(selectedDate);
        selectedEnd.setHours(23, 59, 59, 999);

        console.log('🔍 Fetching all transactions data for:', formatDate(selectedDate));
        
        const transactionsQuery = query(collection(firestore, `users/${user.uid}/web_transactions`));
        const outletsQuery = query(collection(firestore, `users/${user.uid}/outlets`));
        const customersQuery = query(collection(firestore, `users/${user.uid}/web_customers`));
         
        const unsubscribe = onSnapshot(transactionsQuery, async (transactionsSnapshot) => {
          let dayTransactions: any[] = [];
          let totalTransactions = 0;
          let totalPoints = 0;
          let totalRevenue = 0;

          // Get outlets data to match outlet names
          const outletsSnapshot = await new Promise<any>((resolve) => {
            const unsubscribeOutlets = onSnapshot(outletsQuery, (outletSnapshot) => {
              unsubscribeOutlets();
              resolve(outletSnapshot);
            });
          });

          // Get customers data to match customer info
          const customersSnapshot = await new Promise<any>((resolve) => {
            const unsubscribeCustomers = onSnapshot(customersQuery, (customersSnapshot) => {
              unsubscribeCustomers();
              resolve(customersSnapshot);
            });
          });

          // Create a map of outlet ID to outlet name
          const outletNameMap: { [key: string]: string } = {};
          outletsSnapshot.docs.forEach((doc: any) => {
            const outlet = doc.data();
            outletNameMap[doc.id] = outlet.name || outlet.outletName || `Outlet ${doc.id}`;
          });

          // Create a map of customer ID to customer info
          const customerInfoMap: { [key: string]: any } = {};
          customersSnapshot.docs.forEach((doc: any) => {
            const customer = doc.data();
            customerInfoMap[doc.id] = customer;
          });

          transactionsSnapshot.docs.forEach(doc => {
            const transaction = doc.data();
            const transactionDate = transaction.transactionDate?.toDate() || transaction.timestamp?.toDate();
            
            if (transactionDate && transactionDate >= selectedStart && transactionDate <= selectedEnd) {
              // Filter by outlet
              const matchesOutlet = selectedOutlet === 'all' || transaction.outletId === selectedOutlet;
              
              if (matchesOutlet) {
                totalTransactions++;
                const pointsChanged = transaction.pointsChanged || 0;
                totalPoints += pointsChanged;
                totalRevenue += pointsChanged * 0.1; // Assuming $0.10 per point
                
                const customerInfo = customerInfoMap[transaction.customerId];
                const customerName = customerInfo?.name || customerInfo?.fullName || customerInfo?.firstName;
                const customerPhone = customerInfo?.phoneNumber || customerInfo?.phone;
                const outletName = outletNameMap[transaction.outletId] || 'Unknown Outlet';
                
                dayTransactions.push({
                  id: doc.id,
                  ...transaction,
                  transactionDate,
                  customerDisplay: customerName && customerName.trim() !== '' 
                    ? customerName 
                    : (customerPhone || 'Unknown Customer'),
                  outletDisplayName: outletName,
                  customerInfo,
                  timestamp: transactionDate
                });
              }
            }
          });

          // Sort transactions by date (newest first)
          dayTransactions.sort((a, b) => b.transactionDate - a.transactionDate);

          setTransactionsData({
            totalTransactions,
            totalPoints,
            totalRevenue,
            transactions: dayTransactions,
            loading: false
          });
        });

        return unsubscribe;
      };

      const unsubscribe = fetchTransactionsData();
      return unsubscribe;
    }, [selectedDate, selectedOutlet, user.uid]);

    return (
      <div style={{
        minHeight: '100vh',
        width: '100%',
        background: 'transparent',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        margin: 0,
        padding: 0,
        overflowX: 'hidden',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <header style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 100%)',
          color: 'white',
          padding: '1rem 2rem',
          boxShadow: '0 2px 20px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(10px)',
          zIndex: 100
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => setCurrentPage('dashboard')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                ← Back to Dashboard
              </button>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                </svg>
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>All Transactions</h1>
                <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
                  {selectedOutlet === 'all' ? 'All outlets' : `Outlet: ${outlets.find(outlet => outlet.id === selectedOutlet)?.name || outlets.find(outlet => outlet.id === selectedOutlet)?.outletName || selectedOutlet}`}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)'
              }}
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ 
          flex: 1,
          padding: '2rem',
          maxWidth: '1400px', 
          margin: '0 auto',
          width: '100%'
        }}>
          {/* Date Navigation */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '1.5rem',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <button
                onClick={() => navigateDate('prev')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                ← Previous Day
              </button>
              
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem' }}>
                  {formatDate(selectedDate)}
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                  {isToday(selectedDate) ? 'Today' : `${Math.abs(Math.floor((new Date().getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24)))} days ago`}
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                {!isToday(selectedDate) && (
                  <button
                    onClick={goToToday}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'rgba(255, 107, 107, 0.3)',
                      color: 'white',
                      border: '1px solid rgba(255, 107, 107, 0.5)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Today
                  </button>
                )}
                <button
                  onClick={() => navigateDate('next')}
                  disabled={isFuture(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: isFuture(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)) 
                      ? 'rgba(255,255,255,0.1)' 
                      : 'rgba(255,255,255,0.2)',
                    color: isFuture(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)) 
                      ? 'rgba(255,255,255,0.5)' 
                      : 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '12px',
                    cursor: isFuture(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)) 
                      ? 'not-allowed' 
                      : 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  Next Day →
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '2rem',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              textAlign: 'center'
            }}>
              <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Total Transactions</h3>
              <p style={{ color: 'white', fontSize: '3rem', fontWeight: '900', margin: 0 }}>
                {transactionsData.totalTransactions}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                All transaction types
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '2rem',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              textAlign: 'center'
            }}>
              <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Points Earned</h3>
              <p style={{ color: 'white', fontSize: '3rem', fontWeight: '900', margin: 0 }}>
                {transactionsData.totalPoints}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                Total points transacted
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '2rem',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              textAlign: 'center'
            }}>
              <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Revenue Generated</h3>
              <p style={{ color: 'white', fontSize: '3rem', fontWeight: '900', margin: 0 }}>
                ${transactionsData.totalRevenue.toFixed(2)}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                @ $0.10 per point
              </p>
            </div>
          </div>

          {/* Transactions List */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '2rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '1.5rem' }}>Transaction History</h3>
            </div>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {transactionsData.loading ? (
                <div style={{ 
                  padding: '3rem', 
                  textAlign: 'center', 
                  color: 'rgba(255,255,255,0.7)' 
                }}>
                  Loading transactions...
                </div>
              ) : transactionsData.transactions.length === 0 ? (
                <div style={{ 
                  padding: '3rem', 
                  textAlign: 'center', 
                  color: 'rgba(255,255,255,0.7)' 
                }}>
                  No transactions found for {formatDate(selectedDate)}
                </div>
              ) : (
                transactionsData.transactions.map((transaction, index) => (
                  <div
                    key={transaction.id}
                    style={{
                      padding: '1.5rem 2rem',
                      borderBottom: index === transactionsData.transactions.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ 
                        color: 'white', 
                        margin: 0, 
                        fontSize: '1.1rem', 
                        fontWeight: '600',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none'
                      }}
                      onClick={() => {
                        // Find the customer and navigate to their transaction history
                        const customer = {
                          id: transaction.customerId,
                          name: transaction.customerDisplay,
                          phoneNumber: transaction.customerPhone,
                          displayName: transaction.customerDisplay
                        };
                        setSelectedCustomer(customer);
                        setCurrentPage('customers');
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.8)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.color = 'white';
                      }}
                      >
                        {transaction.customerDisplay}
                      </p>
                      <p style={{ 
                        color: 'rgba(255,255,255,0.7)', 
                        margin: '0.25rem 0 0 0', 
                        fontSize: '0.9rem' 
                      }}>
                        {transaction.transactionDate.toLocaleDateString()} at {transaction.transactionDate.toLocaleTimeString()} • {transaction.outletDisplayName}
                      </p>
                      <p style={{ 
                        color: 'rgba(255,255,255,0.6)', 
                        margin: '0.25rem 0 0 0', 
                        fontSize: '0.8rem' 
                      }}>
                        {transaction.transactionType || 'EARNED'} • {transaction.isManualTransaction ? 'Manual' : 'Automatic'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: transaction.pointsChanged > 0 ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                        color: transaction.pointsChanged > 0 ? '#4ade80' : '#f87171',
                        borderRadius: '20px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        marginBottom: '0.5rem'
                      }}>
                        {transaction.pointsChanged > 0 ? '+' : ''}{transaction.pointsChanged || 0}
                      </div>
                      <p style={{ 
                        color: 'rgba(255,255,255,0.7)', 
                        margin: 0, 
                        fontSize: '0.8rem' 
                      }}>
                        points
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    );
  };

  // Customer Transactions Page Component
  const CustomerTransactionsPage = () => {
    const [customerTransactions, setCustomerTransactions] = useState<any[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalTransactions, setTotalTransactions] = useState(0);
    const [totalPoints, setTotalPoints] = useState(0);
    const [averagePoints, setAveragePoints] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [transactionTypeFilter, setTransactionTypeFilter] = useState('all');

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    const applyFilters = (transactions: any[]) => {
      let filtered = [...transactions];

      // Apply search filter
      if (searchTerm.trim()) {
        filtered = filtered.filter(transaction => 
          transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.transactionType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.outletDisplayName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Apply date filter
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (dateFilter) {
        case 'today':
          filtered = filtered.filter(transaction => {
            const transactionDate = new Date(transaction.timestamp);
            const transactionDay = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
            return transactionDay.getTime() === today.getTime();
          });
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(transaction => 
            transaction.timestamp >= weekAgo
          );
          break;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(transaction => 
            transaction.timestamp >= monthAgo
          );
          break;
        case 'custom':
          if (customStartDate && customEndDate) {
            const startDate = new Date(customStartDate);
            const endDate = new Date(customEndDate + 'T23:59:59');
            filtered = filtered.filter(transaction => 
              transaction.timestamp >= startDate && transaction.timestamp <= endDate
            );
          }
          break;
      }

      // Apply transaction type filter
      if (transactionTypeFilter !== 'all') {
        filtered = filtered.filter(transaction => 
          transaction.transactionType?.toLowerCase() === transactionTypeFilter.toLowerCase()
        );
      }

      return filtered;
    };

    useEffect(() => {
      const fetchCustomerTransactions = () => {
        if (!selectedCustomer) return;
        
        const transactionsQuery = query(collection(firestore, `users/${user.uid}/web_transactions`));
        const outletsQuery = query(collection(firestore, `users/${user.uid}/outlets`));

        const unsubscribe = onSnapshot(transactionsQuery, async (snapshot) => {
          try {
            // Get outlets for name mapping
            const outletsSnapshot = await new Promise<any>((resolve) => {
              const unsubscribeOutlets = onSnapshot(outletsQuery, (outletSnapshot) => {
                unsubscribeOutlets();
                resolve(outletSnapshot);
              });
            });

            const outletNameMap: { [key: string]: string } = {};
            outletsSnapshot.docs.forEach((doc: any) => {
              const outlet = doc.data();
              outletNameMap[doc.id] = outlet.name || outlet.outletName || `Outlet ${doc.id}`;
            });

            // Filter transactions for the selected customer
            const customerTransactionList = snapshot.docs
              .filter(doc => {
                const transaction = doc.data();
                return transaction.customerId === selectedCustomer.id;
              })
              .map(doc => {
                const transaction = doc.data();
                const outletName = outletNameMap[transaction.transactionOutletId] || 'Unknown Outlet';
                
                return {
                  id: doc.id,
                  ...transaction,
                  outletDisplayName: outletName,
                  timestamp: transaction.timestamp?.toDate(),
                  customerName: selectedCustomer.displayName,
                  pointsChanged: transaction.pointsChanged || 0,
                  description: transaction.description || 'Transaction',
                  transactionType: transaction.transactionType || 'Unknown'
                };
              })
              .sort((a, b) => b.timestamp - a.timestamp);

            // Calculate totals
            const totalTxns = customerTransactionList.length;
            const totalPts = customerTransactionList.reduce((sum, txn) => {
              return sum + (txn.pointsChanged || 0);
            }, 0);
            const avgPts = totalTxns > 0 ? totalPts / totalTxns : 0;

            setCustomerTransactions(customerTransactionList);
            setFilteredTransactions(applyFilters(customerTransactionList));
            setTotalTransactions(totalTxns);
            setTotalPoints(totalPts);
            setAveragePoints(avgPts);
            setLoading(false);
          } catch (error) {
            console.error('Error fetching customer transactions:', error);
            setLoading(false);
          }
        });

        return unsubscribe;
      };

      const unsubscribe = fetchCustomerTransactions();
      return () => unsubscribe && unsubscribe();
    }, [selectedCustomer, user.uid]);

    // Apply filters when search/filter criteria change
    useEffect(() => {
      if (customerTransactions.length > 0) {
        setFilteredTransactions(applyFilters(customerTransactions));
      }
    }, [searchTerm, dateFilter, customStartDate, customEndDate, transactionTypeFilter, customerTransactions]);

    if (!selectedCustomer) return null;

  return (
    <div style={{
      background: 'transparent',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        margin: 0,
        padding: 0,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <header style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 100%)',
          color: 'white',
          padding: '1rem 2rem',
          boxShadow: '0 2px 20px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(10px)',
          zIndex: 100
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1400px',
            margin: '0 auto',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setCurrentPage(previousPage);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                ← Back to {previousPage === 'checkins' ? 'Check-ins' : 
                           previousPage === 'signups' ? 'Signups' : 
                           previousPage === 'points' ? 'Points' : 
                           previousPage === 'transactions' ? 'Transactions' : 'Customers'}
              </button>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
              }}>
                <UsersIcon />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>
                  {selectedCustomer.displayName}
                </h1>
                <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
                  Transaction History
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)'
              }}
            >
              Sign Out
            </button>
          </div>

          {/* Search and Filter Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1400px',
            margin: '0 auto',
            gap: '2rem',
            flexWrap: 'wrap'
          }}>
            {/* Search Bar - Left Side */}
            <div style={{ position: 'relative', flex: '1', minWidth: '300px' }}>
              <input
                type="text"
                placeholder="Search transactions by description, type, or outlet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.5)';
                  (e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.15)';
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.3)';
                  (e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.1)';
                }}
              />
              <div style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '1rem'
              }}>
                🔍
              </div>
            </div>

            {/* Filter Controls - Right Side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  backdropFilter: 'blur(10px)',
                  cursor: 'pointer',
                  minWidth: '120px'
                }}
              >
                <option value="all" style={{ background: '#333', color: 'white' }}>All Time</option>
                <option value="today" style={{ background: '#333', color: 'white' }}>Today</option>
                <option value="week" style={{ background: '#333', color: 'white' }}>This Week</option>
                <option value="month" style={{ background: '#333', color: 'white' }}>This Month</option>
                <option value="custom" style={{ background: '#333', color: 'white' }}>Custom Range</option>
              </select>

              {/* Transaction Type Filter */}
              <select
                value={transactionTypeFilter}
                onChange={(e) => setTransactionTypeFilter(e.target.value)}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  backdropFilter: 'blur(10px)',
                  cursor: 'pointer',
                  minWidth: '120px'
                }}
              >
                <option value="all" style={{ background: '#333', color: 'white' }}>All Types</option>
                <option value="earned" style={{ background: '#333', color: 'white' }}>Earned</option>
                <option value="redeemed" style={{ background: '#333', color: 'white' }}>Redeemed</option>
              </select>

              {/* Custom Date Range */}
              {dateFilter === 'custom' && (
                <>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      outline: 'none',
                      backdropFilter: 'blur(10px)',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      outline: 'none',
                      backdropFilter: 'blur(10px)',
                      cursor: 'pointer'
                    }}
                  />
                </>
              )}

              {/* Results Count */}
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '12px',
                fontSize: '0.9rem',
                color: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(10px)',
                minWidth: '80px',
                textAlign: 'center'
              }}>
                {filteredTransactions.length} results
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ 
          flex: 1,
          padding: '2rem',
          maxWidth: '1400px', 
          margin: '0 auto',
          width: '100%'
        }}>
          {/* Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '2rem',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              textAlign: 'center'
            }}>
              <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Total Transactions</h3>
              <p style={{ color: 'white', fontSize: '3rem', fontWeight: '900', margin: 0 }}>
                {totalTransactions}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                All-time transactions
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '2rem',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              textAlign: 'center'
            }}>
              <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Total Points</h3>
              <p style={{ color: 'white', fontSize: '3rem', fontWeight: '900', margin: 0 }}>
                {totalPoints}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                Points earned/redeemed
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '2rem',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              textAlign: 'center'
            }}>
              <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Average per Transaction</h3>
              <p style={{ color: 'white', fontSize: '3rem', fontWeight: '900', margin: 0 }}>
                {Math.round(averagePoints)}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                Points per transaction
              </p>
            </div>
          </div>

          {/* Transaction List */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2rem',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 1.5rem 0', fontSize: '1.4rem' }}>
              Transaction History
            </h3>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid rgba(255,255,255,0.3)',
                  borderTop: '4px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem'
                }} />
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>Loading transactions...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '1.1rem' }}>
                  {customerTransactions.length === 0 ? 'No transactions found for this customer' : 'No transactions match your search criteria'}
                </p>
                {customerTransactions.length > 0 && filteredTransactions.length === 0 && (
                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                    Try adjusting your search term or date filters
                  </p>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredTransactions.map((transaction, index) => (
                  <div key={transaction.id} style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ 
                          color: 'white', 
                          margin: '0 0 0.5rem 0',
                          fontSize: '1.2rem',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none'
                        }}>
                          {transaction.description || 'Transaction'}
                        </h4>
                        <p style={{ 
                          color: 'rgba(255,255,255,0.8)', 
                          margin: '0 0 0.5rem 0',
                          fontSize: '0.9rem',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none'
                        }}>
                          {transaction.timestamp?.toLocaleString() || 'Unknown date'}
                        </p>
                        <p style={{ 
                          color: 'rgba(255,255,255,0.7)', 
                          margin: 0,
                          fontSize: '0.8rem'
                        }}>
                          Outlet: {transaction.outletDisplayName}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                                                 <div style={{
                           display: 'inline-block',
                           padding: '0.5rem 1rem',
                           borderRadius: '8px',
                           backgroundColor: transaction.pointsChanged > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                           border: transaction.pointsChanged > 0 ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                         }}>
                           <span style={{
                             color: transaction.pointsChanged > 0 ? '#22c55e' : '#ef4444',
                             fontWeight: '600',
                             fontSize: '1.1rem'
                           }}>
                             {transaction.pointsChanged > 0 ? '+' : ''}{transaction.pointsChanged || 0} pts
                           </span>
                         </div>
                        <div style={{
                          color: 'rgba(255,255,255,0.6)',
                          fontSize: '0.8rem',
                          marginTop: '0.25rem'
                        }}>
                          {transaction.transactionType || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  };

  // Customers Details Page Component
  const CustomersDetailsPage = () => {
    const [customersData, setCustomersData] = useState<{
      totalCustomers: number;
      customers: any[];
      loading: boolean;
    }>({
      totalCustomers: 0,
      customers: [],
      loading: true
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    useEffect(() => {
      // Fetch customers data
      const fetchCustomersData = () => {
        const customersQuery = query(collection(firestore, `users/${user.uid}/web_customers`));
        const outletsQuery = query(collection(firestore, `users/${user.uid}/outlets`));

        const unsubscribe = onSnapshot(customersQuery, async (snapshot) => {
          try {
            // Get outlets for name mapping
            const outletsSnapshot = await new Promise<any>((resolve) => {
              const unsubscribeOutlets = onSnapshot(outletsQuery, (outletSnapshot) => {
                unsubscribeOutlets();
                resolve(outletSnapshot);
              });
            });

            const outletNameMap: { [key: string]: string } = {};
            outletsSnapshot.docs.forEach((doc: any) => {
              const outlet = doc.data();
              outletNameMap[doc.id] = outlet.name || outlet.outletName || `Outlet ${doc.id}`;
            });

            // Filter customers by outlet - USE SAME LOGIC AS DASHBOARD OVERVIEW
            let filteredCustomers = snapshot.docs;
            if (selectedOutlet !== 'all') {
              filteredCustomers = snapshot.docs.filter(doc => {
                const customer = doc.data();
                // Count customers ONLY where this is their LAST VISITED outlet
                // This ensures each customer is counted in only ONE outlet
                const lastVisitedOutlet = customer.lastVisitOutletId === selectedOutlet;
                const isCurrentOutlet = customer.outletId === selectedOutlet;
                
                // If no lastVisitOutletId, fall back to outletId
                return lastVisitedOutlet || (isCurrentOutlet && !customer.lastVisitOutletId);
              });
            }

            // Apply phone number deduplication - same logic as dashboard overview
            const uniquePhoneNumbers = new Set<string>();
            const deduplicatedCustomers: any[] = [];
            
            filteredCustomers.forEach(doc => {
              const customer = doc.data();
              const phone = customer.phoneNumber || customer.phone;
              
              // Skip customers without phone numbers or duplicates
              if (!phone || uniquePhoneNumbers.has(phone)) return;
              
              uniquePhoneNumbers.add(phone);
              deduplicatedCustomers.push(doc);
            });

            const customersList = deduplicatedCustomers.map(doc => {
              const customer = doc.data();
              const name = customer.name || customer.fullName || customer.firstName;
              const phone = customer.phoneNumber || customer.phone;
              const outletId = customer.registrationOutletId || customer.outletId || customer.lastVisitOutletId;
              const outletName = outletNameMap[outletId] || 'Unknown Outlet';
              const joinDate = customer.dateJoined?.toDate() || customer.createdAt?.toDate();
              
              return {
                id: doc.id,
                ...customer,
                displayName: name && name.trim() !== '' ? name : (phone || 'Unknown'),
                outletDisplayName: outletName,
                joinDate: joinDate,
                searchableText: `${name || ''} ${phone || ''}`.toLowerCase()
              };
            }).sort((a, b) => {
              // Sort by join date - most recent first
              if (a.joinDate && b.joinDate) {
                return b.joinDate.getTime() - a.joinDate.getTime();
              }
              // Put customers without join date at the end
              if (a.joinDate && !b.joinDate) return -1;
              if (!a.joinDate && b.joinDate) return 1;
              // If both don't have join date, sort alphabetically by name
              return (a.displayName || '').localeCompare(b.displayName || '');
            });

            console.log(`🔍 CUSTOMER DETAILS PAGE - ${selectedOutlet === 'all' ? 'All Outlets' : 'Outlet: ' + selectedOutlet}:`);
            console.log('📊 Total customer documents before filtering:', snapshot.docs.length);
            console.log('📊 After outlet filtering:', filteredCustomers.length);
            console.log('📊 After phone deduplication and sorting:', customersList.length);
            console.log('📞 Unique phone numbers in details page:', uniquePhoneNumbers.size);
            console.log('📅 Customers sorted by most recent join date first');
            if (customersList.length > 0) {
              console.log('📅 Most recent customer:', customersList[0].displayName, customersList[0].joinDate);
              console.log('📅 Oldest customer:', customersList[customersList.length - 1].displayName, customersList[customersList.length - 1].joinDate);
            }

            setCustomersData({
              totalCustomers: customersList.length,
              customers: customersList,
              loading: false
            });
          } catch (error) {
            console.error('Error fetching customers:', error);
            setCustomersData({
              totalCustomers: 0,
              customers: [],
              loading: false
            });
          }
        });

        return unsubscribe;
      };

      const unsubscribe = fetchCustomersData();
      return () => unsubscribe && unsubscribe();
    }, [selectedOutlet, user.uid]);

    // Filter customers based on search term
    useEffect(() => {
      if (!searchTerm.trim()) {
        setFilteredCustomers(customersData.customers);
      } else {
        const filtered = customersData.customers.filter(customer =>
          customer.searchableText.includes(searchTerm.toLowerCase())
        );
        setFilteredCustomers(filtered);
      }
    }, [searchTerm, customersData.customers]);

      const handleCustomerClick = (customer: any) => {
    setSelectedCustomer(customer);
    setPreviousPage('customers'); // Track that we came from customers page
  };

  return (
    <div style={{
      background: 'transparent',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      margin: 0,
      padding: 0,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>

      {/* Header */}
        <header style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 100%)',
          color: 'white',
          padding: '1rem 2rem',
          boxShadow: '0 2px 20px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(10px)',
          zIndex: 100
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => setCurrentPage('dashboard')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                ← Back to Dashboard
              </button>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
              }}>
                <UsersIcon />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>Customers</h1>
                <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
                  {selectedOutlet === 'all' ? 'All outlets' : `Outlet: ${outlets.find(outlet => outlet.id === selectedOutlet)?.name || outlets.find(outlet => outlet.id === selectedOutlet)?.outletName || selectedOutlet}`}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search customers by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '300px',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    outline: 'none',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.5)';
                    (e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.15)';
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.3)';
                    (e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.1)';
                  }}
                />
                <div style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255,255,255,0.7)',
                  pointerEvents: 'none'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                </div>
              </div>
              <button
                onClick={onLogout}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  backdropFilter: 'blur(10px)'
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ 
          flex: 1,
          padding: '2rem',
          maxWidth: '1400px', 
          margin: '0 auto',
          width: '100%'
        }}>
          {/* Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '2rem',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              textAlign: 'center'
            }}>
              <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Total Customers</h3>
              <p style={{ color: 'white', fontSize: '3rem', fontWeight: '900', margin: 0 }}>
                {customersData.totalCustomers}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                {selectedOutlet === 'all' ? 'All outlets' : 'This outlet'}
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '2rem',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              textAlign: 'center'
            }}>
              <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Search Results</h3>
              <p style={{ color: 'white', fontSize: '3rem', fontWeight: '900', margin: 0 }}>
                {filteredCustomers.length}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                {searchTerm ? 'Matching customers' : 'Total customers'}
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '2rem',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              textAlign: 'center'
            }}>
              <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Active Outlets</h3>
              <p style={{ color: 'white', fontSize: '3rem', fontWeight: '900', margin: 0 }}>
                {outlets.length}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                Total outlets
              </p>
            </div>
          </div>

          {/* Customer List */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2rem',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 1.5rem 0', fontSize: '1.4rem' }}>
              Customer Details
              {searchTerm && (
                <span style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: '400', 
                  color: 'rgba(255,255,255,0.7)' 
                }}>
                  {' '}• Searching for "{searchTerm}"
                </span>
              )}
            </h3>
            
            {customersData.loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid rgba(255,255,255,0.3)',
                  borderTop: '4px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem'
                }} />
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>Loading customers...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '1.1rem' }}>
                  {searchTerm ? `No customers found matching "${searchTerm}"` : 'No customers found'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      marginTop: '1rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredCustomers.map((customer, index) => (
                  <div key={customer.id} style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none'
                  }}
                  onClick={() => handleCustomerClick(customer)}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.2)';
                    (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                    (e.target as HTMLElement).style.transform = 'translateY(0)';
                  }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ 
                          color: 'white', 
                          margin: '0 0 0.5rem 0',
                          fontSize: '1.2rem',
                          cursor: 'pointer',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none'
                        }}>
                          {customer.displayName}
                        </h4>
                        <p style={{ 
                          color: 'rgba(255,255,255,0.8)', 
                          margin: '0 0 0.5rem 0',
                          fontSize: '0.9rem'
                        }}>
                          Phone: {customer.phoneNumber || customer.phone || 'N/A'}
                        </p>
                        <p style={{ 
                          color: 'rgba(255,255,255,0.7)', 
                          margin: 0,
                          fontSize: '0.8rem'
                        }}>
                          Outlet: {customer.outletDisplayName} • 
                          Joined: {customer.joinDate ? customer.joinDate.toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '0.75rem 1.25rem',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          border: '2px solid rgba(255, 255, 255, 0.4)',
                          marginBottom: '0.5rem',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}>
                          <span style={{
                            color: '#ffffff',
                            fontWeight: '700',
                            fontSize: '1.1rem',
                            textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                          }}>
                            {customer.totalPoints || 0} pts
                          </span>
                        </div>
                        <div style={{
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                        }}>
                          Click for transactions →
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  };

  // Show admin dashboard if requested
  if (showAdminDashboard && isAuthorizedAdmin) {
    return (
      <AdminDashboard 
        user={user} 
        onClose={() => {
          setShowAdminDashboard(false);
          setCurrentPage('dashboard');
        }} 
      />
    );
  }

  // Render different pages
  if (currentPage === 'signups') {
    return <SignupsDetailsPage />;
  }
  
  if (currentPage === 'points') {
    return <PointsDetailsPage />;
  }
  
  if (currentPage === 'checkins') {
    return <CheckinsDetailsPage />;
  }
  
  if (currentPage === 'transactions') {
    return <TransactionsDetailsPage />;
  }
  
  if (currentPage === 'customers') {
    return selectedCustomer ? <CustomerTransactionsPage /> : <CustomersDetailsPage />;
  }
  
  if (currentPage === 'sms-marketing') {
            return <CampaignManager user={user} onBack={() => {
              setCurrentPage('dashboard');
              setShowAdminDashboard(false);
            }} />;
  }
  
  if (currentPage === 'outlets') {
    return <FilterSuggestions page="outlets" />;
  }
  
  if (currentPage === 'analytics') {
    return <FilterSuggestions page="analytics" />;
  }

  if (currentPage !== 'dashboard') {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100%',
        background: 'transparent',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        margin: 0,
        padding: 0,
        overflowX: 'hidden',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Same header as dashboard */}
        <header style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 100%)',
          color: 'white',
          padding: '1rem 2rem',
          boxShadow: '0 2px 20px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(10px)',
          zIndex: 100
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
              }}>
                <span style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '900',
                  color: 'white'
                }}>R</span>
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>Rewin Dashboard</h1>
                <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>Loyalty Program Management</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)'
              }}
            >
              Sign Out
            </button>
          </div>
        </header>

        <main style={{ 
          flex: 1,
          padding: '2rem',
          maxWidth: '1400px', 
          margin: '0 auto',
          width: '100%'
        }}>
          <FilterSuggestions page={currentPage} />
        </main>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'transparent',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      margin: 0,
      padding: 0,
      overflowX: 'hidden',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 100%)',
        color: 'white',
        padding: '1rem 2rem',
        boxShadow: '0 2px 20px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(10px)',
        zIndex: 100
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Rewin Logo */}
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
            }}>
              <span style={{ 
                fontSize: '1.5rem', 
                fontWeight: '900',
                color: 'white'
              }}>R</span>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>Rewin Dashboard</h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>Loyalty Program Management</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {/* Outlet Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
              <div style={{ 
                padding: '1rem', 
                background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)', 
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.36 9l.6 3H5.04l.6-3h12.72M20 4H4v2h16V4zm0 3H4l-1 5v2h1v6h10v-6h4v6h2v-6h1v-2l-1-5zM6 18v-4h6v4H6z"/>
                </svg>
              </div>
              <div style={{ position: 'relative' }} data-dropdown>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                    minWidth: '240px',
                    padding: '1rem 1.5rem',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)',
                  color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.25) 100%)';
                    (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.4)';
                    (e.target as HTMLButtonElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)';
                    (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)';
                    (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)';
                    (e.target as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
                    (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                  }}
                >
                  <span style={{ flex: 1 }}>
                    {selectedOutlet === 'all' 
                      ? `All Outlets (${data.outlets})` 
                      : outlets.find(outlet => outlet.id === selectedOutlet)?.name || 
                        outlets.find(outlet => outlet.id === selectedOutlet)?.outletName || 
                        selectedOutlet
                    }
                  </span>
                  <svg 
                    width="18" 
                    height="18" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ 
                      transition: 'transform 0.3s ease',
                      transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                  >
                    <polyline points="6,9 12,15 18,9"></polyline>
                  </svg>
                </button>
                
                {dropdownOpen && (
      <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '0.5rem',
        background: 'rgba(20,24,45,0.7)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.3)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    zIndex: 9999,
                    overflow: 'hidden',
                    animation: 'dropdownFade 0.3s ease'
                  }}>
                    <div 
                      onClick={() => {
                        setSelectedOutlet('all');
                        setDropdownOpen(false);
                      }}
                      style={{
                        padding: '1rem 1.5rem',
                        color: 'white',
                  cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '500',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        background: selectedOutlet === 'all' ? 'rgba(255,255,255,0.2)' : 'transparent',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLDivElement).style.background = 'rgba(255,255,255,0.2)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLDivElement).style.background = selectedOutlet === 'all' ? 'rgba(255,255,255,0.2)' : 'transparent';
                      }}
                    >
                  All Outlets ({data.outlets})
                    </div>
                {outlets.map((outlet) => (
                      <div
                    key={outlet.id} 
                        onClick={() => {
                          setSelectedOutlet(outlet.id);
                          setDropdownOpen(false);
                        }}
                        style={{
                          padding: '1rem 1.5rem',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          fontWeight: '500',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                          borderBottom: outlets.indexOf(outlet) === outlets.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.1)',
                          background: selectedOutlet === outlet.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLDivElement).style.background = 'rgba(255,255,255,0.2)';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLDivElement).style.background = selectedOutlet === outlet.id ? 'rgba(255,255,255,0.2)' : 'transparent';
                        }}
                  >
                    {outlet.name || outlet.outletName || `Outlet ${outlet.id}`}
                      </div>
                ))}
                {outlets.length === 0 && (
                      <div style={{
                        padding: '1rem 1.5rem',
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '1rem',
                        fontStyle: 'italic',
                        textAlign: 'center'
                      }}>
                    No outlets found
                      </div>
                )}
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Welcome back,</div>
              <div style={{ fontWeight: '600' }}>{user.email}</div>
              

            </div>
            

            
            <button
              onClick={onLogout}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.3)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.2)';
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ 
        flex: 1,
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        maxWidth: '1400px', 
        margin: '0 auto',
        width: '100%'
      }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h2 style={{ 
            fontSize: '2.5rem', 
            fontWeight: '700',
            color: 'white',
            margin: '0 0 0.5rem 0',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}>
            Dashboard Overview
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem', margin: 0 }}>
            Real-time insights from your loyalty program
          </p>
          {selectedOutlet !== 'all' && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: 'rgba(255,107,107,0.2)',
              borderRadius: '12px',
              border: '1px solid rgba(255,107,107,0.3)',
              display: 'inline-block'
            }}>
              <span style={{ color: 'white', fontSize: '0.9rem' }}>
                📊 Filtering by: <strong>
                  {outlets.find(o => o.id === selectedOutlet)?.name || 
                   outlets.find(o => o.id === selectedOutlet)?.outletName || 
                   `Outlet ${selectedOutlet}`}
                </strong>
              </span>
            </div>
          )}
        </div>
        
        {data.loading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              border: '4px solid rgba(255,255,255,0.3)',
              borderTop: '4px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1.5rem'
            }} />
            <h3 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>Loading Dashboard</h3>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>Connecting to your Firebase database...</p>
          </div>
        )}
        
        {!data.loading && (
          <>
            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
              marginBottom: '2rem',
              width: '100%',
              maxWidth: '1200px'
            }}>
              {/* Top Row: Customers, Points, Revenue */}
              <div 
              onClick={() => handleCardClick('customers')}
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)',
                color: 'white',
                padding: '2.5rem',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                position: 'relative',
                overflow: 'hidden',
                backdropFilter: 'blur(20px)',
                border: '2px solid rgba(16,185,129,0.8)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: 'translateY(0)'
              }}
              onMouseEnter={(e) => {
                const card = e.currentTarget as HTMLElement;
                card.style.transform = 'translateY(-5px)';
                card.style.boxShadow = '0 12px 40px rgba(16,185,129,0.3)';
                card.style.border = '2px solid rgba(16,185,129,1)';
                const glow = card.querySelector('[data-role="glow"]') as HTMLElement;
                if (glow) glow.style.opacity = '1';
                const closeBtn = card.querySelector('[data-role="close-btn"]') as HTMLElement;
                if (closeBtn) {
                  closeBtn.style.opacity = '1';
                  closeBtn.style.transform = 'scale(1)';
                }
              }}
              onMouseLeave={(e) => {
                const card = e.currentTarget as HTMLElement;
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
                card.style.border = '2px solid rgba(16,185,129,0.8)';
                const glow = card.querySelector('[data-role="glow"]') as HTMLElement;
                if (glow) glow.style.opacity = '0';
                const closeBtn = card.querySelector('[data-role="close-btn"]') as HTMLElement;
                if (closeBtn) {
                  closeBtn.style.opacity = '0';
                  closeBtn.style.transform = 'scale(0.8)';
                }
              }}
            >
                <div data-role="glow" style={{ position: 'absolute', top: '-80px', right: '-80px', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle at center, rgba(16,185,129,0.5) 0%, rgba(16,185,129,0) 78%)', opacity: 0, transition: 'opacity 0.25s ease', filter: 'blur(16px)', pointerEvents: 'none', zIndex: 0 }} />

                <div data-role="icon" style={{ position: 'absolute', top: '20px', right: '20px', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(13,16,34,0.98) 0%, rgba(13,16,34,0.92) 100%)', color: '#10b981', border: '1px solid rgba(16,185,129,0.4)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2, isolation: 'isolate' }}>
                  <UsersIcon />
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', opacity: 0.9 }}>
                  {selectedOutlet === 'all' ? 'Total Customers' : 'Customers'}
                </h3>
                <p style={{ fontSize: '3.5rem', fontWeight: '900', margin: 0 }}>{data.customers.toLocaleString()}</p>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>
                  {selectedOutlet === 'all' ? 'All outlets' : 'This outlet'} • Click to view details →
                </div>
              </div>
              
              <div 
                onClick={() => handleCardClick('points')}
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)',
                  color: 'white',
                  padding: '2.5rem',
                  borderRadius: '20px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                  backdropFilter: 'blur(20px)',
                  border: '2px solid rgba(139,92,246,0.8)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: 'translateY(0)'
                }}
                onMouseEnter={(e) => {
                  const card = e.currentTarget as HTMLElement;
                  card.style.transform = 'translateY(-5px)';
                  card.style.boxShadow = '0 12px 40px rgba(139,92,246,0.3)';
                  card.style.border = '2px solid rgba(139,92,246,1)';
                  const glow = card.querySelector('[data-role="glow"]') as HTMLElement;
                  if (glow) glow.style.opacity = '1';

                }}
                onMouseLeave={(e) => {
                  const card = e.currentTarget as HTMLElement;
                  card.style.transform = 'translateY(0)';
                  card.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
                  card.style.border = '2px solid rgba(139,92,246,0.8)';
                  const glow = card.querySelector('[data-role="glow"]') as HTMLElement;
                  if (glow) glow.style.opacity = '0';

                }}
              >
                <div data-role="glow" style={{ position: 'absolute', top: '-80px', right: '-80px', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle at center, rgba(139,92,246,0.5) 0%, rgba(139,92,246,0) 78%)', opacity: 0, transition: 'opacity 0.25s ease', filter: 'blur(16px)', pointerEvents: 'none', zIndex: 0 }} />

                <div data-role="icon" style={{ position: 'absolute', top: '20px', right: '20px', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(13,16,34,0.98) 0%, rgba(13,16,34,0.92) 100%)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.4)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2, isolation: 'isolate' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', opacity: 0.9 }}>
                  {selectedOutlet === 'all' ? 'Total Points' : 'Points'}
                </h3>
                <p style={{ fontSize: '3.5rem', fontWeight: '900', margin: 0 }}>{data.totalPoints.toLocaleString()}</p>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>
                  {selectedOutlet === 'all' ? 'All outlets' : 'This outlet'} • Click to view details →
                </div>
              </div>
              
              <div 
                onClick={() => handleCardClick('revenue')}
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)',
                  color: 'white',
                  padding: '2.5rem',
                  borderRadius: '20px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                  backdropFilter: 'blur(20px)',
                  border: '2px solid rgba(156,163,175,0.8)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: 'translateY(0)'
                }}
                onMouseEnter={(e) => {
                  const card = e.currentTarget as HTMLElement;
                  card.style.transform = 'translateY(-5px)';
                  card.style.boxShadow = '0 12px 40px rgba(156,163,175,0.3)';
                  card.style.border = '2px solid rgba(156,163,175,1)';
                  const glow = card.querySelector('[data-role="glow"]') as HTMLElement;
                  if (glow) glow.style.opacity = '1';

                }}
                onMouseLeave={(e) => {
                  const card = e.currentTarget as HTMLElement;
                  card.style.transform = 'translateY(0)';
                  card.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
                  card.style.border = '2px solid rgba(156,163,175,0.8)';
                  const glow = card.querySelector('[data-role="glow"]') as HTMLElement;
                  if (glow) glow.style.opacity = '0';

                }}
              >
                <div data-role="glow" style={{ position: 'absolute', top: '-80px', right: '-80px', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle at center, rgba(156,163,175,0.5) 0%, rgba(156,163,175,0) 78%)', opacity: 0, transition: 'opacity 0.25s ease', filter: 'blur(16px)', pointerEvents: 'none', zIndex: 0 }} />

                <div data-role="icon" style={{ position: 'absolute', top: '20px', right: '20px', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(13,16,34,0.98) 0%, rgba(13,16,34,0.92) 100%)', color: '#d1d5db', border: '1px solid rgba(156,163,175,0.4)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2, isolation: 'isolate' }}>
                  <RevenueIcon />
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', opacity: 0.9 }}>
                  {selectedOutlet === 'all' ? 'Total Revenue' : 'Revenue'}
                </h3>
                <p style={{ fontSize: '3.5rem', fontWeight: '900', margin: 0 }}>${data.revenue.toLocaleString()}</p>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>
                  {selectedOutlet === 'all' ? 'All outlets' : 'This outlet'} • Click to view details →
                </div>
              </div>
              
              {/* Bottom Row: Check-ins Today, New Signups Today, Active Outlets */}
              <div 
                onClick={() => handleCardClick('checkins')}
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)',
                  color: 'white',
                  padding: '2.5rem',
                  borderRadius: '20px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                  backdropFilter: 'blur(20px)',
                  border: '2px solid rgba(59,130,246,0.8)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: 'translateY(0)'
                }}
                onMouseEnter={(e) => {
                  const card = e.currentTarget as HTMLElement;
                  card.style.transform = 'translateY(-5px)';
                  card.style.boxShadow = '0 12px 40px rgba(59,130,246,0.3)';
                  card.style.border = '2px solid rgba(59,130,246,1)';
                  const glow = card.querySelector('[data-role="glow"]') as HTMLElement;
                  if (glow) glow.style.opacity = '1';

                }}
                onMouseLeave={(e) => {
                  const card = e.currentTarget as HTMLElement;
                  card.style.transform = 'translateY(0)';
                  card.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
                  card.style.border = '2px solid rgba(59,130,246,0.8)';
                  const glow = card.querySelector('[data-role="glow"]') as HTMLElement;
                  if (glow) glow.style.opacity = '0';

                }}
              >
                <div data-role="glow" style={{ position: 'absolute', top: '-80px', right: '-80px', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle at center, rgba(59,130,246,0.5) 0%, rgba(59,130,246,0) 78%)', opacity: 0, transition: 'opacity 0.25s ease', filter: 'blur(16px)', pointerEvents: 'none', zIndex: 0 }} />

                <div data-role="icon" style={{ position: 'absolute', top: '20px', right: '20px', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(13,16,34,0.98) 0%, rgba(13,16,34,0.92) 100%)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.35)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2, isolation: 'isolate' }}>
                  <AnalyticsIcon />
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', opacity: 0.9 }}>Check-ins Today</h3>
                <p style={{ fontSize: '3.5rem', fontWeight: '900', margin: 0 }}>{data.checkIns.toLocaleString()}</p>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>
                  {selectedOutlet === 'all' ? 'All outlets' : 'This outlet'} • Click to view details →
                </div>
              </div>
              
              <div 
                onClick={() => handleCardClick('signups')}
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)',
                  color: 'white',
                  padding: '2.5rem',
                  borderRadius: '20px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                  backdropFilter: 'blur(20px)',
                  border: '2px solid rgba(251,191,36,0.8)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: 'translateY(0)'
                }}
                onMouseEnter={(e) => {
                  const card = e.currentTarget as HTMLElement;
                  card.style.transform = 'translateY(-5px)';
                  card.style.boxShadow = '0 12px 40px rgba(251,191,36,0.3)';
                  card.style.border = '2px solid rgba(251,191,36,1)';
                  const glow = card.querySelector('[data-role=\"glow\"]') as HTMLElement;
                  if (glow) glow.style.opacity = '1';
                  const closeBtn = card.querySelector('[data-role=\"close-btn\"]') as HTMLElement;
                  if (closeBtn) {
                    closeBtn.style.opacity = '1';
                    closeBtn.style.transform = 'scale(1)';
                  }
                }}
                onMouseLeave={(e) => {
                  const card = e.currentTarget as HTMLElement;
                  card.style.transform = 'translateY(0)';
                  card.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
                  card.style.border = '2px solid rgba(251,191,36,0.8)';
                  const glow = card.querySelector('[data-role=\"glow\"]') as HTMLElement;
                  if (glow) glow.style.opacity = '0';
                  const closeBtn = card.querySelector('[data-role=\"close-btn\"]') as HTMLElement;
                  if (closeBtn) {
                    closeBtn.style.opacity = '0';
                    closeBtn.style.transform = 'scale(0.8)';
                  }
                }}
              >
                <div data-role="glow" style={{ position: 'absolute', top: '-80px', right: '-80px', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle at center, rgba(251,191,36,0.5) 0%, rgba(251,191,36,0) 78%)', opacity: 0, transition: 'opacity 0.25s ease', filter: 'blur(16px)', pointerEvents: 'none', zIndex: 0 }} />

                <div data-role="icon" style={{ position: 'absolute', top: '20px', right: '20px', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(13,16,34,0.98) 0%, rgba(13,16,34,0.92) 100%)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.35)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2, isolation: 'isolate' }}>
                  <SignupIcon />
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', opacity: 0.9 }}>New Signups Today</h3>
                <p style={{ fontSize: '3.5rem', fontWeight: '900', margin: 0 }}>{data.newSignupsToday.toLocaleString()}</p>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>
                  {selectedOutlet === 'all' ? 'All outlets' : 'This outlet'} • Click to view details →
                </div>
              </div>
              
              <div 
                onClick={() => handleCardClick('outlets')}
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)',
                  color: 'white',
                  padding: '2.5rem',
                  borderRadius: '20px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                  backdropFilter: 'blur(20px)',
                  border: '2px solid rgba(251,146,60,0.8)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: 'translateY(0)'
                }}
                onMouseEnter={(e) => {
                  const card = e.currentTarget as HTMLElement;
                  card.style.transform = 'translateY(-5px)';
                  card.style.boxShadow = '0 12px 40px rgba(251,146,60,0.3)';
                  card.style.border = '2px solid rgba(251,146,60,1)';
                  const glow = card.querySelector('[data-role="glow"]') as HTMLElement;
                  if (glow) glow.style.opacity = '1';

                }}
                onMouseLeave={(e) => {
                  const card = e.currentTarget as HTMLElement;
                  card.style.transform = 'translateY(0)';
                  card.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
                  card.style.border = '2px solid rgba(251,146,60,0.8)';
                  const glow = card.querySelector('[data-role="glow"]') as HTMLElement;
                  if (glow) glow.style.opacity = '0';

                }}
              >
                <div data-role="glow" style={{ position: 'absolute', top: '-80px', right: '-80px', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle at center, rgba(251,146,60,0.5) 0%, rgba(251,146,60,0) 78%)', opacity: 0, transition: 'opacity 0.25s ease', filter: 'blur(16px)', pointerEvents: 'none', zIndex: 0 }} />

                <div data-role="icon" style={{ position: 'absolute', top: '20px', right: '20px', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(13,16,34,0.98) 0%, rgba(13,16,34,0.92) 100%)', color: '#fdba74', border: '1px solid rgba(251,146,60,0.35)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2, isolation: 'isolate' }}>
                  <StoreIcon />
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', opacity: 0.9 }}>Active Outlets</h3>
                <p style={{ fontSize: '3.5rem', fontWeight: '900', margin: 0 }}>{data.outlets.toLocaleString()}</p>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>Click to manage outlets →</div>
              </div>
              
              {/* Three-Tier Rewards System Card */}
              <div 
              onClick={() => handleCardClick('sms-marketing')}
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)',
                color: 'white',
                padding: '2.5rem',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                position: 'relative',
                overflow: 'hidden',
                backdropFilter: 'blur(20px)',
                border: '2px solid rgba(16,185,129,0.8)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: 'translateY(0)'
              }}
              onMouseEnter={(e) => {
                const card = e.currentTarget as HTMLElement;
                card.style.transform = 'translateY(-5px)';
                card.style.boxShadow = '0 12px 40px rgba(16,185,129,0.3)';
                card.style.border = '2px solid rgba(16,185,129,1)';
                const glow = card.querySelector('[data-role="glow"]') as HTMLElement;
                if (glow) glow.style.opacity = '1';
                const closeBtn = card.querySelector('[data-role="close-btn"]') as HTMLElement;
                if (closeBtn) {
                  closeBtn.style.opacity = '1';
                  closeBtn.style.transform = 'scale(1)';
                }
              }}
              onMouseLeave={(e) => {
                const card = e.currentTarget as HTMLElement;
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
                card.style.border = '2px solid rgba(16,185,129,0.8)';
                const glow = card.querySelector('[data-role="glow"]') as HTMLElement;
                if (glow) glow.style.opacity = '0';
                const closeBtn = card.querySelector('[data-role="close-btn"]') as HTMLElement;
                if (closeBtn) {
                  closeBtn.style.opacity = '0';
                  closeBtn.style.transform = 'scale(0.8)';
                }
              }}
            >
                <div data-role="glow" style={{ position: 'absolute', top: '-80px', right: '-80px', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle at center, rgba(16,185,129,0.5) 0%, rgba(16,185,129,0) 78%)', opacity: 0, transition: 'opacity 0.25s ease', filter: 'blur(16px)', pointerEvents: 'none', zIndex: 0 }} />
                <div data-role="icon" style={{ position: 'absolute', top: '20px', right: '20px', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(13,16,34,0.98) 0%, rgba(13,16,34,0.92) 100%)', color: '#10b981', border: '1px solid rgba(16,185,129,0.4)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2, isolation: 'isolate' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', opacity: 0.9 }}>Rewards System</h3>
                <p style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0, color: '#10B981' }}>Promotions • Campaigns</p>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>Manage your loyalty rewards →</div>
              </div>

              {/* Admin Panel Card - Only for Authorized Users */}
              {isAuthorizedAdmin && (
                <div 
                  onClick={() => setShowAdminDashboard(true)}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.4) 0%, rgba(255,165,0,0.3) 100%)',
                    color: 'white',
                    padding: '2.5rem',
                    borderRadius: '20px',
                    boxShadow: '0 8px 32px rgba(255,215,0,0.3)',
                    position: 'relative',
                    overflow: 'hidden',
                    backdropFilter: 'blur(20px)',
                    border: '2px solid rgba(255,215,0,0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: 'translateY(0)'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.transform = 'translateY(-5px)';
                    (e.target as HTMLElement).style.boxShadow = '0 12px 40px rgba(255,215,0,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.transform = 'translateY(0)';
                    (e.target as HTMLElement).style.boxShadow = '0 8px 32px rgba(255,215,0,0.3)';
                  }}
                >
                  <div style={{ 
                    position: 'absolute', 
                    top: '20px', 
                    right: '20px', 
                    opacity: 0.4,
                    transform: 'scale(1.5)',
                    fontSize: '2rem'
                  }}>
                    👑
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', opacity: 0.9 }}>Admin Panel</h3>
                  <p style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, color: '#FFD700' }}>ADMIN</p>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>Manage users & settings →</div>
                </div>
              )}
            </div>
          </>
        )}
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
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        color: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        margin: 0,
        padding: 0
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2rem auto',
            boxShadow: '0 8px 32px rgba(255, 107, 107, 0.3)'
          }}>
            <span style={{ 
              fontSize: '2.5rem', 
              fontWeight: '900',
              color: 'white'
            }}>R</span>
          </div>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 2rem'
          }} />
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '600' }}>Rewin Dashboard</h2>
          <p style={{ margin: 0, opacity: 0.9 }}>Connecting to Firebase...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;
