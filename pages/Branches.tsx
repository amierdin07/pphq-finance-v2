import React, { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Branch, User, Role } from '../types';
import { BranchIcon, UserIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '../constants';

const Branches = () => {
    const { branches, users, addBranch, updateBranch, deleteBranch, addUser, updateUserByAdmin, deleteUser } = useAppContext();
    
    // State for Branch Modal
    const [isBranchModalOpen, setBranchModalOpen] = useState(false);
    const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
    const [branchName, setBranchName] = useState('');
    const [branchLocation, setBranchLocation] = useState('');

    // State for User Modal
    const [isUserModalOpen, setUserModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [userPassword, setUserPassword] = useState('');
    const [userBranchId, setUserBranchId] = useState('');
    const [userIsActive, setUserIsActive] = useState(true);

    const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});

    const togglePasswordVisibility = (userId: string) => {
        setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
    };

    // Branch Modal Logic
    const openBranchModal = (branch: Branch | null = null) => {
        setCurrentBranch(branch);
        setBranchName(branch?.name || '');
        setBranchLocation(branch?.location || '');
        setBranchModalOpen(true);
    };
    const closeBranchModal = () => setBranchModalOpen(false);

    const handleBranchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (currentBranch) {
            await updateBranch({ ...currentBranch, name: branchName, location: branchLocation });
        } else {
            await addBranch({ name: branchName, location: branchLocation });
        }
        closeBranchModal();
    };

    const handleBranchDelete = async (id: string) => {
        if (window.confirm('Yakin hapus unit ini? Semua pengguna dan transaksi yang terkait dengan unit ini juga akan dihapus.')) {
            await deleteBranch(id);
        }
    };

    // User Modal Logic
    const openUserModal = (user: User | null = null) => {
        if (branches.length === 0) {
            alert('Silakan buat unit terlebih dahulu sebelum menambahkan pengguna.');
            return;
        }
        setCurrentUser(user);
        setUserName(user?.name || '');
        setUserEmail(user?.email || '');
        setUserPassword(user?.password || ''); // Admin can see and change
        setUserBranchId(user?.branchId || branches[0].id);
        setUserIsActive(user?.isActive ?? true);
        setUserModalOpen(true);
    };
    const closeUserModal = () => setUserModalOpen(false);
    
    const handleUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const userData = {
            name: userName,
            email: userEmail,
            role: Role.BranchUser,
            branchId: userBranchId,
            isActive: userIsActive,
            password: userPassword
        };

        if (currentUser) {
            await updateUserByAdmin({ ...currentUser, ...userData });
        } else {
            if (!userPassword) {
                alert("Password wajib diisi untuk pengguna baru.");
                return;
            }
            await addUser({ ...userData, password: userPassword });
        }
        closeUserModal();
    };
    
    const handleUserDelete = async (id: string) => {
        if (window.confirm('Yakin hapus pengguna ini?')) {
            await deleteUser(id);
        }
    };

    const getBranchUsers = (branchId: string) => users.filter(u => u.branchId === branchId && u.role === Role.BranchUser);

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">manajemen unit</h1>
                    <p className="text-slate-400 font-medium mt-1">Kelola data unit dan akun pengguna unit.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => openBranchModal()} className="px-6 py-3 bg-white border border-slate-100 text-slate-600 font-bold text-sm rounded-2xl shadow-sm hover:bg-slate-50 transition-all">
                        + unit baru
                    </button>
                    <button onClick={() => openUserModal()} className="px-6 py-3 bg-emerald-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all">
                        + Pengguna Baru
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {branches.map(branch => (
                    <div key={branch.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-emerald-50 transition-colors">
                                <BranchIcon className="w-6 h-6 text-slate-400 group-hover:text-emerald-500" />
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => openBranchModal(branch)} className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"><PencilIcon className="w-4 h-4" /></button>
                                <button onClick={() => handleBranchDelete(branch.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-1">{branch.name}</h3>
                        <p className="text-xs text-slate-400 font-medium mb-6 uppercase tracking-widest">{branch.location}</p>
                        
                        <div className="space-y-3 pt-6 border-t border-slate-50">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Pengguna unit:</h4>
                            {getBranchUsers(branch.id).map(user => (
                                <div key={user.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 leading-none">{user.name}</p>
                                        <p className="text-[9px] text-slate-400 mt-1">{user.email}</p>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'} shadow-sm`} />
                                </div>
                            ))}
                            {getBranchUsers(branch.id).length === 0 && <p className="text-[10px] text-slate-300 italic">Belum ada pengguna.</p>}
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30">
                    <h2 className="text-xl font-bold text-slate-800">Daftar Pengguna unit</h2>
                    <p className="text-xs text-slate-400 font-medium mt-1">Gunakan tabel ini untuk melihat atau merubah kata sandi pengguna.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Pengguna</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">unit</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Kata Sandi</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Status</th>
                                <th className="px-8 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {users.filter(u => u.role !== Role.Admin).map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-4">
                                        <p className="font-bold text-slate-800">{user.name}</p>
                                        <p className="text-xs text-slate-400">{user.email}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-lg">
                                            {branches.find(b => b.id === user.branchId)?.name || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                                                {showPasswords[user.id] ? user.password : '••••••••'}
                                            </span>
                                            <button onClick={() => togglePasswordVisibility(user.id)} className="text-slate-400 hover:text-emerald-500 transition-colors">
                                                {showPasswords[user.id] ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                         <span className={`px-2 py-1 text-[9px] font-bold uppercase tracking-widest rounded-md ${user.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            {user.isActive ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openUserModal(user)} className="p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500 rounded-xl transition-all"><PencilIcon className="w-4 h-4" /></button>
                                            <button onClick={() => handleUserDelete(user.id)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Branch Modal */}
            {isBranchModalOpen && (
                 <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex justify-center items-center p-4" onClick={closeBranchModal}>
                    <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-black text-slate-800 mb-8">{currentBranch ? 'Edit' : 'Tambah'} unit</h2>
                        <form onSubmit={handleBranchSubmit} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nama unit</label>
                                <input type="text" value={branchName} onChange={e => setBranchName(e.target.value)} className="mt-2 block w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-800" required />
                            </div>
                             <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Lokasi</label>
                                <input type="text" value={branchLocation} onChange={e => setBranchLocation(e.target.value)} className="mt-2 block w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700" required />
                            </div>
                            <div className="flex justify-end gap-3 pt-6">
                                <button type="button" onClick={closeBranchModal} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">Batal</button>
                                <button type="submit" className="flex-[2] py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all">Simpan unit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* User Modal */}
            {isUserModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex justify-center items-center p-4" onClick={closeUserModal}>
                    <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-black text-slate-800 mb-8">{currentUser ? 'Edit' : 'Tambah'} Pengguna</h2>
                        <form onSubmit={handleUserSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nama Pengguna</label>
                                    <input type="text" value={userName} onChange={e => setUserName(e.target.value)} className="mt-2 block w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-800" required />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Alamat Email</label>
                                    <input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="mt-2 block w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700" required />
                                </div>
                            </div>
                             <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Kata Sandi (Password)</label>
                                <input type="text" value={userPassword} onChange={e => setUserPassword(e.target.value)} className="mt-2 block w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-slate-800" required />
                                {currentUser && <p className="text-[9px] text-slate-400 mt-2 font-medium italic">Ganti kata sandi langsung di sini jika diperlukan.</p>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Penempatan unit</label>
                                    <select value={userBranchId} onChange={e => setUserBranchId(e.target.value)} className="mt-2 block w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-700 appearance-none" required>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                 <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Status Akun</label>
                                    <select value={userIsActive ? 'true' : 'false'} onChange={e => setUserIsActive(e.target.value === 'true')} className="mt-2 block w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-700 appearance-none">
                                        <option value="true">Aktif</option>
                                        <option value="false">Nonaktif</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-6">
                                <button type="button" onClick={closeUserModal} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">Batal</button>
                                <button type="submit" className="flex-[2] py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all">Simpan Pengguna</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Branches;