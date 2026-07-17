import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { Transaction, TransactionType, TransactionNature, Category, Role } from '../types';
import { PencilIcon, TrashIcon, CameraIcon, ImageIcon, IncomeIcon, ExpenseIcon } from '../constants';
import { formatCurrencyInput, parseCurrencyInput } from '../utils';
import { compressImage } from '../utils/imageUtils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import ExportModal from '../components/ExportModal';

interface TransactionsPageProps {
    type: TransactionType;
    nature?: TransactionNature; // Optional, defaults to Money
}

const TransactionsPage: React.FC<TransactionsPageProps> = ({ type, nature = TransactionNature.Money }) => {
    const { transactions, categories, addTransaction, updateTransaction, deleteTransaction, currentUser, globalSearchTerm, showConfirm, showAlert, branches } = useAppContext();
    const location = useLocation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const MONTH_NAMES = useMemo(() => [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ], []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState('');
    
    const [filterMonth, setFilterMonth] = useState<string>('all');
    const [filterYear, setFilterYear] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'date' | 'category' | 'amount'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportMode, setExportMode] = useState<'detailed' | 'summary'>('detailed');


    const [formState, setFormState] = useState({
        date: new Date().toISOString().split('T')[0],
        category: '',
        description: '',
        amount: '',
        attachmentUrl: '',
    });
    
    useEffect(() => {
        closeModal();
        setFilterMonth('all');
        setFilterYear('all');
        setSortBy('date');
        setSortOrder('desc');
        setSelectedCategoryFilter(null);
    }, [location.pathname, location.search]);

    useEffect(() => {
        setSelectedCategoryFilter(null);
    }, [filterMonth, filterYear]);

    const pageTitle = type === TransactionType.Income ? 'Pemasukan Uang' : 'Pengeluaran';
    const availableCategories = useMemo(() => categories.filter(c => c.type === type), [categories, type]);

    const uniqueYears = useMemo(() => {
        const years = transactions
            .filter(t => t.type === type && t.nature === nature)
            .map(t => new Date(t.date).getFullYear());
        const unique = Array.from(new Set(years)).sort((a, b) => b - a);
        return unique.length > 0 ? unique : [new Date().getFullYear()];
    }, [transactions, type, nature]);

    const handleSort = (field: 'date' | 'category' | 'amount') => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const filteredTransactions = useMemo(() => {
        let result = transactions.filter(t => t.type === type && t.nature === nature);

        // Filter by Month
        if (filterMonth !== 'all') {
            result = result.filter(t => new Date(t.date).getMonth() === parseInt(filterMonth, 10));
        }

        // Filter by Year
        if (filterYear !== 'all') {
            result = result.filter(t => new Date(t.date).getFullYear() === parseInt(filterYear, 10));
        }

        // Search Term Filter
        if (globalSearchTerm) {
            const s = globalSearchTerm.toLowerCase();
            result = result.filter(t => 
                t.description.toLowerCase().includes(s) || 
                t.category.toLowerCase().includes(s)
            );
        }

        // Sorting
        result.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'date') {
                comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
            } else if (sortBy === 'category') {
                comparison = a.category.localeCompare(b.category);
            } else if (sortBy === 'amount') {
                comparison = a.amount - b.amount;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [transactions, type, nature, globalSearchTerm, filterMonth, filterYear, sortBy, sortOrder]);

    const totalAmount = useMemo(() => {
        return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    }, [filteredTransactions]);

    const categoryData = useMemo(() => {
        const summary: { [key: string]: number } = {};
        filteredTransactions.forEach(t => {
            summary[t.category] = (summary[t.category] || 0) + t.amount;
        });
        return Object.entries(summary)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredTransactions]);

    const displayTransactions = useMemo(() => {
        if (!selectedCategoryFilter) return filteredTransactions;
        return filteredTransactions.filter(t => t.category === selectedCategoryFilter);
    }, [filteredTransactions, selectedCategoryFilter]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsCompressing(true);
        try {
            const compressed = await compressImage(file);
            setAttachmentPreview(compressed);
            setFormState(prev => ({ ...prev, attachmentUrl: compressed }));
        } catch (error) {
            console.error("Compression failed", error);
            showAlert("Error", "Gagal memproses gambar.", "danger");
        } finally {
            setIsCompressing(false);
            e.target.value = '';
        }
    };

    const openModal = (transaction: Transaction | null = null) => {
        setCurrentTransaction(transaction);
        const initialCategory = transaction?.category || (availableCategories.length > 0 ? availableCategories[0].name : '');
        setFormState({
            date: transaction ? transaction.date.split('T')[0] : new Date().toISOString().split('T')[0],
            category: initialCategory,
            description: transaction ? transaction.description : '',
            amount: transaction ? formatCurrencyInput(transaction.amount.toString()) : '',
            attachmentUrl: transaction?.attachmentUrl || '',
        });
        setAttachmentPreview(transaction?.attachmentUrl || null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentTransaction(null);
        setAttachmentPreview(null);
        setFormState({
            date: new Date().toISOString().split('T')[0],
            category: availableCategories.length > 0 ? availableCategories[0].name : '',
            description: '',
            amount: '',
            attachmentUrl: '',
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'amount') {
            setFormState(prev => ({ ...prev, [name]: formatCurrencyInput(value) }));
        } else {
            setFormState(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseCurrencyInput(formState.amount);
        if (!formState.category || !formState.description || numericAmount <= 0) {
            showAlert("Peringatan", 'Harap isi semua kolom dengan benar.', "danger");
            return;
        }

        const transactionData = {
            date: new Date(formState.date).toISOString(),
            branchId: currentUser!.branchId,
            category: formState.category,
            description: formState.description,
            amount: numericAmount,
            type: type,
            nature: nature,
            attachmentUrl: formState.attachmentUrl || undefined
        };

        if (currentTransaction) {
            await updateTransaction({ ...currentTransaction, ...transactionData });
        } else {
            await addTransaction(transactionData);
        }
        closeModal();
    };
    
    const handleDelete = async (id: string) => {
        showConfirm(
            'Hapus Transaksi?', 
            'Apakah Anda yakin ingin menghapus transaksi ini? Data yang dihapus tidak dapat dikembalikan.',
            async () => {
                await deleteTransaction(id);
            },
            'danger'
        );
    };

    const openImageModal = (url: string) => {
        setSelectedImageUrl(url);
        setIsImageModalOpen(true);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{pageTitle}</h1>
                    <p className="text-slate-400 text-sm font-medium mt-0.5">Kelola data {type === TransactionType.Income ? 'pemasukan' : 'pengeluaran'} kas cabang.</p>
                </div>
                <button onClick={() => openModal()} className="px-6 py-2.5 bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all">
                    Tambah {type === TransactionType.Income ? 'Pemasukan' : 'Pengeluaran'}
                </button>
            </div>
            
            {/* Filter Bar & Export */}
            <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm justify-between">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Filter Bulan:</span>
                        <select 
                            value={filterMonth} 
                            onChange={e => setFilterMonth(e.target.value)} 
                            className="px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                        >
                            <option value="all">Semua Bulan</option>
                            {MONTH_NAMES.map((name, index) => (
                                <option key={index} value={index}>{name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Tahun:</span>
                        <select 
                            value={filterYear} 
                            onChange={e => setFilterYear(e.target.value)} 
                            className="px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                        >
                            <option value="all">Semua Tahun</option>
                            {uniqueYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button 
                    onClick={() => {
                        setExportMode('detailed');
                        setIsExportModalOpen(true);
                    }}
                    className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    Unduh E-Statement
                </button>
            </div>

            {/* Total and Category Pie Chart Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Total Transaction Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Total {type === TransactionType.Income ? 'Pemasukan' : 'Pengeluaran'} ({filterMonth === 'all' ? 'Semua Bulan' : MONTH_NAMES[parseInt(filterMonth)]} {filterYear === 'all' ? '' : filterYear})
                            </span>
                            <div className={`p-3 rounded-2xl ${type === TransactionType.Income ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                                {type === TransactionType.Income ? <IncomeIcon className="w-6 h-6" /> : <ExpenseIcon className="w-6 h-6" />}
                            </div>
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                            Rp{totalAmount.toLocaleString('id-ID')}
                        </h2>
                        <p className="text-slate-400 text-xs font-medium mt-2">
                            Terdiri dari <span className="font-bold text-slate-700">{filteredTransactions.length}</span> transaksi yang tercatat.
                        </p>
                    </div>
                    {selectedCategoryFilter && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500">Kategori Terpilih:</span>
                                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${type === TransactionType.Income ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                    {selectedCategoryFilter}
                                </span>
                            </div>
                            <button 
                                onClick={() => setSelectedCategoryFilter(null)}
                                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                Lihat Semua
                            </button>
                        </div>
                    )}
                </motion.div>

                {/* Category Pie Chart Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[220px]"
                >
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                        Proporsi Kategori {type === TransactionType.Income ? 'Pemasukan' : 'Pengeluaran'}
                    </h3>
                    {categoryData.length > 0 ? (
                        <div className="flex-grow flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="w-full sm:w-1/2 h-[150px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={55}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {categoryData.map((entry, index) => {
                                                const COLORS = type === TransactionType.Income 
                                                    ? ['#10B981', '#34D399', '#059669', '#6EE7B7', '#047857']
                                                    : ['#EF4444', '#F59E0B', '#6366F1', '#06B6D4', '#8B5CF6', '#EC4899', '#64748B'];
                                                const isSelected = selectedCategoryFilter === entry.name;
                                                return (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={COLORS[index % COLORS.length]} 
                                                        onClick={() => {
                                                            if (selectedCategoryFilter === entry.name) {
                                                                setSelectedCategoryFilter(null);
                                                            } else {
                                                                setSelectedCategoryFilter(entry.name);
                                                            }
                                                        }}
                                                        stroke={isSelected ? '#1e293b' : 'none'}
                                                        strokeWidth={isSelected ? 2 : 0}
                                                        opacity={selectedCategoryFilter && !isSelected ? 0.35 : 1}
                                                        className="transition-all duration-300 focus:outline-none cursor-pointer"
                                                    />
                                                );
                                            })}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: number) => `Rp${value.toLocaleString('id-ID')}`}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="w-full sm:w-1/2 max-h-[140px] overflow-y-auto space-y-2 text-xs font-semibold text-slate-600 custom-scrollbar pr-1">
                                {categoryData.map((entry, index) => {
                                    const COLORS = type === TransactionType.Income 
                                        ? ['#10B981', '#34D399', '#059669', '#6EE7B7', '#047857']
                                        : ['#EF4444', '#F59E0B', '#6366F1', '#06B6D4', '#8B5CF6', '#EC4899', '#64748B'];
                                    const isSelected = selectedCategoryFilter === entry.name;
                                    return (
                                        <button 
                                            key={entry.name}
                                            onClick={() => {
                                                if (selectedCategoryFilter === entry.name) {
                                                    setSelectedCategoryFilter(null);
                                                } else {
                                                    setSelectedCategoryFilter(entry.name);
                                                }
                                            }}
                                            className={`flex items-center justify-between w-full p-1.5 rounded-lg transition-all ${
                                                isSelected ? 'bg-slate-50 border border-slate-100' : 'hover:bg-slate-50/50 border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                                <span className={`truncate max-w-[90px] text-left ${isSelected ? 'font-bold text-slate-800' : 'text-slate-500'}`}>{entry.name}</span>
                                            </div>
                                            <span className={isSelected ? 'font-bold text-slate-800' : 'text-slate-400'}>
                                                {((entry.value / totalAmount) * 100).toFixed(0)}%
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-slate-400 py-6">
                            <svg className="w-12 h-12 text-slate-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                            </svg>
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Tidak ada data untuk bulan ini</span>
                        </div>
                    )}
                </motion.div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                         <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/50">
                            <tr>
                                <th 
                                    className="px-6 py-4 font-bold cursor-pointer hover:bg-slate-100/50 select-none transition-colors"
                                    onClick={() => handleSort('date')}
                                >
                                    <div className="flex items-center gap-1">
                                        Tanggal
                                        {sortBy === 'date' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                    </div>
                                </th>
                                <th 
                                    className="px-6 py-4 font-bold cursor-pointer hover:bg-slate-100/50 select-none transition-colors"
                                    onClick={() => handleSort('category')}
                                >
                                    <div className="flex items-center gap-1">
                                        Kategori
                                        {sortBy === 'category' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                    </div>
                                </th>
                                <th className="px-6 py-4 font-bold">Deskripsi</th>
                                <th className="px-6 py-4 font-bold">Nota</th>
                                <th 
                                    className="px-6 py-4 font-bold cursor-pointer hover:bg-slate-100/50 select-none transition-colors text-right"
                                    onClick={() => handleSort('amount')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Jumlah
                                        {sortBy === 'amount' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                    </div>
                                </th>
                                <th className="px-6 py-4 font-bold text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {displayTransactions.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-slate-500 font-medium">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                                    <td className="px-6 py-4 text-slate-500 font-medium">{t.category}</td>
                                    <td className="px-6 py-4 font-bold text-slate-800">{t.description}</td>
                                    <td className="px-6 py-4">
                                        {t.attachmentUrl ? (
                                            <button 
                                                onClick={() => openImageModal(t.attachmentUrl!)}
                                                className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 hover:border-emerald-500 transition-all"
                                            >
                                                <img src={t.attachmentUrl} alt="Nota" className="w-full h-full object-cover" />
                                            </button>
                                        ) : (
                                            <span className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Tidak ada</span>
                                        )}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold ${type === TransactionType.Income ? 'text-emerald-500' : 'text-red-500'}`}>
                                        Rp{t.amount.toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => openModal(t)} 
                                                className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                                title="Edit"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(t.id)} 
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Hapus"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                 <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex justify-center items-center p-4">
                    <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">{currentTransaction ? 'Edit' : 'Tambah'} {pageTitle}</h2>
                        <p className="text-slate-400 text-sm mb-8">Lengkapi detail transaksi di bawah ini.</p>
                        
                        <form onSubmit={handleSubmit} className="space-y-5">
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="date" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Tanggal</label>
                                    <input id="date" name="date" type="date" value={formState.date} onChange={handleInputChange} className="mt-2 w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700" required />
                                </div>
                                <div>
                                    <label htmlFor="category" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Kategori</label>
                                    <select id="category" name="category" value={formState.category} onChange={handleInputChange} className="mt-2 w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700" required>
                                        <option value="" disabled>Pilih Kategori</option>
                                        {availableCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                             <div>
                                <label htmlFor="description" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Deskripsi</label>
                                <input id="description" name="description" type="text" placeholder="Misal: Pembayaran listrik" value={formState.description} onChange={handleInputChange} className="mt-2 w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700" required />
                            </div>
                            <div>
                                <label htmlFor="amount" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Jumlah (Rp)</label>
                                <div className="relative mt-2">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                                    <input id="amount" name="amount" type="text" placeholder="0" value={formState.amount} onChange={handleInputChange} className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-800 text-lg" required />
                                </div>
                            </div>

                            {/* Receipt Photo Section */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Foto Nota (Opsional) <span className="normal-case font-normal text-slate-400 text-[10px] ml-1">(max 200kb)</span></label>
                                <div className="mt-2 space-y-4">
                                    <div className="flex gap-3">
                                        <button 
                                            type="button"
                                            onClick={() => cameraInputRef.current?.click()}
                                            className="flex-1 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all"
                                        >
                                            <CameraIcon className="w-4 h-4" />
                                            Buka Kamera
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"
                                        >
                                            <ImageIcon className="w-4 h-4" />
                                            Pilih File
                                        </button>
                                    </div>
                                    
                                    <div className="h-40 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group bg-slate-50/50">
                                        {attachmentPreview ? (
                                            <img src={attachmentPreview} alt="Preview" className="w-full h-full object-contain" />
                                        ) : isCompressing ? (
                                            <div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
                                        ) : (
                                            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Belum ada foto</p>
                                        )}
                                        {attachmentPreview && (
                                            <button 
                                                type="button"
                                                onClick={() => { setAttachmentPreview(null); setFormState(prev => ({ ...prev, attachmentUrl: '' })); }} 
                                                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                </div>
                            </div>

                             <div className="flex justify-end gap-3 pt-6 border-t border-slate-50 mt-4">
                                <button type="button" onClick={closeModal} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Batal</button>
                                <button type="submit" disabled={isCompressing} className="px-10 py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 hover:scale-[1.02] transition-all disabled:opacity-50">Simpan Transaksi</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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

            {/* E-Statement Export Modal */}
            <ExportModal 
                isOpen={isExportModalOpen} 
                onClose={() => setIsExportModalOpen(false)} 
                transactions={transactions.filter(t => t.type === type)}
                branches={branches}
                title={`Unduh E-Statement ${pageTitle}`}
                branchName={currentUser?.role === Role.Admin || currentUser?.role === Role.SubAdmin ? 'semua unit' : branches.find(b => b.id === currentUser?.branchId)?.name}
                mode={exportMode}
            />
        </div>
    );
};

export default TransactionsPage;