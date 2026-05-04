import React, { createContext, useState, useEffect, useCallback, PropsWithChildren, useMemo } from 'react';
import { AppContextType, User, Branch, Category, Transaction, Announcement, Role, TransactionType, TransactionNature, AppSettings, Student } from '../types';

const API_URL = '/api/action';

const callApi = async (action: string, payload?: any) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload }),
        });

        if (!response.ok) {
            throw new Error(`API call failed with status ${response.status}`);
        }

        const result = await response.json();

        if (result.status === 'error') {
            throw new Error(result.message || 'An unknown API error occurred.');
        }

        return result.data;
    } catch (error) {
        console.error(`API Error on action "${action}":`, error);
        throw error;
    }
};

const defaultSettings: AppSettings = {
    appLogoUrl: '',
    appName: 'PPHQ Finance',
    appSubtitle: 'Sistem Keuangan PPHQ'
};

const defaultContextValue: AppContextType = {
  currentUser: null,
  isLoading: true,
  users: [],
  branches: [],
  categories: [],
  students: [],
  transactions: [],
  allTransactions: [],
  announcements: [],
  settings: defaultSettings,
  globalSearchTerm: '',
  setGlobalSearchTerm: () => {},
  login: async () => false,
  logout: () => {},
  resetData: async () => {},
  updateUser: async () => {},
  updateSettings: async () => {},
  addStudent: async () => {},
  updateStudent: async () => {},
  deleteStudent: async () => {},
  addTransaction: async () => {},
  updateTransaction: async () => {},
  deleteTransaction: async () => {},
  addCategory: async () => {},
  updateCategory: async () => {},
  deleteCategory: async () => {},
  addBranch: async () => {},
  updateBranch: async () => {},
  deleteBranch: async () => {},
  addUser: async () => {},
  updateUserByAdmin: async () => {},
  deleteUser: async () => {},
  createAnnouncement: async () => {},
  markAnnouncementRead: async () => {},
  deleteAnnouncement: async () => {},
  refreshAnnouncements: async () => {},
  confirmState: {
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  },
  showConfirm: () => {},
  showAlert: () => {},
  closeConfirm: () => {},
  refreshAllData: async () => {},
};

export const AppContext = createContext<AppContextType>(defaultContextValue);

export const AppProvider = ({ children }: PropsWithChildren) => {
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem('currentUser');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    
    const [users, setUsers] = useState<User[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [globalSearchTerm, setGlobalSearchTerm] = useState('');

    // Fetch settings on mount (needed for Login page logo/name)
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await callApi('getSettings');
                if (data.settings) {
                    setSettings(data.settings);
                    
                    // Dynamic Favicon
                    if (data.settings.appLogoUrl) {
                        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
                        if (!link) {
                            link = document.createElement('link');
                            link.rel = 'icon';
                            document.head.appendChild(link);
                        }
                        link.href = data.settings.appLogoUrl;
                    }
                }
            } catch (error) {
                console.error("Could not load settings.", error);
            }
        };
        fetchSettings();
    }, []);

    const refreshAllData = useCallback(async () => {
        if (currentUser) {
            try {
                // Fetch data in parallel to save time
                const [allData, annData] = await Promise.all([
                    callApi('getAllData'),
                    callApi('getAnnouncements', { userId: currentUser.id })
                ]);

                setUsers((allData.users || []).map((u: any) => ({ ...u, isActive: !!u.isActive })));
                setBranches(allData.branches || []);
                setCategories(allData.categories || []);
                setStudents((allData.students || []).map((s: any) => ({ ...s, isActive: !!s.isActive })));
                setAllTransactions(allData.allTransactions || []);
                if (allData.settings) {
                    setSettings(allData.settings);
                }
                setAnnouncements(annData.announcements || []);
            } catch (error) {
                console.error("Refresh failed:", error);
            }
        }
    }, [currentUser]);

    useEffect(() => {
        const fetchInitialData = async () => {
            if (currentUser) {
                setIsLoading(true);
                await refreshAllData();
                setIsLoading(false);
            } else {
                // Short delay to ensure smooth transition even if no user
                setTimeout(() => setIsLoading(false), 300);
            }
        };

        fetchInitialData();
    }, [currentUser, refreshAllData]);

    useEffect(() => {
        if(currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('currentUser');
        }
    }, [currentUser]);

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        onCancel?: () => void;
        type: 'danger' | 'info' | 'success';
        confirmText?: string;
        cancelText?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        type: 'danger'
    });

    const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' | 'success' = 'danger', confirmText?: string) => {
        setConfirmState({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            },
            onCancel: () => {
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            },
            type,
            confirmText
        });
    }, []);

    const showAlert = useCallback((title: string, message: string, type: 'danger' | 'info' | 'success' = 'success') => {
        setConfirmState({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            },
            onCancel: undefined, // No cancel button for alerts
            type,
            confirmText: 'Sip, Oke'
        });
    }, []);

    const closeConfirm = useCallback(() => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const login = useCallback(async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const data = await callApi('login', { email, password });
            if (data.user && data.user.isActive) {
                setCurrentUser(data.user);
                return true;
            }
            return false;
        } catch (error) {
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        setCurrentUser(null);
        setUsers([]);
        setBranches([]);
        setCategories([]);
        setStudents([]);
        setAllTransactions([]);
        setAnnouncements([]);
    }, []);
    
    const resetData = useCallback(async () => {
       showConfirm(
           "Reset Semua Data?", 
           "Apakah Anda yakin ingin menghapus semua data transaksi, unit, dan kategori? Aksi ini tidak dapat dibatalkan.",
           async () => {
                setIsLoading(true);
                try {
                    const data = await callApi('resetData');
                    setUsers(data.users || []);
                    setBranches(data.branches || []);
                    setCategories(data.categories || []);
                    setAllTransactions(data.allTransactions || []);
                } catch (error) {
                    console.error('Gagal mereset data.');
                } finally {
                    setIsLoading(false);
                }
           },
           'danger',
           'Ya, Reset Total'
       );
    }, [showConfirm]);

    const updateUser = useCallback(async (updatedUser: User) => {
        if (currentUser && currentUser.id === updatedUser.id) {
            const data = await callApi('updateUser', { user: updatedUser });
            setUsers(prev => prev.map(u => u.id === data.user.id ? data.user : u));
            setCurrentUser(data.user);
        }
    }, [currentUser]);

    const updateSettings = useCallback(async (newSettings: AppSettings) => {
        const data = await callApi('updateSettings', { settings: newSettings });
        setSettings(data.settings);
    }, []);

    const addStudent = useCallback(async (student: Omit<Student, 'id'>) => {
        const data = await callApi('addStudent', { student });
        const newStudent = { ...data.newStudent, isActive: !!data.newStudent.isActive };
        setStudents(prev => [...prev, newStudent]);
    }, []);

    const updateStudent = useCallback(async (student: Student) => {
        const data = await callApi('updateStudent', { student });
        const updatedStudent = { ...data.updatedStudent, isActive: !!data.updatedStudent.isActive };
        setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    }, []);

    const deleteStudent = useCallback(async (id: string) => {
        await callApi('deleteStudent', { id });
        setStudents(prev => prev.filter(s => s.id !== id));
    }, []);

    const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'createdBy'>) => {
        if (!currentUser) return;
        const newTransactionData = { ...transaction, createdBy: currentUser.id };
        const data = await callApi('addTransaction', { transaction: newTransactionData });
        setAllTransactions(prev => [...prev, data.newTransaction]);
    }, [currentUser]);

    const updateTransaction = useCallback(async (transaction: Transaction) => {
         const data = await callApi('updateTransaction', { transaction });
         setAllTransactions(prev => prev.map(t => t.id === data.updatedTransaction.id ? data.updatedTransaction : t));
    }, []);

    const deleteTransaction = useCallback(async (id: string) => {
        await callApi('deleteTransaction', { id });
        setAllTransactions(prev => prev.filter(t => t.id !== id));
    }, []);

    const addCategory = useCallback(async (category: Omit<Category, 'id'>) => {
        const data = await callApi('addCategory', { category });
        setCategories(prev => [...prev, data.newCategory]);
    }, []);
    const updateCategory = useCallback(async (category: Category) => {
        const data = await callApi('updateCategory', { category });
        setCategories(prev => prev.map(c => c.id === data.updatedCategory.id ? data.updatedCategory : c));
    }, []);
    const deleteCategory = useCallback(async (id: string) => {
        await callApi('deleteCategory', { id });
        setCategories(prev => prev.filter(c => c.id !== id));
    }, []);

    const addBranch = useCallback(async (branch: Omit<Branch, 'id'>) => {
        const data = await callApi('addBranch', { branch });
        setBranches(prev => [...prev, data.newBranch]);
    }, []);
    const updateBranch = useCallback(async (branch: Branch) => {
        const data = await callApi('updateBranch', { branch });
        setBranches(prev => prev.map(b => b.id === data.updatedBranch.id ? data.updatedBranch : b));
    }, []);
    const deleteBranch = useCallback(async (id: string) => {
        const data = await callApi('deleteBranch', { id });
        setBranches(data.branches);
        setUsers(data.users);
        setAllTransactions(data.allTransactions);
    }, []);

    const addUser = useCallback(async (user: Omit<User, 'id'>) => {
        const data = await callApi('addUser', { user });
        setUsers(prev => [...prev, data.newUser]);
    }, []);
    const updateUserByAdmin = useCallback(async (user: User) => {
        const data = await callApi('updateUserByAdmin', { user });
        setUsers(prev => prev.map(u => u.id === data.updatedUser.id ? data.updatedUser : u));
    }, []);
    const deleteUser = useCallback(async (id: string) => {
        await callApi('deleteUser', { id });
        setUsers(prev => prev.filter(u => u.id !== id));
    }, []);

    const refreshAnnouncements = useCallback(async () => {
        if (!currentUser) return;
        const data = await callApi('getAnnouncements', { userId: currentUser.id });
        setAnnouncements(data.announcements || []);
    }, [currentUser]);

    const createAnnouncement = useCallback(async (title: string, message: string) => {
        if (!currentUser) return;
        const data = await callApi('createAnnouncement', { announcement: { title, message, createdBy: currentUser.id } });
        setAnnouncements(prev => [{ ...data.announcement, isRead: 0 }, ...prev]);
    }, [currentUser]);

    const markAnnouncementRead = useCallback(async (announcementId: string) => {
        if (!currentUser) return;
        await callApi('markAnnouncementRead', { announcementId, userId: currentUser.id });
        setAnnouncements(prev => prev.map(a => a.id === announcementId ? { ...a, isRead: 1 } : a));
    }, [currentUser]);

    const deleteAnnouncement = useCallback(async (id: string) => {
        await callApi('deleteAnnouncement', { id });
        setAnnouncements(prev => prev.filter(a => a.id !== id));
    }, []);
    
    const value = useMemo(() => {
        const transactions = (currentUser?.role === Role.Admin || currentUser?.role === Role.SubAdmin)
            ? allTransactions 
            : allTransactions.filter(t => t.branchId === currentUser?.branchId);
        
        return {
            currentUser,
            isLoading,
            users,
            branches,
            categories,
            students,
            transactions,
            allTransactions,
            announcements,
            settings,
            confirmState,
            showConfirm,
            showAlert,
            closeConfirm,
            globalSearchTerm,
            setGlobalSearchTerm,
            login,
            logout,
            resetData,
            updateUser,
            updateSettings,
            addStudent,
            updateStudent,
            deleteStudent,
            addTransaction,
            updateTransaction,
            deleteTransaction,
            addCategory,
            updateCategory,
            deleteCategory,
            addBranch,
            updateBranch,
            deleteBranch,
            addUser,
            updateUserByAdmin,
            deleteUser,
            createAnnouncement,
            markAnnouncementRead,
            deleteAnnouncement,
            refreshAnnouncements,
            refreshAllData,
        };
    }, [
        currentUser, isLoading, users, branches, categories, students, allTransactions, announcements, settings,
        confirmState, showConfirm, closeConfirm,
        login, logout, resetData, updateUser, updateSettings, addStudent, updateStudent, deleteStudent,
        addTransaction, updateTransaction,
        deleteTransaction, addCategory, updateCategory, deleteCategory, addBranch,
        updateBranch, deleteBranch, addUser, updateUserByAdmin, deleteUser,
        createAnnouncement, markAnnouncementRead, deleteAnnouncement, refreshAnnouncements,
        refreshAllData,
        globalSearchTerm,
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};