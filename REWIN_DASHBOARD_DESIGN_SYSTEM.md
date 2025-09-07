# 🎨 Rewin Dashboard - Complete Design System Documentation

## 📱 **Overview**
This document provides a comprehensive breakdown of the Rewin Dashboard design system, including all colors, components, typography, icons, and layout specifications for consistent implementation across web and mobile platforms.

---

## 🎨 **Color Palette**

### **Primary Colors**
```css
/* Main Background */
--background-primary: #1a1d29;           /* Dark navy background */
--background-secondary: #252837;         /* Card background */
--background-tertiary: #2d3142;          /* Slightly lighter card variant */

/* Brand Colors */
--brand-primary: #ff6b35;                /* Orange accent (R logo) */
--brand-secondary: #4a90e2;              /* Blue accent */

/* Text Colors */
--text-primary: #ffffff;                 /* Primary white text */
--text-secondary: #a0a3b1;               /* Secondary gray text */
--text-muted: #6b7280;                   /* Muted text for descriptions */

/* Accent Colors */
--accent-blue: #3b82f6;                  /* Blue icons/accents */
--accent-purple: #8b5cf6;                /* Purple icons/accents */
--accent-green: #10b981;                 /* Green icons/accents */
--accent-orange: #f59e0b;                /* Orange icons/accents */
--accent-pink: #ec4899;                  /* Pink icons/accents */
--accent-cyan: #06b6d4;                  /* Cyan icons/accents */
```

### **Gradient Overlays**
```css
/* Card Gradients */
--gradient-blue: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
--gradient-purple: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
--gradient-green: linear-gradient(135deg, #10b981 0%, #047857 100%);
--gradient-orange: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
--gradient-pink: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
--gradient-cyan: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
```

---

## 🔤 **Typography**

### **Font Family**
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### **Font Sizes & Weights**
```css
/* Headers */
--font-size-h1: 2.5rem;     /* 40px - Main title */
--font-size-h2: 2rem;       /* 32px - Section headers */
--font-size-h3: 1.5rem;     /* 24px - Card titles */

/* Body Text */
--font-size-large: 3rem;    /* 48px - Large numbers */
--font-size-body: 1rem;     /* 16px - Regular text */
--font-size-small: 0.875rem; /* 14px - Small text */
--font-size-xs: 0.75rem;    /* 12px - Extra small text */

/* Font Weights */
--font-weight-light: 300;
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

---

## 🏗️ **Layout Structure**

### **Main Container**
```css
.dashboard-container {
  background: #1a1d29;
  min-height: 100vh;
  padding: 0;
  font-family: 'Inter', sans-serif;
}
```

### **Header Section**
```css
.header {
  background: #252837;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
```

### **Content Grid**
```css
.dashboard-grid {
  padding: 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}
```

---

## 🎯 **Component Specifications**

### **1. Header Components**

#### **Logo Section**
```css
.logo-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: #ff6b35;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1.25rem;
}

.logo-text {
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 600;
}

.logo-subtitle {
  color: #a0a3b1;
  font-size: 0.875rem;
  font-weight: 400;
}
```

#### **Outlet Selector**
```css
.outlet-selector {
  background: #2d3142;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  color: #ffffff;
  font-size: 0.875rem;
  min-width: 200px;
}
```

#### **User Section**
```css
.user-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info {
  text-align: right;
}

.welcome-text {
  color: #a0a3b1;
  font-size: 0.875rem;
}

.user-email {
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 500;
}

.sign-out-btn {
  background: #2d3142;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  color: #ffffff;
  font-size: 0.875rem;
}
```

### **2. Dashboard Title**
```css
.dashboard-title {
  text-align: center;
  color: #ffffff;
  font-size: 2.5rem;
  font-weight: 600;
  margin: 2rem 0;
}
```

### **3. Metric Cards**

#### **Base Card Style**
```css
.metric-card {
  background: #252837;
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--card-accent-color);
}
```

#### **Card Header**
```css
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.card-title {
  color: #ffffff;
  font-size: 1.125rem;
  font-weight: 500;
}

.card-icon {
  width: 24px;
  height: 24px;
  opacity: 0.8;
}
```

#### **Card Value**
```css
.card-value {
  color: #ffffff;
  font-size: 3rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 0.5rem;
}
```

#### **Card Description**
```css
.card-description {
  color: #a0a3b1;
  font-size: 0.875rem;
  font-weight: 400;
}
```

### **4. Specific Card Variants**

#### **Total Customers Card**
```css
.customers-card {
  --card-accent-color: #3b82f6;
}

.customers-card .card-icon {
  color: #3b82f6;
}
```

#### **Total Points Card**
```css
.points-card {
  --card-accent-color: #8b5cf6;
}

.points-card .card-icon {
  color: #8b5cf6;
}
```

#### **Total Revenue Card**
```css
.revenue-card {
  --card-accent-color: #10b981;
}

.revenue-card .card-icon {
  color: #10b981;
}
```

#### **Check-ins Today Card**
```css
.checkins-card {
  --card-accent-color: #f59e0b;
}

.checkins-card .card-icon {
  color: #f59e0b;
}
```

#### **New Signups Card**
```css
.signups-card {
  --card-accent-color: #ec4899;
}

.signups-card .card-icon {
  color: #ec4899;
}
```

#### **Active Outlets Card**
```css
.outlets-card {
  --card-accent-color: #f59e0b;
}

.outlets-card .card-icon {
  color: #f59e0b;
}
```

### **5. Rewards System Card**

#### **Special Large Card**
```css
.rewards-card {
  --card-accent-color: #06b6d4;
  grid-column: span 1;
  min-height: 200px;
}

.rewards-card .card-icon {
  color: #06b6d4;
}

.rewards-title {
  color: #ffffff;
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.rewards-sections {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rewards-section {
  color: #10b981;
  font-size: 1.125rem;
  font-weight: 500;
}

.rewards-section:nth-child(2) {
  color: #06b6d4;
}

.rewards-description {
  color: #a0a3b1;
  font-size: 0.875rem;
  margin-top: 1rem;
}
```

---

## 🎨 **Icon System**

### **Icon Specifications**
```css
.dashboard-icon {
  width: 24px;
  height: 24px;
  stroke-width: 2;
  opacity: 0.8;
}
```

### **Icon Mapping**
- **Total Customers**: 👥 Users icon (blue)
- **Total Points**: ⭐ Star icon (purple)
- **Total Revenue**: 💰 Dollar sign icon (green)
- **Check-ins Today**: 📊 Bar chart icon (orange)
- **New Signups**: 👤 User plus icon (pink)
- **Active Outlets**: 🏪 Store icon (orange)
- **Rewards System**: 📋 Clipboard icon (cyan)

---

## 📱 **Responsive Design**

### **Breakpoints**
```css
/* Mobile */
@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    padding: 1rem;
    gap: 1rem;
  }
  
  .header {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
  }
  
  .dashboard-title {
    font-size: 2rem;
  }
  
  .card-value {
    font-size: 2.5rem;
  }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop */
@media (min-width: 1025px) {
  .dashboard-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

---

## 🎯 **Interactive States**

### **Button Hover States**
```css
.interactive-element:hover {
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-2px);
  transition: all 0.2s ease;
}

.metric-card:hover {
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}
```

### **Click States**
```css
.interactive-element:active {
  transform: translateY(0);
  transition: all 0.1s ease;
}
```

---

## 🔧 **Implementation Guidelines**

### **Mobile App Considerations**

#### **React Native Styling**
```javascript
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1d29',
    flex: 1,
  },
  
  card: {
    backgroundColor: '#252837',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  cardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '500',
  },
  
  cardValue: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 48,
  },
  
  cardDescription: {
    color: '#a0a3b1',
    fontSize: 14,
    fontWeight: '400',
  },
});
```

#### **Flutter Styling**
```dart
class AppTheme {
  static const Color backgroundPrimary = Color(0xFF1A1D29);
  static const Color backgroundSecondary = Color(0xFF252837);
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFA0A3B1);
  
  static const TextStyle cardTitle = TextStyle(
    color: textPrimary,
    fontSize: 18,
    fontWeight: FontWeight.w500,
  );
  
  static const TextStyle cardValue = TextStyle(
    color: textPrimary,
    fontSize: 48,
    fontWeight: FontWeight.w700,
    height: 1.0,
  );
}
```

---

## 📋 **Component Checklist**

### **Header Components**
- [ ] Logo with orange background (#ff6b35)
- [ ] Company name and subtitle
- [ ] Outlet selector dropdown
- [ ] User welcome message
- [ ] Sign out button

### **Dashboard Cards**
- [ ] Total Customers (blue accent)
- [ ] Total Points (purple accent)
- [ ] Total Revenue (green accent)
- [ ] Check-ins Today (orange accent)
- [ ] New Signups Today (pink accent)
- [ ] Active Outlets (orange accent)
- [ ] Rewards System (cyan accent)

### **Interactive Elements**
- [ ] Hover effects on cards
- [ ] Click animations
- [ ] Responsive grid layout
- [ ] Proper icon implementation

### **Typography**
- [ ] Inter font family
- [ ] Proper font weights and sizes
- [ ] Color hierarchy implementation

---

## 🎨 **Design Assets**

### **Required Icons** (Lucide React/React Native Vector Icons)
```javascript
import {
  Users,           // Total Customers
  Star,            // Total Points
  DollarSign,      // Total Revenue
  BarChart3,       // Check-ins Today
  UserPlus,        // New Signups
  Store,           // Active Outlets
  ClipboardList    // Rewards System
} from 'lucide-react';
```

### **Color Variables Export**
```javascript
export const colors = {
  background: {
    primary: '#1a1d29',
    secondary: '#252837',
    tertiary: '#2d3142',
  },
  text: {
    primary: '#ffffff',
    secondary: '#a0a3b1',
    muted: '#6b7280',
  },
  accent: {
    blue: '#3b82f6',
    purple: '#8b5cf6',
    green: '#10b981',
    orange: '#f59e0b',
    pink: '#ec4899',
    cyan: '#06b6d4',
  },
  brand: {
    primary: '#ff6b35',
    secondary: '#4a90e2',
  },
};
```

---

## 📱 **Mobile Implementation Notes**

### **Key Differences for Mobile**
1. **Navigation**: Replace header with mobile navigation (tab bar or drawer)
2. **Grid Layout**: Single column on mobile, 2 columns on tablet
3. **Touch Targets**: Minimum 44px touch targets for iOS, 48dp for Android
4. **Safe Areas**: Account for notches and home indicators
5. **Gestures**: Implement pull-to-refresh and swipe gestures

### **Platform-Specific Considerations**
- **iOS**: Use SF Symbols for icons where possible
- **Android**: Use Material Design icons
- **Both**: Implement proper accessibility labels and semantic markup

---

*This design system ensures consistent visual identity across web and mobile platforms while maintaining the sophisticated dark theme and professional appearance of the Rewin Dashboard.*


