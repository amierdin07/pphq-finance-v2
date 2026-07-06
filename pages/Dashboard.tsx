import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import DashboardCard from '../components/DashboardCard';
import MonthlyComparisonChart from '../components/charts/MonthlyComparisonChart';
import BranchComparisonChart from '../components/charts/BranchComparisonChart';
import { Transaction, TransactionType, Role, Branch, TransactionNature } from '../types';
import { IncomeIcon, ExpenseIcon, BarChartIcon, BranchIcon } from '../constants';
import CategorySummary from '../components/CategorySummary';
import ExportModal from '../components/ExportModal';

const RecentTransactions = ({ transactions, branches }: { transactions: Transaction[], branches: Branch[] }) => {
    const recent = transactions
        .filter(t => t.nature === 'Money')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

    const getBranchName = (id: string) => branches.find(b => b.id === id)?.name || 'N/A';

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">Transaksi Terkini</h3>
            </div>
            <div className="space-y-4 flex-grow">
                {recent.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-lg ${t.type === TransactionType.Income ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                {t.type === TransactionType.Income ? <IncomeIcon className="w-5 h-5"/> : <ExpenseIcon className="w-5 h-5"/>}
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm line-clamp-1">{t.description}</p>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                    <span className="text-emerald-600 font-bold">{getBranchName(t.branchId)}</span> • {new Date(t.date).toLocaleDateString('id-ID')}
                                </p>
                            </div>
                        </div>
                        <p className={`font-bold text-sm whitespace-nowrap ${t.type === TransactionType.Income ? 'text-emerald-500' : 'text-red-500'}`}>
                            {t.type === TransactionType.Income ? '+' : '-'}Rp{t.amount.toLocaleString('id-ID')}
                        </p>
                    </div>
                ))}
                 {recent.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-slate-400 text-sm">Belum ada transaksi.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const BranchLeaderboardItem = ({ branch, transactions, rank }: { branch: Branch, transactions: Transaction[], rank: number }) => {
    const balance = useMemo(() => {
        return transactions
            .filter(t => t.branchId === branch.id && t.nature === TransactionNature.Money)
            .reduce((acc, t) => t.type === TransactionType.Income ? acc + t.amount : acc - t.amount, 0);
    }, [branch.id, transactions]);

    return (
        <Link to={`/branch-transactions/${branch.id}`} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
            <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    rank === 1 ? 'bg-yellow-100 text-yellow-600' : 
                    rank === 2 ? 'bg-slate-100 text-slate-600' : 
                    rank === 3 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
                }`}>
                    {rank}
                </div>
                <div>
                    <p className="font-bold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">{branch.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{branch.location}</p>
                </div>
            </div>
            <div className="text-right">
                <p className={`font-bold text-sm ${balance >= 0 ? 'text-slate-800' : 'text-red-500'}`}>
                    Rp{balance.toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Saldo Bersih</p>
            </div>
        </Link>
    );
}

const BranchSummaryCard = ({ branch, transactions }: { branch: Branch, transactions: Transaction[] }) => {
    const { income, expense, balance } = useMemo(() => {
        let income = 0;
        let expense = 0;
        transactions.filter(t => t.branchId === branch.id && t.nature === TransactionNature.Money).forEach(t => {
            if (t.type === TransactionType.Income) income += t.amount;
            else expense += t.amount;
        });
        return { income, expense, balance: income - expense };
    }, [branch.id, transactions]);

    return (
        <Link to={`/branch-transactions/${branch.id}`} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-emerald-50 transition-colors">
                    <BranchIcon className="w-5 h-5 text-slate-400 group-hover:text-emerald-500" />
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-full group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">{branch.location}</span>
            </div>
            <h3 className="font-bold text-slate-800 mb-1 group-hover:text-emerald-600 transition-colors">{branch.name}</h3>
            <div className="space-y-2 mt-4 pt-4 border-t border-slate-50">
                <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 font-bold uppercase tracking-widest">Pemasukan</span>
                    <span className="text-emerald-500 font-bold">Rp{income.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 font-bold uppercase tracking-widest">Pengeluaran</span>
                    <span className="text-red-500 font-bold">Rp{expense.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm mt-2 pt-2 border-t border-dashed border-slate-100">
                    <span className="text-slate-800 font-bold">Saldo</span>
                    <span className={`font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>Rp{balance.toLocaleString('id-ID')}</span>
                </div>
            </div>
        </Link>
    );
};

const Dashboard = () => {
    const { currentUser, transactions, branches, allTransactions } = useAppContext();
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportMode, setExportMode] = useState<'detailed' | 'summary'>('detailed');

    const [startDate, setStartDate] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const rawData = (currentUser?.role === Role.Admin || currentUser?.role === Role.SubAdmin) ? allTransactions : transactions;

    const filteredData = useMemo(() => {
        return rawData.filter(t => {
            const d = t.date.split('T')[0];
            return d >= startDate && d <= endDate;
        });
    }, [rawData, startDate, endDate]);

    const branchName = useMemo(() => {
        if (!currentUser) return '';
        if (currentUser.role === Role.Admin || currentUser.role === Role.SubAdmin) return 'semua unit';
        return branches.find(b => b.id === currentUser.branchId)?.name || '';
    }, [currentUser, branches]);

    const activeBalance = useMemo(() => {
        let income = 0;
        let expense = 0;
        rawData.forEach(t => {
            if (t.nature === 'Money') {
                if (t.type === TransactionType.Income) {
                    income += t.amount;
                } else if (t.type === TransactionType.Expense) {
                    expense += t.amount;
                }
            }
        });
        return income - expense;
    }, [rawData]);

    const monthlySummary = useMemo(() => {
        const summary: { [key: string]: { income: number, expense: number } } = {};
        const monthMap: { [key: string]: number } = {
            'Januari': 0, 'Februari': 1, 'Maret': 2, 'April': 3, 'Mei': 4, 'Juni': 5,
            'Juli': 6, 'Agustus': 7, 'September': 8, 'Oktober': 9, 'November': 10, 'Desember': 11
        };

        rawData
            .filter(t => t.nature === TransactionNature.Money)
            .forEach(t => {
                const date = new Date(t.date);
                const monthYear = date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
                if (!summary[monthYear]) {
                    summary[monthYear] = { income: 0, expense: 0 };
                }
                if (t.type === TransactionType.Income) {
                    summary[monthYear].income += t.amount;
                } else if (t.type === TransactionType.Expense) {
                    summary[monthYear].expense += t.amount;
                }
            });

        return Object.entries(summary)
            .sort(([a], [b]) => {
                const [monthA, yearA] = a.split(' ');
                const [monthB, yearB] = b.split(' ');
                const dateA = new Date(Number(yearA), monthMap[monthA] ?? 0);
                const dateB = new Date(Number(yearB), monthMap[monthB] ?? 0);
                return dateB.getTime() - dateA.getTime();
            })
            .slice(0, 6); // Limit to last 6 months
    }, [rawData]);

    const { totalIncome, totalExpense, balance } = useMemo(() => {
        let totalIncome = 0;
        let totalExpense = 0;
        filteredData.forEach(t => {
            if (t.type === TransactionType.Income && t.nature === 'Money') {
                totalIncome += t.amount;
            } else if (t.type === TransactionType.Expense && t.nature === 'Money') {
                totalExpense += t.amount;
            }
        });
        return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
    }, [filteredData]);

    const rankedBranches = useMemo(() => {
        return [...branches].map(b => {
            const bal = filteredData
                .filter(t => t.branchId === b.id && t.nature === TransactionNature.Money)
                .reduce((acc, t) => t.type === TransactionType.Income ? acc + t.amount : acc - t.amount, 0);
            return { ...b, balance: bal };
        }).sort((a, b) => b.balance - a.balance);
    }, [branches, filteredData]);

    const handleExport = (mode: 'detailed' | 'summary') => {
        setExportMode(mode);
        setIsExportModalOpen(true);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-10">
            {/* Header & Global Filter */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Dashboard Keuangan</h1>
                    <p className="text-slate-400 font-medium mt-1">Selamat datang kembali, {currentUser?.name} 👋</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Dari</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Sampai</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div className="h-8 w-px bg-slate-100 mx-2 hidden sm:block"></div>
                    <button onClick={() => handleExport((currentUser?.role === Role.Admin || currentUser?.role === Role.SubAdmin) ? 'summary' : 'detailed')} className="px-6 py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        {(currentUser?.role === Role.Admin || currentUser?.role === Role.SubAdmin) ? 'Ringkasan Laporan' : 'E-Statement'}
                    </button>
                </div>
            </div>

            <ExportModal 
                isOpen={isExportModalOpen} 
                onClose={() => setIsExportModalOpen(false)} 
                transactions={rawData}
                branches={branches}
                title={exportMode === 'summary' ? 'Download Ringkasan unit' : 'Download E-Statement'}
                branchName={branchName}
                mode={exportMode}
            />
            
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard title="Saldo Aktif" value={`Rp${activeBalance.toLocaleString('id-ID')}`} icon={
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                } iconColorClass="bg-emerald-50" subtitle={`Semua periode`} />
                <DashboardCard title="Saldo (Periode)" value={`Rp${balance.toLocaleString('id-ID')}`} icon={<BarChartIcon className="w-5 h-5 text-indigo-600"/>} iconColorClass="bg-indigo-50" subtitle={`Periode terpilih`} />
                <DashboardCard title="Pengeluaran (Periode)" value={`Rp${totalExpense.toLocaleString('id-ID')}`} icon={<ExpenseIcon className="w-5 h-5 text-orange-600"/>} iconColorClass="bg-orange-50" subtitle={`Periode terpilih`} />
                <DashboardCard title="Pemasukan (Periode)" value={`Rp${totalIncome.toLocaleString('id-ID')}`} icon={<IncomeIcon className="w-5 h-5 text-blue-600"/>} iconColorClass="bg-blue-50" subtitle={`Periode terpilih`} />
            </div>

            {/* Admin & SubAdmin Leaderboard & Monitoring Section */}
            {(currentUser?.role === Role.Admin || currentUser?.role === Role.SubAdmin) && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col h-full">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">performa unit</h2>
                                    <p className="text-slate-400 text-xs font-medium">Perbandingan di seluruh unit</p>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-2xl">
                                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                </div>
                            </div>
                            <div className="flex-grow min-h-[350px]">
                                <BranchComparisonChart transactions={filteredData} branches={branches} />
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col max-h-[470px]">
                            <h2 className="text-xl font-bold text-slate-800 mb-2">peringkat unit</h2>
                            <p className="text-slate-400 text-xs mb-6 font-medium">Berdasarkan Saldo Bersih</p>
                            <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                                {rankedBranches.map((branch, index) => (
                                    <BranchLeaderboardItem key={branch.id} branch={branch} transactions={filteredData} rank={index + 1} />
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Branch User Monitoring */}
            {currentUser?.role === Role.BranchUser && (
                 <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <CategorySummary transactions={filteredData} />
                 </div>
            )}

            {/* Trends & Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                     <div className="flex justify-between items-center mb-10">
                        <h2 className="text-xl font-bold text-slate-800">Tren Arus Kas</h2>
                        <div className="flex gap-4">
                            <span className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> Pemasukan</span>
                            <span className="flex items-center gap-2 text-[10px] font-bold text-orange-500 uppercase tracking-widest"><span className="w-2.5 h-2.5 bg-orange-500 rounded-full"></span> Pengeluaran</span>
                        </div>
                     </div>
                     <MonthlyComparisonChart transactions={filteredData} />
                </div>
                <div className="lg:col-span-2 h-full">
                     <RecentTransactions transactions={filteredData} branches={branches} />
                </div>
            </div>

            {/* Ringkasan Bulanan Table */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                 <div className="flex justify-between items-center mb-6">
                     <div>
                         <h2 className="text-xl font-bold text-slate-800">Ringkasan Bulanan</h2>
                         <p className="text-slate-400 text-xs font-medium">Rekapitulasi total uang masuk dan keluar setiap bulan (6 bulan terakhir)</p>
                     </div>
                 </div>
                 <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left">
                         <thead>
                             <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                 <th className="pb-3 text-slate-400">Bulan</th>
                                 <th className="pb-3 text-right text-emerald-500">Total Pemasukan</th>
                                 <th className="pb-3 text-right text-orange-500">Total Pengeluaran</th>
                                 <th className="pb-3 text-right text-slate-400">Selisih (Net)</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                             {monthlySummary.map(([monthYear, data]) => {
                                 const diff = data.income - data.expense;
                                 return (
                                     <tr key={monthYear} className="text-slate-700 text-sm hover:bg-slate-50/50 transition-colors">
                                         <td className="py-4 text-slate-800 font-bold">{monthYear}</td>
                                         <td className="py-4 text-right text-emerald-600 font-semibold">Rp{data.income.toLocaleString('id-ID')}</td>
                                         <td className="py-4 text-right text-orange-600 font-semibold">Rp{data.expense.toLocaleString('id-ID')}</td>
                                         <td className={`py-4 text-right font-bold ${diff >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                                             Rp{diff.toLocaleString('id-ID')}
                                         </td>
                                     </tr>
                                 );
                             })}
                             {monthlySummary.length === 0 && (
                                 <tr>
                                     <td colSpan={4} className="text-center py-10 text-slate-400 text-sm">Belum ada data bulanan.</td>
                                 </tr>
                             )}
                         </tbody>
                     </table>
                 </div>
            </div>
        </div>
    );
};

export default Dashboard;