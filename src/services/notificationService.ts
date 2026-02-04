import { onMessageListener, requestNotificationPermission } from '../firebase/config';
import { Debt, Expense } from '../types';
import { format } from 'date-fns';

// Request notification permission and get token
export const initializeNotifications = async (): Promise<string | null> => {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return null;
  }

  return await requestNotificationPermission();
};

// Listen for foreground messages
export const setupNotificationListener = () => {
  onMessageListener().then((payload: any) => {
    if (payload) {
      const notificationTitle = payload.notification?.title || 'New Notification';
      const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
      };

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notificationTitle, notificationOptions);
      }
    }
  });
};

// Check for upcoming debt payments
export const checkDebtPayments = (debts: Debt[]): string[] => {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const alerts: string[] = [];

  debts.forEach(debt => {
    // Alert 3 days before due date (dueDate is day of month, 1-31)
    if (debt.dueDate >= dayOfMonth && debt.dueDate <= dayOfMonth + 3) {
      alerts.push(
        `Debt payment due soon: ${debt.creditor} - ${debt.minimumPayment.toFixed(2)} due on day ${debt.dueDate}`
      );
    }
  });

  return alerts;
};

// Check for upcoming recurring expenses
export const checkRecurringExpenses = (expenses: Expense[]): string[] => {
  const today = new Date();
  const alerts: string[] = [];

  expenses.forEach(expense => {
    if (expense.isRecurring && expense.nextDueDate) {
      const daysUntilDue = Math.ceil(
        (expense.nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDue >= 0 && daysUntilDue <= 3) {
        alerts.push(
          `Recurring expense due: ${expense.description} - ${expense.amount.toFixed(2)} due ${format(expense.nextDueDate, 'MMM dd')}`
        );
      }
    }
  });

  return alerts;
};

// Send local notification
export const sendLocalNotification = (title: string, body: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
    });
  }
};

// Schedule daily budget check
export const scheduleBudgetAlerts = async (
  debts: Debt[],
  expenses: Expense[]
) => {
  const debtAlerts = checkDebtPayments(debts);
  const expenseAlerts = checkRecurringExpenses(expenses);

  debtAlerts.forEach(alert => {
    sendLocalNotification('Debt Payment Reminder', alert);
  });

  expenseAlerts.forEach(alert => {
    sendLocalNotification('Expense Reminder', alert);
  });
};
