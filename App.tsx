import React, { useContext, useState } from 'react';
import ConfirmModal from './components/ConfirmModal';
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
    const { settings } = context || { settings: {} };
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
             {settings.appLogoUrl ? (
               <div className="w-24 h-24 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center p-4 animate-pulse border-4 border-emerald-50">
                <img src={settings.appLogoUrl} alt="Loading" className="max-w-full max-h-full object-contain" />
               </div>
             ) : (
               <div className="p-6 bg-emerald-500 rounded-[2rem] shadow-xl animate-bounce">
                <Logo className="w-12 h-12 text-white" />
               </div>
             )}
             <div className="absolute -bottom-2 -right-2">
                <div className="flex h-6 w-6">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-6 w-6 bg-emerald-500"></span>
                </div>
             </div>
          </div>
          <div className="text-center">
            <p className="text-slate-800 font-black text-xl tracking-tight">Memuat Aplikasi...</p>
            <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">{settings.appName || 'PPHQ Finance'}</p>
          </div>
        </div>
      </div>
    );
  }
  const { currentUser, confirmState, closeConfirm } = context;

  return (
    <>
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

      <ConfirmModal 
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={closeConfirm}
          type={confirmState.type}
          confirmText={confirmState.confirmText}
      />
    </>
  );
}

export default App;