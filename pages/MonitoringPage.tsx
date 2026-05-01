import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { Transaction, TransactionType, Branch, TransactionNature } from '../types';
import { BranchIcon } from '../constants';

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
        <Link to={`/branch-transactions/${branch.id}`} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all group flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-emerald-50 transition-colors">
                    <BranchIcon className="w-6 h-6 text-slate-400 group-hover:text-emerald-500" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">{branch.location}</span>
            </div>
            
            <div className="flex-grow">
                <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-emerald-600 transition-colors">{branch.name}</h3>
                <p className="text-xs text-slate-400 font-medium mb-6">Klik untuk detail & laporan PDF</p>
            </div>

            <div className="space-y-3 mt-4 pt-6 border-t border-slate-50">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pemasukan</span>
                    <span className="text-emerald-500 font-bold text-sm">Rp{income.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pengeluaran</span>
                    <span className="text-red-500 font-bold text-sm">Rp{expense.toLocaleString('id-ID')}</span>
                </div>
                <div className="mt-4 p-4 bg-slate-50 rounded-2xl group-hover:bg-emerald-50/30 transition-colors">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800">Saldo Bersih</span>
                        <span className={`font-black text-base ${balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            Rp{balance.toLocaleString('id-ID')}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
};

const MonitoringPage = () => {
    const { branches, allTransactions } = useAppContext();
    const [startDate, setStartDate] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const filteredData = useMemo(() => {
        return allTransactions.filter(t => {
            const d = t.date.split('T')[0];
            return d >= startDate && d <= endDate;
        });
    }, [allTransactions, startDate, endDate]);

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">monitoring unit</h1>
                    <p className="text-slate-400 font-medium mt-1">Pantau performa keuangan 12 unit secara real-time.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Periode</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-4 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" />
                        <span className="text-slate-300">to</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-4 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                </div>
            </div>

            {/* Branches Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {branches.map(branch => (
                    <BranchSummaryCard key={branch.id} branch={branch} transactions={filteredData} />
                ))}
            </div>

            {branches.length === 0 && (
                <div className="bg-white p-20 rounded-[3rem] text-center border border-dashed border-slate-200">
                    <div className="p-4 bg-slate-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <BranchIcon className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold">Belum ada unit yang terdaftar.</p>
                    <Link to="/branches" className="text-emerald-500 text-sm font-bold mt-2 inline-block hover:underline">Kelola manajemen unit</Link>
                </div>
            )}
        </div>
    );
};

export default MonitoringPage;
