import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { TransactionType, TransactionNature, Role, Branch, Transaction, Student } from '../types';
import { UserIcon, ChevronDownIcon, PencilIcon, BranchIcon, CameraIcon, ImageIcon, TrashIcon, WhatsAppIcon } from '../constants';
import { formatCurrencyInput, parseCurrencyInput } from '../utils';
import { compressImage } from '../utils/imageUtils';
import ExportModal from '../components/ExportModal';

const SyahriyahPage = () => {
    const { currentUser, allTransactions, branches, students, addStudent, updateStudent, deleteStudent, deleteStudents, addTransaction, updateTransaction, deleteTransaction, globalSearchTerm, setGlobalSearchTerm, showConfirm, showAlert } = useAppContext();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const importInputRef = useRef<HTMLInputElement>(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [viewingBranchId, setViewingBranchId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    useEffect(() => {
        if (currentUser?.role === Role.BranchUser) {
            setViewingBranchId(currentUser.branchId);
        }
    }, [currentUser]);

    // Sync global search to local search
    useEffect(() => {
        setSearchQuery(globalSearchTerm);
    }, [globalSearchTerm]);

    const handleLocalSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchQuery(val);
        setGlobalSearchTerm(val);
    };
    
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [studentForm, setStudentForm] = useState({ name: '', address: '', parentPhone: '', isActive: true });

    const [isInputModalOpen, setIsInputModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        attachmentUrl: ''
    });

    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState('');

    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const currentBranch = useMemo(() => branches.find(b => b.id === viewingBranchId), [branches, viewingBranchId]);

    const filteredStudents = useMemo(() => {
        if (!viewingBranchId) return [];
        return students
            .filter(s => s.branchId === viewingBranchId)
            .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [students, viewingBranchId, searchQuery]);

    const infaqBulananPayments = useMemo(() => {
        return allTransactions.filter(t => 
            (t.category === 'Infaq Bulanan' || t.category === 'Syahriyah') && 
            t.branchId === viewingBranchId
        );
    }, [allTransactions, viewingBranchId]);

    const getPayment = (studentId: string, studentName: string, monthIndex: number) => {
        return infaqBulananPayments.find(t => {
            const date = new Date(t.date);
            const isCorrectPeriod = t.description.includes(months[monthIndex]) && date.getFullYear() === selectedYear;
            
            // Prefer matching by studentId (stored in t.item)
            if (t.item === studentId) return isCorrectPeriod;
            
            // Fallback for old data: match by name in description
            return isCorrectPeriod && t.description.includes(studentName);
        });
    };

    const handleOpenPayment = (student: Student, monthIndex: number = new Date().getMonth(), isNew: boolean = false) => {
        if (!student.isActive) return;
        
        setSelectedStudent(student);
        setSelectedMonth(monthIndex);
        
        const existing = isNew ? null : getPayment(student.id, student.name, monthIndex);
        setEditingTransaction(existing || null);
        
        setPaymentForm({
            amount: existing ? formatCurrencyInput(existing.amount.toString()) : '',
            date: existing ? existing.date.split('T')[0] : new Date().toISOString().split('T')[0],
            attachmentUrl: existing?.attachmentUrl || ''
        });
        setIsInputModalOpen(true);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsCompressing(true);
        try {
            const compressed = await compressImage(file);
            setPaymentForm(prev => ({ ...prev, attachmentUrl: compressed }));
        } catch (error) {
            showAlert("Error", "Gagal memproses gambar.", "danger");
        } finally {
            setIsCompressing(false);
            e.target.value = '';
        }
    };

    const handleSavePayment = async () => {
        if (!selectedStudent || !paymentForm.amount) return;
        const amount = parseCurrencyInput(paymentForm.amount);
        
        const transactionData = {
            date: new Date(paymentForm.date).toISOString(),
            branchId: selectedStudent.branchId,
            category: 'Infaq Bulanan',
            description: `Infaq Bulanan ${months[selectedMonth]} ${selectedYear} - ${selectedStudent.name}`,
            amount,
            type: TransactionType.Income,
            nature: TransactionNature.Money,
            item: selectedStudent.id,
            attachmentUrl: paymentForm.attachmentUrl
        };

        if (editingTransaction) {
            await updateTransaction({ ...editingTransaction, ...transactionData });
        } else {
            await addTransaction(transactionData);
        }

        setIsInputModalOpen(false);
        
        // After successful save, show confirmation to send WA
        const savedMonth = months[selectedMonth];
        const savedAmount = paymentForm.amount;
        const savedStudent = selectedStudent;

        showConfirm(
            "Pembayaran Berhasil!",
            `Data infaq bulanan ${savedStudent.name} bulan ${savedMonth} telah tersimpan. Ingin mengirim kuitansi ke WhatsApp orang tua?`,
            () => sendWhatsAppNotification(savedStudent, savedMonth, savedAmount, true),
            'success',
            'Ya, Kirim WA'
        );
    };

    const sendWhatsAppNotification = (student: Student, monthName: string, amount: string, isPaid: boolean) => {
        if (!student.parentPhone) return showAlert("Peringatan", "Nomor WA orang tua tidak ditemukan.", "danger");
        
        const phone = student.parentPhone.replace(/[^0-9]/g, '').replace(/^0/, '62');
        let message = '';
        
        if (isPaid) {
            message = `Assalamu'alaikum, pembayaran Infaq Bulanan santri *${student.name}* untuk bulan *${monthName}* sebesar *Rp${amount}* telah kami terima. Syukron. Jazakumullah khairan katsiran wa jazakumullah ahsanal jaza.`;
        } else {
            message = `Assalamu'alaikum Warahmatullahi Wabarakatuh, Bapak/Ibu wali santri dari *${student.name}*. Menginfokan bahwa untuk Infaq Bulanan bulan *${monthName} ${selectedYear}* saat ini belum tercatat dalam sistem kami. Mohon bantuannya untuk melakukan penyelesaian administrasi. Jika sudah melakukan pembayaran, mohon abaikan pesan ini atau kirimkan foto notanya. Syukron. Wassalamu'alaikum.`;
        }
        
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handleDeletePayment = async () => {
        if (!editingTransaction) return;
        showConfirm(
            'Hapus Pembayaran',
            'Yakin ingin menghapus data infaq bulanan ini?',
            async () => {
                await deleteTransaction(editingTransaction.id);
                setIsInputModalOpen(false);
            }
        );
    };

    const handleDeleteStudent = async (student: Student) => {
        showConfirm(
            'Hapus Data Santri',
            `Yakin ingin menghapus data santri ${student.name}? Semua data pembayaran santri ini akan tetap ada namun tidak lagi terikat dengan nama santri ini.`,
            async () => {
                await deleteStudent(student.id);
            }
        );
    };

    const handleAddOrUpdateStudent = async () => {
        if (!studentForm.name) {
            showAlert("Peringatan", "Nama santri wajib diisi!", "danger");
            return;
        }

        try {
            if (editingStudent) {
                await updateStudent({ ...editingStudent, ...studentForm });
            } else {
                const branchId = viewingBranchId || currentUser?.branchId || '1';
                await addStudent({
                    ...studentForm,
                    branchId
                });
            }
            setIsAddStudentModalOpen(false);
            setStudentForm({ name: '', address: '', parentPhone: '', isActive: true });
            setEditingStudent(null);
        } catch (error: any) {
            console.error("Failed to save student", error);
            showAlert("Gagal", `Gagal menyimpan data santri: ${error.message || 'Error tidak diketahui'}. Silakan restart server bos.`, "danger");
        }
    };


    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSelectAll = () => {
        if (selectedIds.length > 0 && selectedIds.length === filteredStudents.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredStudents.map(s => s.id));
        }
    };

    const handleBulkDelete = () => {
        showConfirm(
            "Hapus Masal Santri",
            `Yakin ingin menghapus ${selectedIds.length} santri terpilih? Semua data pembayaran mereka akan tetap ada namun tidak lagi terikat dengan nama santri ini.`,
            async () => {
                await deleteStudents(selectedIds);
                setSelectedIds([]);
            }
        );
    };

    const handleDownloadFormat = () => {

        const headers = "Nama Lengkap,Alamat,No HP Orang Tua\n";
        const blob = new Blob([headers], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'format_import_santri.csv';
        a.click();
    };


    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        showConfirm(
            "Konfirmasi Import",
            `Anda akan mengimport data santri ke unit "${currentBranch?.name}". Pastikan file CSV sudah sesuai format. Lanjutkan?`,
            async () => {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const text = event.target?.result as string;
                    const lines = text.split(/\r?\n/);
                    let importedCount = 0;
                    
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;
                        
                        // Support both comma and semicolon
                        const delimiter = line.includes(';') ? ';' : ',';
                        const [name, address, parentPhone] = line.split(delimiter);
                        
                        if (name && name.trim()) {
                            await addStudent({
                                name: name.trim().replace(/^"|"$/g, ''), // Remove quotes if any
                                address: (address?.trim() || '').replace(/^"|"$/g, ''),
                                parentPhone: (parentPhone?.trim() || '').replace(/^"|"$/g, ''),
                                isActive: true,
                                branchId: viewingBranchId || '1'
                            });
                            importedCount++;
                        }
                    }
                    showAlert("Berhasil", `Import selesai! ${importedCount} santri berhasil ditambahkan ke ${currentBranch?.name}.`, "success");
                };
                reader.readAsText(file);
            },
            'info',
            'Ya, Import'
        );
        
        e.target.value = '';
    };


    const openImageModal = (url: string) => {
        setSelectedImageUrl(url);
        setIsImageModalOpen(true);
    };

    if ((currentUser?.role === Role.Admin || currentUser?.role === Role.SubAdmin) && !viewingBranchId) {
        return (
            <div className="space-y-10 animate-in fade-in duration-700">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Monitoring Infaq Bulanan</h1>
                <p className="text-slate-400 font-medium mt-1">Pilih unit untuk memantau data infaq bulanan santri.</p>
            </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {branches.map(branch => {
                        const branchStudents = students.filter(s => s.branchId === branch.id);
                        return (
                            <div key={branch.id} onClick={() => setViewingBranchId(branch.id)} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all cursor-pointer group">
                                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-emerald-50 transition-colors w-fit mb-4">
                                    <BranchIcon className="w-6 h-6 text-slate-400 group-hover:text-emerald-500" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-emerald-600 transition-colors">{branch.name}</h3>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-slate-400 font-medium">{branch.location}</p>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{branchStudents.length} Santri</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    {(currentUser?.role === Role.Admin || currentUser?.role === Role.SubAdmin) && (
                        <button onClick={() => setViewingBranchId(null)} className="p-2.5 bg-white shadow-sm border border-slate-100 text-slate-400 rounded-xl hover:text-emerald-500 transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Infaq Bulanan: {currentBranch?.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex bg-white p-1 rounded-lg border border-slate-100 items-center">
                                <button onClick={() => setSelectedYear(selectedYear - 1)} className="p-1 hover:bg-slate-50 rounded-md text-slate-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
                                <span className="font-bold text-slate-700 text-xs px-2">{selectedYear}</span>
                                <button onClick={() => setSelectedYear(selectedYear + 1)} className="p-1 hover:bg-slate-50 rounded-md text-slate-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    {selectedIds.length > 0 && (
                        <button onClick={handleBulkDelete} className="px-4 py-3 bg-red-50 text-red-600 border border-red-100 font-bold text-[10px] uppercase tracking-widest rounded-2xl hover:bg-red-100 transition-all flex items-center gap-2">
                            <TrashIcon className="w-3.5 h-3.5" />
                            Hapus ({selectedIds.length})
                        </button>
                    )}
                    <button onClick={handleDownloadFormat} className="px-4 py-3 bg-white border border-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all">Format</button>

                    <button onClick={() => importInputRef.current?.click()} className="px-4 py-3 bg-white border border-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all">
                        Import
                        <input type="file" ref={importInputRef} className="hidden" accept=".csv" onChange={handleImportExcel} />
                    </button>
                    <button onClick={() => setIsExportModalOpen(true)} className="px-4 py-3 bg-white border border-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-2xl shadow-sm hover:bg-slate-50 transition-all">Export</button>
                    {currentUser?.role === Role.BranchUser && (
                        <button onClick={() => { setEditingStudent(null); setStudentForm({ name: '', address: '', parentPhone: '', isActive: true }); setIsAddStudentModalOpen(true); }} className="px-6 py-3 bg-emerald-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all">
                            + Santri
                        </button>
                    )}
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input 
                    type="text" 
                    placeholder="Cari nama santri..." 
                    value={searchQuery}
                    onChange={handleLocalSearchChange}
                    className="w-full pl-11 pr-4 py-4 bg-white border border-slate-100 rounded-3xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none font-medium text-slate-700 transition-all"
                />
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left border-collapse min-w-max">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="sticky left-0 z-20 bg-slate-50/80 backdrop-blur-sm px-4 sm:px-8 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px] border-b border-slate-100 w-[160px] sm:w-[380px]">
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                                            checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length}
                                            onChange={handleSelectAll}
                                        />
                                        <span>Data Santri</span>
                                    </div>
                                </th>

                                {months.map(m => (
                                    <th key={m} className="px-4 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px] border-b border-slate-100 text-center min-w-[110px]">{m}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStudents.map(student => (
                                <tr key={student.id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/80 backdrop-blur-sm px-4 sm:px-8 py-4 border-r border-slate-50">
                                        <div className="flex items-center gap-4">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer flex-shrink-0"
                                                checked={selectedIds.includes(student.id)}
                                                onChange={() => handleToggleSelect(student.id)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                            <div className="flex items-center gap-2 sm:gap-3 overflow-hidden flex-1">
                                                <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${student.isActive ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'} hidden xs:block`}>
                                                    <UserIcon className="w-3.5 h-3.5 sm:w-4 h-4" />
                                                </div>

                                                <div className="overflow-hidden flex-1">
                                                    <p className={`font-bold truncate text-[11px] sm:text-sm leading-tight mb-0.5 ${student.isActive ? 'text-slate-700' : 'text-red-600'}`}>{student.name}</p>
                                                    {student.parentPhone && (
                                                        <a 
                                                            href={`https://wa.me/${student.parentPhone.replace(/[^0-9]/g, '').replace(/^0/, '62')}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-[9px] sm:text-[10px] text-emerald-600 font-bold hover:underline block mb-1"
                                                        >
                                                            WA: {student.parentPhone}
                                                        </a>
                                                    )}
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                                        <span className={`text-[7px] sm:text-[8px] font-bold uppercase tracking-widest px-1 py-0.5 rounded-md w-fit flex-shrink-0 ${student.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                            {student.isActive ? 'Aktif' : 'Off'}
                                                        </span>
                                                        <p className="text-[9px] text-slate-400 truncate italic">
                                                            {student.address ? (student.address.length > 10 ? `${student.address.substring(0, 10)}...` : student.address) : '-'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 flex-shrink-0 ml-auto sm:ml-0">
                                                {currentUser?.role === Role.BranchUser && (
                                                    <button 
                                                        onClick={() => handleOpenPayment(student, new Date().getMonth(), true)}
                                                        className="px-3 sm:px-4 py-1.5 sm:py-2.5 bg-emerald-500 text-white font-bold text-[8px] sm:text-[10px] uppercase tracking-widest rounded-lg sm:rounded-xl hover:bg-emerald-600 transition-all active:scale-95 shadow-md shadow-emerald-500/10 w-full sm:w-auto"
                                                    >
                                                        Bayar
                                                    </button>
                                                )}
                                                <div className="flex items-center gap-0.5 sm:gap-1">
                                                    <button onClick={() => { setEditingStudent(student); setStudentForm({ name: student.name, address: student.address || '', parentPhone: student.parentPhone || '', isActive: student.isActive }); setIsAddStudentModalOpen(true); }} className="p-1 sm:p-2 text-slate-300 hover:text-slate-600 transition-colors">
                                                        <PencilIcon className="w-3 h-3 sm:w-4 h-4" />
                                                    </button>
                                                    {currentUser?.role === Role.BranchUser && (
                                                        <button onClick={() => handleDeleteStudent(student)} className="p-1 sm:p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                            <TrashIcon className="w-3 h-3 sm:w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    {months.map((_, idx) => {
                                        const p = getPayment(student.id, student.name, idx);
                                        return (
                                            <td 
                                                key={idx} 
                                                onClick={() => student.isActive && handleOpenPayment(student, idx)} 
                                                className={`px-2 py-4 text-center cursor-pointer transition-all border-r border-slate-50/50 min-h-[50px] ${p ? 'bg-emerald-50/30' : student.isActive ? 'hover:bg-slate-50' : 'bg-slate-50/20 cursor-not-allowed'}`}
                                            >
                                                {p ? (
                                                    <div className="flex flex-col items-center gap-1 group/wa">
                                                        <span className="text-emerald-600 font-bold text-[10px]">Rp{p.amount.toLocaleString('id-ID')}</span>
                                                        <div className="flex items-center gap-1">
                                                            {p.attachmentUrl && <ImageIcon className="w-2.5 h-2.5 text-emerald-400" />}
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); sendWhatsAppNotification(student, months[idx], p.amount.toLocaleString('id-ID'), true); }}
                                                                className="opacity-0 group-hover:opacity-100 group-hover/wa:opacity-100 transition-opacity p-0.5 hover:text-emerald-500"
                                                                title="Kirim Kuitansi WA"
                                                            >
                                                                <WhatsAppIcon className="w-3 h-3 text-emerald-500" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1 group/wa">
                                                        <span className="text-slate-200 text-[10px]">—</span>
                                                        {student.isActive && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); sendWhatsAppNotification(student, months[idx], '', false); }}
                                                                className="opacity-0 group-hover:opacity-100 group-hover/wa:opacity-100 transition-opacity p-0.5 text-red-300 hover:text-red-500"
                                                                title="Kirim Pengingat WA"
                                                            >
                                                                <WhatsAppIcon className="w-3.5 h-3.5" />
                                                            </button>

                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Input Payment Modal */}
            {isInputModalOpen && selectedStudent && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex justify-center items-center p-4" onClick={() => setIsInputModalOpen(false)}>
                    <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold text-slate-800 leading-none">{editingTransaction ? 'Revisi Infaq Bulanan' : 'Input Infaq Bulanan'}</h2>
                                <p className="text-emerald-600 text-[9px] font-bold uppercase tracking-widest mt-2">PPHQ Finance Portal</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Siswa</p>
                                <p className="text-xs sm:text-sm font-bold text-slate-700 truncate max-w-[100px]">{selectedStudent.name}</p>
                            </div>
                        </div>
                        
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Bulan</label>
                                    <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="mt-1 w-full px-3 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500">
                                        {months.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tanggal</label>
                                    <input type="date" value={paymentForm.date} onChange={e => setPaymentForm(prev => ({ ...prev, date: e.target.value }))} className="mt-1 w-full px-3 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nominal (Rp)</label>
                                <input type="text" autoFocus value={paymentForm.amount} onChange={e => setPaymentForm(prev => ({ ...prev, amount: formatCurrencyInput(e.target.value) }))} placeholder="0" className="mt-1 w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-black text-slate-800 text-lg" />
                            </div>

                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nota <span className="normal-case font-normal text-slate-400 text-[8px] ml-1">(max 200kb)</span></label>
                                <div className="mt-1 space-y-3">
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex-1 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-2"><CameraIcon className="w-3.5 h-3.5" /> Kamera</button>
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 py-2.5 bg-slate-50 text-slate-600 rounded-xl font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-2"><ImageIcon className="w-3.5 h-3.5" /> File</button>
                                    </div>
                                    
                                    <div className="h-28 border-2 border-dashed border-slate-100 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group bg-slate-50/50">
                                        {paymentForm.attachmentUrl ? (
                                            <img src={paymentForm.attachmentUrl} alt="Preview" className="w-full h-full object-cover cursor-pointer" onClick={() => openImageModal(paymentForm.attachmentUrl)} />
                                        ) : isCompressing ? (
                                            <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
                                        ) : (
                                            <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest">Klik tombol upload</p>
                                        )}
                                        {paymentForm.attachmentUrl && (
                                            <button onClick={() => setPaymentForm(prev => ({ ...prev, attachmentUrl: '' }))} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-3 h-3" /></button>
                                        )}
                                    </div>
                                </div>
                                <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>
                            
                            <div className="flex flex-wrap gap-2 pt-4">
                                <button onClick={() => setIsInputModalOpen(false)} className="flex-1 min-w-[80px] py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs">Batal</button>
                                {editingTransaction && (
                                    <button onClick={handleDeletePayment} className="flex-1 min-w-[80px] py-3 bg-red-50 text-red-600 font-bold rounded-xl text-xs hover:bg-red-100 transition-all">Hapus</button>
                                )}
                                <button onClick={handleSavePayment} className="flex-[2] min-w-[150px] py-3 bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20">{editingTransaction ? 'Simpan Revisi' : 'Simpan Bayar'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Student Modal */}
            {isAddStudentModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex justify-center items-center p-4" onClick={() => setIsAddStudentModalOpen(false)}>
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-black text-slate-800 mb-6">{editingStudent ? 'Edit Santri' : 'Tambah Santri'}</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap *</label>
                                <input type="text" autoFocus value={studentForm.name} onChange={e => setStudentForm(prev => ({ ...prev, name: e.target.value }))} className="mt-1 w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-slate-800 text-sm" />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Alamat</label>
                                <input type="text" value={studentForm.address} onChange={e => setStudentForm(prev => ({ ...prev, address: e.target.value }))} className="mt-1 w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm" />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">No HP Orang Tua</label>
                                <input type="text" value={studentForm.parentPhone} onChange={e => setStudentForm(prev => ({ ...prev, parentPhone: e.target.value }))} className="mt-1 w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm" />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                <span className="text-[10px] font-bold text-slate-700">Aktif</span>
                                <button onClick={() => setStudentForm(prev => ({ ...prev, isActive: !prev.isActive }))} className={`w-10 h-5 rounded-full transition-all relative ${studentForm.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}><div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${studentForm.isActive ? 'right-0.5' : 'left-0.5'}`} /></button>
                            </div>
                            
                            <div className="flex gap-2 pt-6">
                                <button onClick={() => setIsAddStudentModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs">Batal</button>
                                <button onClick={handleAddOrUpdateStudent} className="flex-[2] py-3 bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20">Simpan</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Detail Modal */}
            {isImageModalOpen && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[110] flex justify-center items-center p-4 md:p-10" onClick={() => setIsImageModalOpen(false)}>
                    <div className="relative max-w-4xl w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img src={selectedImageUrl} alt="Nota Full" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
                        <button onClick={() => setIsImageModalOpen(false)} className="absolute top-0 right-0 p-2 text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                </div>
            )}

            <ExportModal 
                isOpen={isExportModalOpen} 
                onClose={() => setIsExportModalOpen(false)} 
                transactions={infaqBulananPayments}
                branches={branches}
                title="Laporan Infaq Bulanan"
                branchName={currentBranch?.name}
                mode="syahriyah"
                students={filteredStudents}
                selectedYear={selectedYear}
            />
        </div>
    );
};

export default SyahriyahPage;
