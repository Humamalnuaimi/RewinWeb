/**
 * REWIN DASHBOARD EXAMPLE
 * Complete example showing how to use all components together
 * This recreates the exact dashboard shown in the screenshot
 */

import React, { useState, useEffect } from 'react';
import {
  DashboardCard,
  Header,
  Button,
  RewinIcons,
  LoadingSpinner,
} from './RewinComponents';
import {
  MainLayout,
  ResponsiveGrid,
  Section,
  Flex,
  Spacer,
} from './RewinLayoutSystem';
import { rewinTheme } from './RewinThemeSystem';

// ============================================================================
// MOCK DATA (Replace with real API calls)
// ============================================================================

interface DashboardData {
  totalCustomers: number;
  totalPoints: number;
  totalRevenue: number;
  checkInsToday: number;
  newSignupsToday: number;
  activeOutlets: number;
  loading: boolean;
}

const mockData: DashboardData = {
  totalCustomers: 6,
  totalPoints: 550,
  totalRevenue: 555,
  checkInsToday: 19,
  newSignupsToday: 1,
  activeOutlets: 4,
  loading: false,
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export const RewinDashboardExample: React.FC = () => {
  const [data, setData] = useState<DashboardData>({ ...mockData, loading: true });
  const [selectedOutlet, setSelectedOutlet] = useState('All Outlets (4)');

  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setData({ ...mockData, loading: false });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleSignOut = () => {
    console.log('Sign out clicked');
    // Implement sign out logic
  };

  const handleCardClick = (cardType: string) => {
    console.log(`${cardType} card clicked`);
    // Navigate to detailed view
  };

  return (
    <MainLayout>
      {/* Header */}
      <Header
        title="Rewin Dashboard"
        subtitle="Loyalty Program Management"
        userEmail="puma@gmail.com"
        onSignOut={handleSignOut}
      />

      {/* Main Dashboard Content */}
      <Section
        title="Dashboard Overview"
        headerAction={
          <Flex align="center" gap={rewinTheme.spacing.md}>
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              style={{
                background: rewinTheme.colors.background.card,
                border: `1px solid ${rewinTheme.colors.border.primary}`,
                borderRadius: rewinTheme.borderRadius.md,
                color: rewinTheme.colors.text.primary,
                padding: `${rewinTheme.spacing.sm} ${rewinTheme.spacing.md}`,
                fontSize: rewinTheme.typography.fontSize.sm,
                cursor: 'pointer',
              }}
            >
              <option value="All Outlets (4)">All Outlets (4)</option>
              <option value="Outlet 1">Outlet 1</option>
              <option value="Outlet 2">Outlet 2</option>
              <option value="Outlet 3">Outlet 3</option>
              <option value="Outlet 4">Outlet 4</option>
            </select>
          </Flex>
        }
      >
        {/* Top Row - Main Metrics */}
        <ResponsiveGrid>
          <DashboardCard
            title="Total Customers"
            value={data.loading ? 0 : data.totalCustomers}
            subtitle="All outlets • Click to view details →"
            icon={<RewinIcons.Users />}
            accentColor="blue"
            loading={data.loading}
            onClick={() => handleCardClick('Total Customers')}
          />

          <DashboardCard
            title="Total Points"
            value={data.loading ? 0 : data.totalPoints}
            subtitle="All outlets • Click to view details →"
            icon={<RewinIcons.Points />}
            accentColor="purple"
            loading={data.loading}
            onClick={() => handleCardClick('Total Points')}
          />

          <DashboardCard
            title="Total Revenue"
            value={data.loading ? '$0' : `$${data.totalRevenue}`}
            subtitle="All outlets"
            icon={<RewinIcons.Revenue />}
            accentColor="green"
            loading={data.loading}
            onClick={() => handleCardClick('Total Revenue')}
          />
        </ResponsiveGrid>

        <Spacer size="lg" />

        {/* Second Row - Daily Metrics */}
        <ResponsiveGrid>
          <DashboardCard
            title="Check-ins Today"
            value={data.loading ? 0 : data.checkInsToday}
            subtitle="All outlets • Click to view details →"
            icon={<RewinIcons.CheckIn />}
            accentColor="orange"
            loading={data.loading}
            onClick={() => handleCardClick('Check-ins Today')}
          />

          <DashboardCard
            title="New Signups Today"
            value={data.loading ? 0 : data.newSignupsToday}
            subtitle="All outlets • Click to view details →"
            icon={<RewinIcons.Signup />}
            accentColor="pink"
            loading={data.loading}
            onClick={() => handleCardClick('New Signups Today')}
          />

          <DashboardCard
            title="Active Outlets"
            value={data.loading ? 0 : data.activeOutlets}
            subtitle="Click to manage outlets →"
            icon={<RewinIcons.Store />}
            accentColor="yellow"
            loading={data.loading}
            onClick={() => handleCardClick('Active Outlets')}
          />
        </ResponsiveGrid>

        <Spacer size="lg" />

        {/* Bottom Row - Rewards System */}
        <ResponsiveGrid columns={2}>
          <DashboardCard
            title="Rewards System"
            value=""
            subtitle="Manage your loyalty rewards →"
            icon={<RewinIcons.Rewards />}
            accentColor="cyan"
            loading={data.loading}
            onClick={() => handleCardClick('Rewards System')}
            style={{
              gridColumn: 'span 1',
              minHeight: '200px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          />

          {/* Quick Actions */}
          <div
            style={{
              background: rewinTheme.colors.background.card,
              borderRadius: rewinTheme.borderRadius.xl,
              border: `1px solid ${rewinTheme.colors.border.primary}`,
              borderTop: `4px solid ${rewinTheme.colors.accents.red}`,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: rewinTheme.shadows.card,
              padding: rewinTheme.spacing.lg,
              display: 'flex',
              flexDirection: 'column',
              gap: rewinTheme.spacing.md,
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: rewinTheme.spacing.md,
              marginBottom: rewinTheme.spacing.md,
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: rewinTheme.colors.accents.red,
                borderRadius: rewinTheme.borderRadius.sm,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <RewinIcons.Settings />
              </div>
              <h3 style={{
                color: rewinTheme.colors.text.primary,
                margin: 0,
                fontSize: rewinTheme.typography.fontSize.xl,
                fontWeight: rewinTheme.typography.fontWeight.semibold,
              }}>
                Quick Actions
              </h3>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={<RewinIcons.Users />}
              onClick={() => console.log('Add Customer clicked')}
            >
              Add Customer
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<RewinIcons.Store />}
              onClick={() => console.log('Add Outlet clicked')}
            >
              Add Outlet
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<RewinIcons.Analytics />}
              onClick={() => console.log('View Analytics clicked')}
            >
              View Analytics
            </Button>
          </div>
        </ResponsiveGrid>
      </Section>

      {/* Loading Overlay */}
      {data.loading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: rewinTheme.colors.background.card,
              borderRadius: rewinTheme.borderRadius.xl,
              padding: rewinTheme.spacing['2xl'],
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: rewinTheme.spacing.lg,
            }}
          >
            <LoadingSpinner size="lg" />
            <p
              style={{
                color: rewinTheme.colors.text.primary,
                fontSize: rewinTheme.typography.fontSize.lg,
                margin: 0,
              }}
            >
              Loading dashboard data...
            </p>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

// ============================================================================
// MOBILE-OPTIMIZED VERSION
// ============================================================================

export const RewinMobileDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>({ ...mockData, loading: true });

  useEffect(() => {
    const timer = setTimeout(() => {
      setData({ ...mockData, loading: false });
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <MainLayout>
      {/* Mobile Header */}
      <Header
        title="Rewin"
        userEmail="puma@gmail.com"
        onSignOut={() => console.log('Sign out')}
        showMenu={true}
        onMenuClick={() => console.log('Menu clicked')}
      />

      {/* Mobile Dashboard Grid - Single Column */}
      <Section title="Dashboard">
        <ResponsiveGrid columns={1} gap={rewinTheme.spacing.md}>
          <DashboardCard
            title="Total Customers"
            value={data.totalCustomers}
            subtitle="Tap to view details"
            icon={<RewinIcons.Users />}
            accentColor="blue"
            loading={data.loading}
          />

          <DashboardCard
            title="Total Points"
            value={data.totalPoints}
            subtitle="Tap to view details"
            icon={<RewinIcons.Points />}
            accentColor="purple"
            loading={data.loading}
          />

          <DashboardCard
            title="Total Revenue"
            value={`$${data.totalRevenue}`}
            icon={<RewinIcons.Revenue />}
            accentColor="green"
            loading={data.loading}
          />

          <DashboardCard
            title="Check-ins Today"
            value={data.checkInsToday}
            icon={<RewinIcons.CheckIn />}
            accentColor="orange"
            loading={data.loading}
          />

          <DashboardCard
            title="New Signups"
            value={data.newSignupsToday}
            icon={<RewinIcons.Signup />}
            accentColor="pink"
            loading={data.loading}
          />

          <DashboardCard
            title="Active Outlets"
            value={data.activeOutlets}
            subtitle="Tap to manage"
            icon={<RewinIcons.Store />}
            accentColor="yellow"
            loading={data.loading}
          />
        </ResponsiveGrid>
      </Section>
    </MainLayout>
  );
};

export default RewinDashboardExample;

