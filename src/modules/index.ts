import { Module } from '../types';
import BudgetModule from './budget/BudgetModule';
import TaskModule from './task/TaskModule';

export const modules: Module[] = [
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
];

export const getModule = (id: string): Module | undefined => {
  return modules.find(m => m.id === id);
};

export const getEnabledModules = (): Module[] => {
  return modules.filter(m => m.enabled);
};
