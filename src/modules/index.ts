import { Module } from '../types';
import BudgetModule from './budget/BudgetModule';
import TaskModule from './task/TaskModule';
import LottoModule from './lotto/LottoModule';
import UserManagementModule from './user/UserManagementModule';
import SiteSettingsModule from './settings/SiteSettingsModule';
import { canAccessModule, getCurrentUser } from '../services/authService';

export const allModules: Module[] = [
  {
    id: 'budget',
    name: 'Budget',
    icon: '💰',
    path: '/budget',
    component: BudgetModule,
    enabled: true,
  },
  {
    id: 'task',
    name: 'Tasks',
    icon: '📋',
    path: '/tasks',
    component: TaskModule,
    enabled: true,
  },
  {
    id: 'lotto',
    name: 'Lotto',
    icon: '🎱',
    path: '/lotto',
    component: LottoModule,
    enabled: true,
  },
  {
    id: 'users',
    name: 'User Management',
    icon: '👥',
    path: '/users',
    component: UserManagementModule,
    enabled: true,
  },
  {
    id: 'settings',
    name: 'Site Settings',
    icon: '⚙️',
    path: '/settings',
    component: SiteSettingsModule,
    enabled: true,
  },
];

export const getModule = (id: string): Module | undefined => {
  return allModules.find(m => m.id === id);
};

export const getEnabledModules = (): Module[] => {
  const user = getCurrentUser();
  if (!user) {
    return [];
  }

  // Filter modules based on user access
  return allModules.filter(module => {
    // User management and site settings are only for admins
    if (module.id === 'users' || module.id === 'settings') {
      return user.role === 'administrator';
    }
    // Check if user can access this module
    return canAccessModule(user, module.id);
  });
};
