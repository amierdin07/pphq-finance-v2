// Define enums for specific, controlled sets of values.
export enum Role {
  Admin = 'Admin',
  BranchUser = 'BranchUser',
}

export enum TransactionType {
  Income = 'Income',
  Expense = 'Expense',
}

export enum TransactionNature {
    Money = 'Money',
    NonMoney = 'NonMoney',
}

// Define interfaces for our main data structures.
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  branchId: string;
  isActive: boolean;
  avatarUrl?: string;
  unitHeadName?: string;
  unitTreasurerName?: string;
}

export interface AppSettings {
  appLogoUrl: string;
  appName: string;
  appSubtitle: string;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType; // 'Income' or 'Expense'
}

export interface Transaction {
  id: string;
  date: string; // ISO string format for dates
  branchId: string;
  category: string;
  description: string;
  type: TransactionType;
  nature: TransactionNature;
  amount: number; // For 'Money' nature
  item?: string; // For 'NonMoney' nature (e.g., '10 karung beras')
  attachmentUrl?: string; // Optional receipt photo
  createdBy: string; // User ID
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  createdBy: string;
  createdAt: string;
  isRead: number; // 0 or 1
}

export interface Student {
  id: string;
  name: string;
  address?: string;
  parentPhone?: string;
  isActive: boolean;
  branchId: string;
}

// Define the shape of our application's context.
export interface AppContextType {
  currentUser: User | null;
  isLoading: boolean;
  users: User[];
  branches: Branch[];
  categories: Category[];
  students: Student[];
  transactions: Transaction[];
  allTransactions: Transaction[];
  announcements: Announcement[];
  settings: AppSettings;
  globalSearchTerm: string;
  setGlobalSearchTerm: (term: string) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  resetData: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  // Student management
  addStudent: (student: Omit<Student, 'id'>) => Promise<void>;
  updateStudent: (student: Student) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  // Transaction management
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdBy'>) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  // Category management
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  // Branch management
  addBranch: (branch: Omit<Branch, 'id'>) => Promise<void>;
  updateBranch: (branch: Branch) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
  // User management for Admin
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUserByAdmin: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  // Announcement management
  createAnnouncement: (title: string, message: string) => Promise<void>;
  markAnnouncementRead: (announcementId: string) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  refreshAnnouncements: () => Promise<void>;
  // UI & Utility
  confirmState: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    type: 'danger' | 'info' | 'success';
    confirmText?: string;
    cancelText?: string;
  };
  showConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'info' | 'success', confirmText?: string) => void;
  showAlert: (title: string, message: string, type?: 'danger' | 'info' | 'success') => void;
  closeConfirm: () => void;
  refreshAllData: () => Promise<void>;
}