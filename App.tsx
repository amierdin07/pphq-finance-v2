import React, { useContext, useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppContext } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TransactionsPage from './pages/TransactionsPage';
import NonMoneyTransactionsPage from './pages/NonMoneyTransactionsPage';
import CategoriesPage from './pages/CategoriesPage';
import Branches from './pages/Branches';
import CashFlow from './pages/CashFlow';
import { TransactionNature, TransactionType, Role } from './types';
import BranchTransactions from './pages/BranchTransactions';
import SettingsPage from './pages/SettingsPage';
import MonitoringPage from './pages/MonitoringPage';
import SyahriyahPage from './pages/SyahriyahPage';
import { Logo } from './constants';

import BottomNav from './components/BottomNav';

const PrivateLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6 md:p-8 lg:p-10 pb-24 md:pb-10">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
};

function App() {
  const context = useContext(AppContext);

  if (!context || context.isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <p className="text-text-secondary">Memuat data aplikasi...</p>
           <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    );
  }
  const { currentUser } = context;

  return (
    <Routes>
      <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" />} />
      <Route
        path="/*"
        element={
          currentUser ? (
            <PrivateLayout />
          ) : (
            <Navigate to="/login" />
          )
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="cash-flow" element={<CashFlow />} />
        <Route path="income-non-money" element={<NonMoneyTransactionsPage />} />
        <Route path="profile" element={<SettingsPage />} />
        <Route path="syahriyah" element={<SyahriyahPage />} />

        {/* BranchUser specific routes */}
        {currentUser?.role === Role.BranchUser && (
          <>
            <Route path="income" element={<TransactionsPage type={TransactionType.Income} nature={TransactionNature.Money} />} />
            <Route path="expenses" element={<TransactionsPage type={TransactionType.Expense} />} />
          </>
        )}
        
        {/* Admin specific routes */}
        {currentUser?.role === Role.Admin && (
            <>
                <Route path="monitoring" element={<MonitoringPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="branches" element={<Branches />} />
                <Route path="branch-transactions/:branchId" element={<BranchTransactions />} />
            </>
        )}

        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}

export default App;