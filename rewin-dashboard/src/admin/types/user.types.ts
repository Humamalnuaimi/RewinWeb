// FEATURE: User Types
// FILE: user.types.ts
// PURPOSE: TypeScript interfaces and types for user-related functionality
// LAST MODIFIED: January 28, 2025

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: string;
  lastSignIn: string;
  disabled: boolean;
  emailVerified: boolean;
  photoURL?: string;
  outletCount: number;
}

export interface AddUserData {
  email: string;
  displayName: string;
  invitationType: 'email' | 'gmail';
}
