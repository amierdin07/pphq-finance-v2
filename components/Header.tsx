import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { SearchIcon, MenuIcon, BellIcon, LogoutIcon } from '../constants';
import AnnouncementsModal from './AnnouncementsModal';

interface HeaderProps {
    toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
    const { currentUser, logout, announcements, globalSearchTerm, setGlobalSearchTerm } = useAppContext();
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

                    <div className="w-px h-8 bg-slate-100 hidden sm:block" />

                    <Link to="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-800 leading-none">{currentUser?.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{currentUser?.role}</p>
                        </div>
                        <img
                            src={currentUser?.avatarUrl || `https://i.pravatar.cc/40?u=${currentUser?.id}`}
                            alt="User"
                            className="w-10 h-10 rounded-xl object-cover border border-slate-100 shadow-sm"
                        />
                    </Link>
                    <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Logout">
                        <LogoutIcon className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <AnnouncementsModal isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
        </>
    );
};

export default Header;