// User Types
import { BaseEntity } from './index';

export type UserRole = 'administrator' | 'member';

export interface User extends BaseEntity {
  email: string;
  password: string; // Stored in plain text for admin viewing (not recommended for production, but as requested)
  name: string;
  role: UserRole;
  profilePicture?: string;
  gender?: string;
  birthdate?: Date;
  phone?: string;
  address?: string;
  enabledModules: string[]; // Array of module IDs that this user can access
  isActive: boolean;
}

export interface UserProfile {
  name: string;
  profilePicture?: string;
  gender?: string;
  birthdate?: Date;
  phone?: string;
  address?: string;
}
