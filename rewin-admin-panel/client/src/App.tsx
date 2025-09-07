import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import CustomersPage from './pages/CustomersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SystemPage from './pages/SystemPage';
import Layout from './components/Layout';
import UserDetailPage from './pages/UserDetailPage';
import UserAnalyticsPage from './pages/UserAnalyticsPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import OutletDetailPage from './pages/OutletDetailPage';
import OutletsPage from './pages/OutletsPage';
import UserTwilioPage from './pages/UserTwilioPage';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Main App Component
const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <div className="App">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
            },
          }}
        />
        
        <Routes>
          <Route 
            path="/login" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
            } 
          />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Layout>
                  <UsersPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <Layout>
                  <CustomersPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/outlets"
            element={
              <ProtectedRoute>
                <Layout>
                  <OutletsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Layout>
                  <AnalyticsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/system"
            element={
              <ProtectedRoute>
                <Layout>
                  <SystemPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/users/:userId"
            element={
              <ProtectedRoute>
                <Layout>
                  <UserDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/users/:userId/analytics"
            element={
              <ProtectedRoute>
                <Layout>
                  <UserAnalyticsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/users/:userId/twilio"
            element={
              <ProtectedRoute>
                <UserTwilioPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/customers/:customerId"
            element={
              <ProtectedRoute>
                <Layout>
                  <CustomerDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/outlets/:outletId"
            element={
              <ProtectedRoute>
                <Layout>
                  <OutletDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route 
            path="/" 
            element={<Navigate to="/dashboard" replace />} 
          />
          
          <Route 
            path="*" 
            element={<Navigate to="/dashboard" replace />} 
          />
        </Routes>
      </div>
    </Router>
  );
};

// App with Auth Provider
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App; 