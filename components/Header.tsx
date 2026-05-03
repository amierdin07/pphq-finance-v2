import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { SearchIcon, MenuIcon, BellIcon, LogoutIcon } from '../constants';
import { Role } from '../types';
import AnnouncementsModal from './AnnouncementsModal';

interface HeaderProps {
    toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
    const { currentUser, logout, announcements, globalSearchTerm, setGlobalSearchTerm, showConfirm } = useAppContext();
    const [notifOpen, setNotifOpen] = useState(false);

    const unreadCount = announcements.filter(a => !a.isRead).length;

    return (
        <>
            <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 shadow-sm md:shadow-none">
                <div className="flex items-center gap-4">
                    <div className="relative hidden md:block group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                            <SearchIcon className="w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        </span>
                        <input
                            type="text"
                            placeholder="Cari apapun di sini..."
                            value={globalSearchTerm}
                            onChange={(e) => setGlobalSearchTerm(e.target.value)}
                            className="w-80 pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-medium text-slate-600"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Bell button with unread badge */}
                    <button
                        onClick={() => setNotifOpen(true)}
                        className="relative p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"
                        title="Notifikasi"
                    >
                        <BellIcon className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-4 h-4 bg-red-500 border-2 border-white rounded-full text-[9px] font-bold text-white leading-none">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    <a
                        href="https://wa.me/6281553854670?text=Halo%20Admin,%20saya%20menemukan%20bug%20di%20aplikasi%20PPHQ%20Finance..."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:flex items-center gap-2 px-3 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all group"
                        title="Lapor Bug"
                    >
                        <svg className="w-4 h-4 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Lapor Bug</span>
                    </a>

                    <div className="w-px h-8 bg-slate-100 hidden sm:block" />

                    <Link to="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="text-right">
                            <p className="text-[11px] md:text-sm font-bold text-slate-800 leading-none truncate max-w-[100px] md:max-w-none">{currentUser?.name}</p>
                        </div>
                        <img
                            src={currentUser?.avatarUrl || `https://i.pravatar.cc/40?u=${currentUser?.id}`}
                            alt="User"
                            className="w-10 h-10 rounded-xl object-cover border border-slate-100 shadow-sm"
                        />
                    </Link>
                    <button 
                        onClick={() => showConfirm('Keluar Aplikasi?', 'Apakah Anda yakin ingin keluar dari akun ini?', logout, 'success', 'Ya, Keluar')} 
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" 
                        title="Logout"
                    >
                        <LogoutIcon className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <AnnouncementsModal isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
        </>
    );
};

export default Header;