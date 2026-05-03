import { useNavigate, NavLink } from 'react-router-dom';
import { Logo, HomeIcon, IncomeIcon, ExpenseIcon, CashFlowIcon, BranchIcon, UserIcon, GiftIcon, CategoryIcon, BarChartIcon } from '../constants';
import { useAppContext } from '../hooks/useAppContext';
import { Role } from '../types';

interface NavItemProps {
    to: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, children, onClick }) => (
    <NavLink
        to={to}
        end 
        onClick={onClick}
        className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-all duration-300 rounded-xl ${
                isActive
                    ? 'bg-emerald-50 text-emerald-600 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`
        }
    >
        <span className="flex-shrink-0 transition-transform duration-300">
            {icon}
        </span>
        <span className="flex-1 transition-opacity duration-300 whitespace-nowrap">{children}</span>
    </NavLink>
);

interface SidebarProps {
    isOpen: boolean;
    toggleSidebar: () => void;
}


const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
    const { currentUser } = useAppContext();
    const { settings } = useAppContext();
    const navigate = useNavigate();

    const adminItems = [
        { to: '/', icon: <HomeIcon className="w-5 h-5" />, label: 'Dashboard' },
        { to: '/cash-flow', icon: <CashFlowIcon className="w-5 h-5" />, label: 'Arus Kas' },
        { to: '/monitoring', icon: <BarChartIcon className="w-5 h-5" />, label: 'Monitoring' },
        { to: '/infaq-bulanan', icon: <UserIcon className="w-5 h-5" />, label: 'Infaq Bulanan' },
        { to: '/income-non-money', icon: <GiftIcon className="w-5 h-5" />, label: 'Non Uang' },
        { to: '/categories', icon: <CategoryIcon className="w-5 h-5" />, label: 'Kategori' },
        { to: '/branches', icon: <BranchIcon className="w-5 h-5" />, label: 'manajemen unit' },
    ];

    const branchItems = [
        { to: '/', icon: <HomeIcon className="w-5 h-5" />, label: 'Dashboard' },
        { to: '/infaq-bulanan', icon: <UserIcon className="w-5 h-5" />, label: 'Infaq Bulanan' },
        { to: '/income', icon: <IncomeIcon className="w-5 h-5" />, label: 'Pemasukan' },
        { to: '/expenses', icon: <ExpenseIcon className="w-5 h-5" />, label: 'Pengeluaran' },
        { to: '/income-non-money', icon: <GiftIcon className="w-5 h-5" />, label: 'Non Uang' },
    ];

    const menuItems = currentUser?.role === Role.Admin ? adminItems : branchItems;

    return (
        <>
            <aside
                className="hidden md:flex flex-col w-64 bg-sidebar border-r border-slate-200 z-50 h-screen sticky top-0"
            >
                <div className="flex items-center gap-3 h-20 px-6">
                    <div className={`bg-emerald-500 rounded-xl overflow-hidden flex items-center justify-center w-12 h-12 ${settings.appLogoUrl ? 'p-0' : 'p-2'}`}>
                        {settings.appLogoUrl ? (
                            <img src={settings.appLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <Logo />
                        )}
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 leading-none">{settings.appName}</h1>
                        <p className="text-[10px] text-slate-400 font-medium">{settings.appSubtitle}</p>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1 custom-scrollbar">
                    <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Menu Utama</p>
                    {menuItems.map(item => (
                        <NavItem key={item.to} to={item.to} icon={item.icon} onClick={() => {}}>
                            {item.label}
                        </NavItem>
                    ))}
                </div>
                
                <div className="p-4 border-t border-slate-100">
                    <div 
                        onClick={() => navigate('/profile')}
                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors group cursor-pointer border border-transparent hover:border-slate-100"
                    >
                        <img 
                            src={currentUser?.avatarUrl || `https://i.pravatar.cc/40?u=${currentUser?.id}`}
                            alt="User" 
                            className="w-10 h-10 rounded-xl object-cover shadow-sm"
                        />
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-800 truncate group-hover:text-emerald-600 transition-colors">{currentUser?.name}</p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;