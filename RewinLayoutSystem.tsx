/**
 * REWIN LAYOUT SYSTEM
 * Layout components and utilities for building consistent dashboard layouts
 * Based on the Rewin Dashboard design patterns
 */

import React, { ReactNode, CSSProperties } from 'react';
import { rewinTheme } from './RewinThemeSystem';

// ============================================================================
// MAIN LAYOUT CONTAINER
// ============================================================================

export interface MainLayoutProps {
  children: ReactNode;
  style?: CSSProperties;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, style = {} }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: rewinTheme.gradients.primary,
        fontFamily: rewinTheme.typography.fontFamily.primary,
        color: rewinTheme.colors.text.primary,
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// DASHBOARD GRID LAYOUT
// ============================================================================

export interface DashboardGridProps {
  children: ReactNode;
  columns?: number;
  gap?: string;
  style?: CSSProperties;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  children,
  columns = 3,
  gap = rewinTheme.spacing.lg,
  style = {},
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
        padding: rewinTheme.spacing.xl,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// RESPONSIVE GRID (Mobile-First)
// ============================================================================

export interface ResponsiveGridProps {
  children: ReactNode;
  gap?: string;
  style?: CSSProperties;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  gap = rewinTheme.spacing.lg,
  style = {},
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap,
        padding: rewinTheme.spacing.xl,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// CARD CONTAINER
// ============================================================================

export interface CardContainerProps {
  children: ReactNode;
  padding?: string;
  style?: CSSProperties;
}

export const CardContainer: React.FC<CardContainerProps> = ({
  children,
  padding = rewinTheme.spacing.lg,
  style = {},
}) => {
  return (
    <div
      style={{
        background: rewinTheme.colors.background.card,
        borderRadius: rewinTheme.borderRadius.xl,
        border: `1px solid ${rewinTheme.colors.border.primary}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: rewinTheme.shadows.card,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// SECTION CONTAINER
// ============================================================================

export interface SectionProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  headerAction?: ReactNode;
  style?: CSSProperties;
}

export const Section: React.FC<SectionProps> = ({
  title,
  subtitle,
  children,
  headerAction,
  style = {},
}) => {
  return (
    <section
      style={{
        marginBottom: rewinTheme.spacing['2xl'],
        ...style,
      }}
    >
      {(title || subtitle || headerAction) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: rewinTheme.spacing.xl,
            padding: `0 ${rewinTheme.spacing.xl}`,
          }}
        >
          <div>
            {title && (
              <h2
                style={{
                  color: rewinTheme.colors.text.primary,
                  fontSize: rewinTheme.typography.fontSize['3xl'],
                  fontWeight: rewinTheme.typography.fontWeight.bold,
                  margin: 0,
                  marginBottom: subtitle ? rewinTheme.spacing.xs : 0,
                  lineHeight: rewinTheme.typography.lineHeight.tight,
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                style={{
                  color: rewinTheme.colors.text.secondary,
                  fontSize: rewinTheme.typography.fontSize.lg,
                  margin: 0,
                  lineHeight: rewinTheme.typography.lineHeight.normal,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </section>
  );
};

// ============================================================================
// FLEX LAYOUTS
// ============================================================================

export interface FlexProps {
  children: ReactNode;
  direction?: 'row' | 'column';
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  gap?: string;
  wrap?: boolean;
  style?: CSSProperties;
}

export const Flex: React.FC<FlexProps> = ({
  children,
  direction = 'row',
  align = 'stretch',
  justify = 'flex-start',
  gap = '0',
  wrap = false,
  style = {},
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        alignItems: align,
        justifyContent: justify,
        gap,
        flexWrap: wrap ? 'wrap' : 'nowrap',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// SPACER COMPONENT
// ============================================================================

export interface SpacerProps {
  size?: keyof typeof rewinTheme.spacing;
  horizontal?: boolean;
}

export const Spacer: React.FC<SpacerProps> = ({ size = 'md', horizontal = false }) => {
  const spacingValue = rewinTheme.spacing[size];
  
  return (
    <div
      style={{
        width: horizontal ? spacingValue : '1px',
        height: horizontal ? '1px' : spacingValue,
        flexShrink: 0,
      }}
    />
  );
};

// ============================================================================
// SIDEBAR LAYOUT
// ============================================================================

export interface SidebarLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  sidebarWidth?: string;
  style?: CSSProperties;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  sidebar,
  children,
  sidebarWidth = '280px',
  style = {},
}) => {
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        ...style,
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarWidth,
          background: rewinTheme.colors.background.secondary,
          borderRight: `1px solid ${rewinTheme.colors.border.primary}`,
          overflow: 'auto',
          flexShrink: 0,
        }}
      >
        {sidebar}
      </aside>
      
      {/* Main Content */}
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          background: rewinTheme.colors.background.primary,
        }}
      >
        {children}
      </main>
    </div>
  );
};

// ============================================================================
// MOBILE LAYOUT UTILITIES
// ============================================================================

export interface MobileContainerProps {
  children: ReactNode;
  padding?: string;
  style?: CSSProperties;
}

export const MobileContainer: React.FC<MobileContainerProps> = ({
  children,
  padding = rewinTheme.spacing.md,
  style = {},
}) => {
  return (
    <div
      style={{
        maxWidth: '100%',
        padding,
        margin: '0 auto',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// SCROLLABLE CONTAINER
// ============================================================================

export interface ScrollableContainerProps {
  children: ReactNode;
  maxHeight?: string;
  showScrollbar?: boolean;
  style?: CSSProperties;
}

export const ScrollableContainer: React.FC<ScrollableContainerProps> = ({
  children,
  maxHeight = '400px',
  showScrollbar = false,
  style = {},
}) => {
  return (
    <div
      style={{
        maxHeight,
        overflow: 'auto',
        scrollbarWidth: showScrollbar ? 'auto' : 'none',
        msOverflowStyle: showScrollbar ? 'auto' : 'none',
        ...style,
        ...(showScrollbar ? {} : {
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        }),
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// STICKY HEADER
// ============================================================================

export interface StickyHeaderProps {
  children: ReactNode;
  top?: string;
  zIndex?: number;
  style?: CSSProperties;
}

export const StickyHeader: React.FC<StickyHeaderProps> = ({
  children,
  top = '0',
  zIndex = 100,
  style = {},
}) => {
  return (
    <div
      style={{
        position: 'sticky',
        top,
        zIndex,
        background: rewinTheme.colors.background.card,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${rewinTheme.colors.border.primary}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// RESPONSIVE UTILITIES
// ============================================================================

export const breakpoints = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1200px',
};

export const mediaQueries = {
  mobile: `@media (max-width: ${breakpoints.mobile})`,
  tablet: `@media (max-width: ${breakpoints.tablet})`,
  desktop: `@media (min-width: ${breakpoints.desktop})`,
  wide: `@media (min-width: ${breakpoints.wide})`,
};

// ============================================================================
// LAYOUT HOOKS (for React Native/Mobile)
// ============================================================================

export interface LayoutDimensions {
  width: number;
  height: number;
}

// This would be implemented differently in React Native
export const useLayout = (): LayoutDimensions => {
  // In a real mobile app, this would use Dimensions from react-native
  return {
    width: typeof window !== 'undefined' ? window.innerWidth : 375,
    height: typeof window !== 'undefined' ? window.innerHeight : 812,
  };
};

// ============================================================================
// SAFE AREA (for mobile apps)
// ============================================================================

export interface SafeAreaProps {
  children: ReactNode;
  style?: CSSProperties;
}

export const SafeArea: React.FC<SafeAreaProps> = ({ children, style = {} }) => {
  return (
    <div
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default {
  MainLayout,
  DashboardGrid,
  ResponsiveGrid,
  CardContainer,
  Section,
  Flex,
  Spacer,
  SidebarLayout,
  MobileContainer,
  ScrollableContainer,
  StickyHeader,
  SafeArea,
  breakpoints,
  mediaQueries,
  useLayout,
};

