import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { Transaction, TransactionNature, TransactionType } from '../types';
import { SearchIcon, GiftIcon } from '../constants';
import ExportModal from '../components/ExportModal';

const BranchTransactions = () => {
    const { branchId } = useParams<{ branchId: string }>();
    const { allTransactions, branches } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState('');

    const branch = useMemo(() => branches.find(b => b.id === branchId), [branches, branchId]);

    const filteredTransactions = useMemo(() => {
        if (!branchId) return [];
        return allTransactions
            .filter(t => t.branchId === branchId && t.nature === TransactionNature.Money)
            .filter(t => {
                const d = t.date.split('T')[0];
                const matchesDate = d >= startDate && d <= endDate;
                const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                      t.category.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesDate && matchesSearch;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allTransactions, branchId, searchTerm, startDate, endDate]);

    if (!branch) {
        return (
            <div className="text-center p-10">
                <h1 className="text-2xl font-bold text-red-600">Cabang Tidak Ditemukan</h1>
                <Link to="/" className="text-primary hover:underline mt-4 inline-block">Kembali ke Dasbor</Link>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="bg-card p-6 md:p-8 rounded-xl shadow-sm border border-border">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Monitoring: {branch.name}</h1>
                        <p className="text-text-secondary text-sm">Menampilkan riwayat transaksi {branch.location}.</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Periode</span>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" />
                            <span className="text-slate-300">s/d</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="relative w-full md:max-w-md">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <SearchIcon className="w-5 h-5 text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Cari deskripsi atau kategori..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-border focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        />
                    </div>
                    <button 
                        onClick={() => setIsExportModalOpen(true)}
                        className="w-full md:w-auto px-6 py-3 bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        Download Laporan (PDF/Excel)
                    </button>
                </div>

                <ExportModal 
                    isOpen={isExportModalOpen} 
                    onClose={() => setIsExportModalOpen(false)} 
                    transactions={filteredTransactions}
                    branches={branches}
                    title={`Laporan Cabang ${branch.name}`}
                    branchName={branch.name}
                    mode="detailed"
                />

                <div className="overflow-x-auto rounded-2xl border border-slate-50">
                    <table className="w-full text-sm text-left text-text-secondary">
                        <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/50">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-bold">Tanggal</th>
                                <th scope="col" className="px-6 py-4 font-bold">Kategori</th>
                                <th scope="col" className="px-6 py-4 font-bold">Deskripsi</th>
                                <th scope="col" className="px-6 py-4 font-bold text-center">Nota</th>
                                <th scope="col" className="px-6 py-4 font-bold text-right">Jumlah</th>
                                <th scope="col" className="px-6 py-4 font-bold text-center">Tipe</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredTransactions.map(t => (
                                <tr key={t.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-slate-500">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                                    <td className="px-6 py-4 text-slate-500 font-medium">{t.category}</td>
                                    <td className="px-6 py-4 font-bold text-text-primary">{t.description}</td>
                                    <td className="px-6 py-4 text-center">
                                        {t.attachmentUrl ? (
                                            <button 
                                                onClick={() => {
                                                    setSelectedImageUrl(t.attachmentUrl!);
                                                    setIsImageModalOpen(true);
                                                }}
                                                className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 hover:border-emerald-500 transition-all mx-auto"
                                            >
                                                <img src={t.attachmentUrl} alt="Nota" className="w-full h-full object-cover" />
                                            </button>
                                        ) : (
                                            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Tidak ada</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right font-black">
                                        {t.nature === TransactionNature.Money ? (
                                            <span className={t.type === TransactionType.Income ? 'text-emerald-500' : 'text-red-500'}>
                                                Rp{t.amount.toLocaleString('id-ID')}
                                            </span>
                                        ) : (
                                             <div className="flex items-center justify-end gap-2 text-slate-400">
                                                <GiftIcon className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase tracking-widest">Barang</span>
                                             </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                       <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg ${
                                            t.type === TransactionType.Income
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : 'bg-red-50 text-red-600'
                                        }`}>
                                            {t.type === TransactionType.Income ? 'Masuk' : 'Keluar'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                 {filteredTransactions.length === 0 && (
                    <div className="text-center py-20 bg-slate-50/50 rounded-b-2xl">
                        <div className="p-4 bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
                             <SearchIcon className="w-8 h-8 text-slate-200" />
                        </div>
                        <p className="text-slate-400 font-bold text-sm">Tidak ada transaksi ditemukan pada periode ini.</p>
                    </div>
                 )}
            </div>

            {/* Image Detail Modal */}
            {isImageModalOpen && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex justify-center items-center p-4 md:p-10" onClick={() => setIsImageModalOpen(false)}>
                    <div className="relative max-w-4xl w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img src={selectedImageUrl} alt="Nota Full" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
                        <button 
                            onClick={() => setIsImageModalOpen(false)}
                            className="absolute top-0 right-0 md:-top-10 md:-right-10 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BranchTransactions;
