import { DatabaseHelper, User } from './database-helper';

// Cargar usuarios reales de la base de datos
const validUsers = DatabaseHelper.getValidUsers();

export const testUsers = {
  primary: validUsers[0] || {
    id: "uBmeaz5pX",
    username: 'Heath93',
    password: process.env.TEST_PASSWORD!,
    firstName: 'Ted',
    lastName: 'Parisian',
    email: 'Santos.Runte65@gmail.com'
  },
  secondary: validUsers[1] || {
    id: "GjWovtg2hr", 
    username: 'Arvilla_Hegmann',
    password: process.env.TEST_PASSWORD!,
    firstName: 'Kristian',
    lastName: 'Bradtke',
    email: 'Skyla.Stamm@yahoo.com'
  },
  tertiary: validUsers[2] || {
    id: "_XblMqbuoP",
    username: 'Dina20',
    password: process.env.TEST_PASSWORD!,
    firstName: 'Darrel',
    lastName: 'Ortiz',
    email: 'Marielle_Wiza@yahoo.com'
  }
};

export const testData = {
  payment: {
    minAmount: 5,
    maxAmount: 100,
    defaultNote: 'QA Automation Test Payment',
    validAmounts: [5, 10, 25, 50, 100],
    invalidAmounts: [-1, 0, 1000000]
  },
  contact: {
    defaultName: 'QA Test Contact',
    searchTerm: 'Test'
  },
  validation: {
    maxNoteLength: 255,
    minAmount: 1,
    maxAmount: 999999
  }
};

export const apiEndpoints = {
  login: '/login',
  logout: '/logout',
  transactions: '/transactions',
  users: '/users',
  contacts: '/contacts',
  bankAccounts: '/bankAccounts',
  notifications: '/notifications'
};

// Función helper para obtener datos de prueba dinámicos
export const getTestData = {
  randomAmount: (min: number = testData.payment.minAmount, max: number = testData.payment.maxAmount) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  
  uniqueNote: (prefix: string = testData.payment.defaultNote) => {
    return `${prefix} - ${new Date().toISOString()} - ${Math.random().toString(36).substr(2, 9)}`;
  },
  
  randomUser: () => {
    const users = Object.values(testUsers);
    return users[Math.floor(Math.random() * users.length)];
  },
  
  getUserContacts: (userId: string) => {
    return DatabaseHelper.getUserContacts(userId);
  },
  
  getUserTransactions: (userId: string) => {
    return DatabaseHelper.getUserTransactions(userId);
  }
};