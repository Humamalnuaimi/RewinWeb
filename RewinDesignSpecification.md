# Rewin Dashboard Design Specification

## 🎨 Complete Design System for Mobile App Development

This document provides a comprehensive breakdown of the Rewin Dashboard design system, extracted from the actual dashboard implementation. Use this as your complete guide for building a consistent mobile app that matches the web dashboard.

---

## 📋 Table of Contents

1. [Color System](#color-system)
2. [Typography](#typography)
3. [Layout & Spacing](#layout--spacing)
4. [Components](#components)
5. [Icons](#icons)
6. [Animations & Interactions](#animations--interactions)
7. [Mobile Adaptations](#mobile-adaptations)
8. [Implementation Guide](#implementation-guide)

---

## 🎨 Color System

### Primary Colors
```typescript
Primary Brand: #667eea (Blue-purple gradient base)
Primary Light: #818cf8
Primary Dark: #4f46e5
Primary Contrast: #ffffff (White text on primary)
```

### Background System (Dark Theme)
```typescript
Primary Background: #0b1021 (Main dark background)
Secondary Background: #151a33 (Secondary dark areas)
Tertiary Background: #0a1126 (Tertiary dark areas)
Card Background: rgba(255, 255, 255, 0.1) (Glass morphism)
Overlay Background: rgba(0, 0, 0, 0.5) (Modal overlays)
```

### Text Colors
```typescript
Primary Text: #ffffff (Main white text)
Secondary Text: rgba(255, 255, 255, 0.8) (80% opacity white)
Tertiary Text: rgba(255, 255, 255, 0.6) (60% opacity white)
Muted Text: rgba(255, 255, 255, 0.4) (40% opacity white)
Inverse Text: #2d3748 (Dark text for light backgrounds)
```

### Card Accent Colors (Top Border)
```typescript
Blue: #3b82f6 (Total Customers)
Purple: #8b5cf6 (Total Points)
Green: #10b981 (Total Revenue)
Orange: #f59e0b (Check-ins Today)
Pink: #ec4899 (New Signups Today)
Red: #ef4444 (Performance Alerts)
Cyan: #06b6d4 (Rewards System)
Yellow: #eab308 (Active Outlets)
```

### Status Colors
```typescript
Success: #4ade80 (Green)
Warning: #fbbf24 (Yellow)
Error: #ef4444 (Red)
Info: #3b82f6 (Blue)
```

### Interactive States
```typescript
Hover: rgba(255, 255, 255, 0.1)
Active: rgba(255, 255, 255, 0.2)
Disabled: rgba(255, 255, 255, 0.3)
Focus: #667eea (Primary blue)
```

### Border Colors
```typescript
Primary Border: rgba(255, 255, 255, 0.2)
Secondary Border: rgba(255, 255, 255, 0.1)
Accent Border: rgba(255, 255, 255, 0.3)
```

---

## 📝 Typography

### Font Family
```typescript
Primary: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif'
Secondary: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif'
```

### Font Sizes
```typescript
xs: 0.75rem (12px)
sm: 0.875rem (14px)
base: 1rem (16px)
lg: 1.125rem (18px)
xl: 1.25rem (20px)
2xl: 1.5rem (24px)
3xl: 1.875rem (30px)
4xl: 2.25rem (36px)
```

### Font Weights
```typescript
Light: 300
Normal: 400
Medium: 500
Semibold: 600
Bold: 700
```

### Line Heights
```typescript
Tight: 1.25
Normal: 1.5
Relaxed: 1.75
```

---

## 📐 Layout & Spacing

### Spacing Scale
```typescript
xs: 0.25rem (4px)
sm: 0.5rem (8px)
md: 1rem (16px)
lg: 1.5rem (24px)
xl: 2rem (32px)
2xl: 3rem (48px)
3xl: 4rem (64px)
4xl: 6rem (96px)
```

### Border Radius
```typescript
Small: 8px
Medium: 12px
Large: 16px
Extra Large: 20px
Full: 9999px (Circular)
```

### Shadows
```typescript
Card: 0 8px 40px rgba(0, 0, 0, 0.1)
Card Hover: 0 12px 40px rgba(0, 0, 0, 0.15)
Card Active: 0 4px 20px rgba(0, 0, 0, 0.2)
Button: 0 4px 14px 0 rgba(0, 0, 0, 0.1)
Modal: 0 25px 50px -12px rgba(0, 0, 0, 0.25)
Dropdown: 0 10px 25px rgba(0, 0, 0, 0.1)
```

---

## 🧩 Components

### Dashboard Cards

#### Structure
- **Glass morphism background**: `rgba(255, 255, 255, 0.1)`
- **Backdrop blur**: `blur(20px)`
- **Border**: `1px solid rgba(255, 255, 255, 0.2)`
- **Top accent border**: `4px solid [accent-color]`
- **Padding**: `24px`
- **Border radius**: `20px`

#### Header Section
- **Icon container**: 40x40px, accent color background, 8px border radius
- **Title**: White text, 20px font size, semibold weight
- **Gap between icon and title**: 16px

#### Value Section
- **Font size**: 36px (4xl)
- **Font weight**: Bold (700)
- **Color**: White (#ffffff)
- **Line height**: Tight (1.25)

#### Subtitle Section
- **Color**: `rgba(255, 255, 255, 0.8)`
- **Font size**: 14px (sm)
- **Includes arrow icon** for clickable cards

#### Hover Effects
- **Transform**: `translateY(-2px)`
- **Enhanced shadow**: Card hover shadow + accent color glow
- **Transition**: `all 0.3s ease-in-out`

### Header Component

#### Structure
- **Background**: Glass morphism card background
- **Backdrop blur**: `blur(20px)`
- **Border bottom**: `1px solid rgba(255, 255, 255, 0.2)`
- **Padding**: `24px 32px`

#### Logo Section
- **Size**: 48x48px
- **Background**: Primary brand color (#667eea)
- **Border radius**: 12px
- **Text**: "R" in white, 20px, bold

#### Title Section
- **Main title**: 24px, bold, white
- **Subtitle**: 14px, secondary text color

#### User Section
- **Welcome text**: Secondary text color, 14px
- **Email**: White text, 16px, medium weight
- **Sign out button**: Glass morphism style

### Buttons

#### Primary Button
- **Background**: Primary brand color (#667eea)
- **Text**: White
- **Border**: 1px solid primary color
- **Padding**: 16px 24px (medium size)
- **Border radius**: 12px
- **Font weight**: Medium (500)

#### Secondary Button
- **Background**: Glass morphism card background
- **Text**: White
- **Border**: 1px solid border primary
- **Same padding and radius as primary**

#### Button Sizes
- **Small**: 8px 16px padding, 14px font
- **Medium**: 16px 24px padding, 16px font
- **Large**: 24px 32px padding, 18px font

### Input Fields

#### Structure
- **Background**: Glass morphism card background
- **Border**: `2px solid rgba(255, 255, 255, 0.2)`
- **Border radius**: 12px
- **Padding**: 16px
- **Font size**: 16px
- **Color**: White text

#### Focus State
- **Border color**: Primary brand color (#667eea)
- **Transition**: `border-color 0.2s`

#### Error State
- **Border color**: Error red (#ef4444)
- **Error text**: Error red, 14px, below input

---

## 🎯 Icons

### Icon System
All icons are **24x24px SVG** with `currentColor` fill for easy theming.

#### Available Icons
- **Analytics**: Chart/graph icon
- **Users**: People/users icon
- **Store**: Shop/building icon
- **Revenue**: Dollar sign icon
- **Signup**: User plus icon
- **CheckIn**: Checkmark icon
- **Points**: Star icon
- **Rewards**: Badge/award icon
- **Settings**: Gear icon
- **Menu**: Hamburger menu
- **Close**: X icon
- **Arrow Right**: Chevron right

#### Icon Usage in Cards
- **Container**: 40x40px
- **Background**: Accent color for the card
- **Border radius**: 8px
- **Icon color**: White
- **Centered**: Flex center alignment

---

## ✨ Animations & Interactions

### Transitions
```typescript
Fast: 0.15s
Normal: 0.3s
Slow: 0.5s
```

### Easing Functions
```typescript
Ease: ease
Ease In: ease-in
Ease Out: ease-out
Ease In Out: ease-in-out
```

### Card Hover Animation
1. **Transform**: `translateY(-2px)` (lift effect)
2. **Shadow**: Enhanced shadow with accent color glow
3. **Duration**: 0.3s ease-in-out
4. **Return**: Smooth return to original state

### Loading States
- **Skeleton loading**: Pulsing gray rectangles
- **Spinner**: Rotating border animation
- **Duration**: 2s infinite for pulse, 1s linear infinite for spin

### Button Interactions
- **Hover**: Slight background color change
- **Active**: Pressed state with darker background
- **Focus**: Focus ring in primary color
- **Disabled**: 60% opacity, no pointer events

---

## 📱 Mobile Adaptations

### Responsive Breakpoints
```typescript
Mobile: 480px and below
Tablet: 768px and below
Desktop: 1024px and above
Wide: 1200px and above
```

### Mobile Layout Changes

#### Grid System
- **Desktop**: 3 columns for main cards
- **Tablet**: 2 columns
- **Mobile**: 1 column (single column stack)

#### Spacing Adjustments
- **Desktop padding**: 32px
- **Mobile padding**: 16px
- **Card gaps**: Reduced from 24px to 16px on mobile

#### Typography Scaling
- **Main values**: Slightly smaller on mobile (3xl instead of 4xl)
- **Titles**: Responsive scaling
- **Subtitles**: Maintain readability

#### Touch Targets
- **Minimum size**: 44px for touch targets
- **Button padding**: Increased for better touch experience
- **Card tap areas**: Full card clickable

#### Header Adaptations
- **Mobile**: Show hamburger menu
- **Simplified**: Reduced padding and spacing
- **Logo**: Slightly smaller on mobile

---

## 🛠 Implementation Guide

### Getting Started

1. **Install the theme system**:
   ```typescript
   import { rewinTheme } from './RewinThemeSystem';
   ```

2. **Use components**:
   ```typescript
   import { DashboardCard, Header, Button } from './RewinComponents';
   ```

3. **Apply layouts**:
   ```typescript
   import { MainLayout, ResponsiveGrid, Section } from './RewinLayoutSystem';
   ```

### React Native Adaptations

#### Colors
```typescript
// Use the same color values
const colors = rewinTheme.colors;
```

#### Typography
```typescript
// Adapt font families for React Native
fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto'
```

#### Shadows
```typescript
// React Native shadow props
shadowColor: '#000',
shadowOffset: { width: 0, height: 8 },
shadowOpacity: 0.1,
shadowRadius: 40,
elevation: 8, // Android
```

#### Backdrop Blur
```typescript
// Use react-native-blur or similar
import { BlurView } from '@react-native-blur/blur';
```

### Flutter Adaptations

#### Theme Data
```dart
final rewinTheme = ThemeData(
  primaryColor: Color(0xFF667eea),
  backgroundColor: Color(0xFF0b1021),
  // ... other colors
);
```

#### Glass Morphism
```dart
Container(
  decoration: BoxDecoration(
    color: Colors.white.withOpacity(0.1),
    borderRadius: BorderRadius.circular(20),
    border: Border.all(
      color: Colors.white.withOpacity(0.2),
    ),
  ),
  child: BackdropFilter(
    filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
    child: // Your content
  ),
)
```

### Native iOS/Android

#### iOS (SwiftUI)
```swift
struct GlassMorphismCard: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 20)
            .fill(Color.white.opacity(0.1))
            .background(.ultraThinMaterial)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
            )
    }
}
```

#### Android (Compose)
```kotlin
@Composable
fun GlassMorphismCard() {
    Card(
        modifier = Modifier.blur(20.dp),
        backgroundColor = Color.White.copy(alpha = 0.1f),
        shape = RoundedCornerShape(20.dp),
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f))
    ) {
        // Content
    }
}
```

---

## 📊 Dashboard Data Structure

### Expected Data Format
```typescript
interface DashboardData {
  totalCustomers: number;
  totalPoints: number;
  totalRevenue: number;
  checkInsToday: number;
  newSignupsToday: number;
  activeOutlets: number;
  loading: boolean;
}
```

### API Integration Points
- **GET /api/dashboard/overview**: Main dashboard data
- **GET /api/customers/count**: Total customers
- **GET /api/points/total**: Total points
- **GET /api/revenue/total**: Total revenue
- **GET /api/checkins/today**: Today's check-ins
- **GET /api/signups/today**: Today's signups
- **GET /api/outlets/active**: Active outlets count

---

## 🎯 Key Design Principles

1. **Glass Morphism**: Consistent use of semi-transparent backgrounds with blur effects
2. **Dark Theme**: Primary dark background with light text
3. **Accent Colors**: Unique top border colors for different card types
4. **Smooth Interactions**: Subtle hover effects and transitions
5. **Responsive Design**: Mobile-first approach with progressive enhancement
6. **Accessibility**: High contrast ratios and proper touch targets
7. **Consistency**: Unified spacing, typography, and color usage

---

## 📝 Notes for Mobile Development

- **Performance**: Use native blur effects when available
- **Accessibility**: Ensure proper contrast ratios (already built into color system)
- **Touch Targets**: Minimum 44px for iOS, 48dp for Android
- **Safe Areas**: Account for notches and home indicators
- **Loading States**: Implement skeleton screens for better UX
- **Error Handling**: Use the defined error colors and patterns
- **Offline Support**: Consider cached data display

---

This specification provides everything needed to recreate the Rewin Dashboard design in any mobile platform while maintaining consistency with the web version.

