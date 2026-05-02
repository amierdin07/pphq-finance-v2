import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { Role } from '../types';
import { HomeIcon, CashFlowIcon, CategoryIcon, BranchIcon, IncomeIcon, ExpenseIcon, GiftIcon, BarChartIcon, UserIcon, SettingsIcon } from '../constants';

const BottomNav = () => {
    const { currentUser } = useAppContext();

    const adminItems = [
        { to: '/', icon: <HomeIcon className="w-5 h-5" />, label: 'Home' },
        { to: '/monitoring', icon: <BarChartIcon className="w-5 h-5" />, label: 'Monitor' },
        { to: '/syahriyah', icon: <UserIcon className="w-5 h-5" />, label: 'Syahriyah' },
        { to: '/income-non-money', icon: <GiftIcon className="w-5 h-5" />, label: 'Non Uang' },
        { to: '/categories', icon: <CategoryIcon className="w-5 h-5" />, label: 'Kategori' },
        { to: '/branches', icon: <BranchIcon className="w-5 h-5" />, label: 'unit' },
    ];

    const branchItems = [
        { to: '/', icon: <HomeIcon className="w-5 h-5" />, label: 'Home' },
        { to: '/syahriyah', icon: <UserIcon className="w-5 h-5" />, label: 'Syahriyah' },
        { to: '/income', icon: <IncomeIcon className="w-5 h-5" />, label: 'Pemasukan' },
        { to: '/expenses', icon: <ExpenseIcon className="w-5 h-5" />, label: 'Pengeluaran' },
        { to: '/income-non-money', icon: <GiftIcon className="w-5 h-5" />, label: 'Non Uang' },
    ];

    const menuItems = currentUser?.role === Role.Admin ? adminItems : branchItems;

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex items-center justify-around h-16 z-50 px-1 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
            {menuItems.map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 relative ${
                            isActive ? 'text-emerald-600' : 'text-slate-400'
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
                                {item.icon}
                            </div>
                            <span className="text-[8px] font-bold mt-1 uppercase tracking-tighter whitespace-nowrap">
                                {item.label}
                            </span>
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
};

export default BottomNav;
