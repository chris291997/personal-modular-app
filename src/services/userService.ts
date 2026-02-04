import {
  collection,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { User, UserRole, UserProfile } from '../types/user';
import { getCurrentUser, isAdmin } from './authService';

// Create user (only admin can do this) - Uses Admin API for secure password hashing
export const createUser = async (
  email: string,
  password: string,
  name: string,
  role: UserRole,
  enabledModules: string[] = []
): Promise<string> => {
  const currentUser = getCurrentUser();
  if (!currentUser || !isAdmin(currentUser)) {
    throw new Error('Only administrators can create users');
  }

  try {
    // Use Admin API endpoint for secure user creation with password hashing
    const apiUrl = import.meta.env.VITE_ADMIN_API_URL || '/api/admin-users';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'createUser',
        userData: {
          email,
          password,
          name,
          role,
          enabledModules,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || errorData.message || 'Failed to create user');
    }

    const result = await response.json();
    return result.userId;
  } catch (error: any) {
    console.error('Error creating user:', error);
    throw new Error(error.message || 'Failed to create user');
  }
};

// Get all users (admin only)
export const getAllUsers = async (): Promise<User[]> => {
  const currentUser = getCurrentUser();
  if (!currentUser || !isAdmin(currentUser)) {
    throw new Error('Only administrators can view all users');
  }

  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => {
      const userData = doc.data();
      return {
        id: doc.id,
        ...userData,
        createdAt: userData.createdAt?.toDate() || new Date(),
        updatedAt: userData.updatedAt?.toDate() || new Date(),
        birthdate: userData.birthdate?.toDate(),
        // Ensure enabledModules is always an array (default to empty array for members)
        enabledModules: Array.isArray(userData.enabledModules) ? userData.enabledModules : [],
      } as User;
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
};

// Get user by ID
export const getUserById = async (userId: string): Promise<User | null> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('Not authenticated');
  }

  // Members can only view their own profile, admins can view any
  if (!isAdmin(currentUser) && currentUser.id !== userId) {
    throw new Error('You can only view your own profile');
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    return {
      id: userDoc.id,
      ...userData,
      createdAt: userData.createdAt?.toDate() || new Date(),
      updatedAt: userData.updatedAt?.toDate() || new Date(),
      birthdate: userData.birthdate?.toDate(),
      // Ensure enabledModules is always an array (default to empty array for members)
      enabledModules: Array.isArray(userData.enabledModules) ? userData.enabledModules : [],
    } as User;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw new Error('Failed to fetch user');
  }
};

// Update user (admin can update anyone, members can only update themselves)
export const updateUser = async (
  userId: string,
  updates: Partial<User>
): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('Not authenticated');
  }

  // Members can only update their own profile and cannot change role or enabledModules
  if (!isAdmin(currentUser)) {
    if (currentUser.id !== userId) {
      throw new Error('You can only update your own profile');
    }
    // Remove fields that members cannot update
    delete (updates as any).role;
    delete (updates as any).enabledModules;
    delete (updates as any).password;
    delete (updates as any).isActive;
  }

  try {
    // Check if user document exists
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userRef = doc(db, 'users', userId);
    const updateData: any = {
      updatedAt: Timestamp.fromDate(new Date()),
    };

    // Handle password update via Admin API if provided
    if (updates.password && updates.password.trim() !== '') {
      if (!isAdmin(currentUser)) {
        throw new Error('Only administrators can update passwords');
      }
      
      const apiUrl = import.meta.env.VITE_ADMIN_API_URL || '/api/admin-users';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'resetPassword',
          userId: userId,
          newPassword: updates.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || errorData.message || 'Failed to update password');
      }
    }

    // Only include defined fields
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.role !== undefined && isAdmin(currentUser)) updateData.role = updates.role;
    if (updates.profilePicture !== undefined) updateData.profilePicture = updates.profilePicture;
    if (updates.gender !== undefined) updateData.gender = updates.gender;
    if (updates.birthdate !== undefined) {
      updateData.birthdate = updates.birthdate ? Timestamp.fromDate(updates.birthdate) : null;
    }
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.enabledModules !== undefined && isAdmin(currentUser)) {
      updateData.enabledModules = updates.enabledModules;
    }
    if (updates.isActive !== undefined && isAdmin(currentUser)) {
      updateData.isActive = updates.isActive;
    }

    await updateDoc(userRef, updateData);
  } catch (error: any) {
    console.error('Error updating user:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage || 'Failed to update user');
  }
};

// Update user profile (for members to update their own profile)
export const updateUserProfile = async (
  userId: string,
  profile: UserProfile
): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('Not authenticated');
  }

  if (!isAdmin(currentUser) && currentUser.id !== userId) {
    throw new Error('You can only update your own profile');
  }

  try {
    // Check if user document exists
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userRef = doc(db, 'users', userId);
    const updateData: any = {
      updatedAt: Timestamp.fromDate(new Date()),
    };

    if (profile.name !== undefined) updateData.name = profile.name;
    if (profile.profilePicture !== undefined) updateData.profilePicture = profile.profilePicture;
    if (profile.gender !== undefined) updateData.gender = profile.gender;
    if (profile.birthdate !== undefined) {
      updateData.birthdate = profile.birthdate ? Timestamp.fromDate(profile.birthdate) : null;
    }
    if (profile.phone !== undefined) updateData.phone = profile.phone;
    if (profile.address !== undefined) updateData.address = profile.address;

    await updateDoc(userRef, updateData);
  } catch (error: any) {
    console.error('Error updating profile:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Provide more specific error messages
    if (errorMessage.includes('permission-denied') || errorMessage.includes('Permission denied')) {
      throw new Error('You do not have permission to update this profile');
    }
    if (errorMessage.includes('not-found') || errorMessage.includes('not found')) {
      throw new Error('User not found');
    }
    
    throw new Error(errorMessage || 'Failed to update profile');
  }
};

// Delete user (admin only) - Uses Admin API
export const deleteUserAccount = async (userId: string): Promise<void> => {
  const currentUser = getCurrentUser();
  if (!currentUser || !isAdmin(currentUser)) {
    throw new Error('Only administrators can delete users');
  }

  if (!userId || userId.trim() === '') {
    throw new Error('User ID is required');
  }

  // Prevent self-deletion
  if (currentUser.id === userId) {
    throw new Error('You cannot delete your own account');
  }

  try {
    // Check if user document exists before attempting deletion
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    // Use Admin API endpoint for secure user deletion
    const apiUrl = import.meta.env.VITE_ADMIN_API_URL || '/api/admin-users';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'deleteUser',
        userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      const errorMessage = errorData.error || errorData.message || 'Failed to delete user';
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    console.error('Error deleting user:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Provide more specific error messages
    if (errorMessage.includes('not-found') || errorMessage.includes('not found')) {
      throw new Error('User not found');
    }
    if (errorMessage.includes('permission-denied') || errorMessage.includes('Permission denied')) {
      throw new Error('You do not have permission to delete this user');
    }
    
    throw new Error(errorMessage || 'Failed to delete user');
  }
};

// Note: Admin user initialization is now in src/utils/initAdmin.ts
// This function is kept for backward compatibility but should use the new secure version
