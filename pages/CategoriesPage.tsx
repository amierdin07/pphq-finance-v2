import React, { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Category, TransactionType } from '../types';

const CategoriesPage = () => {
    const { categories, addCategory, updateCategory, deleteCategory, showConfirm } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
    const [name, setName] = useState('');
    const [type, setType] = useState<TransactionType>(TransactionType.Income);

    const openModal = (category: Category | null = null) => {
        setCurrentCategory(category);
        setName(category ? category.name : '');
        setType(category ? category.type : TransactionType.Income);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentCategory(null);
        setName('');
        setType(TransactionType.Income);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;
        if (currentCategory) {
            await updateCategory({ ...currentCategory, name, type });
        } else {
            await addCategory({ name, type });
        }
        closeModal();
    };

    const handleDelete = async (id: string) => {
        showConfirm(
            'Hapus Kategori?',
            'Apakah Anda yakin ingin menghapus kategori ini?',
            async () => {
                await deleteCategory(id);
            },
            'danger'
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-text-primary">Manajemen Kategori</h1>
                <button
                    onClick={() => openModal()}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                    Tambah Kategori
                </button>
            </div>

            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-text-secondary">
                        <thead className="text-xs text-text-secondary uppercase bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nama Kategori</th>
                                <th scope="col" className="px-6 py-3">Tipe</th>
                                <th scope="col" className="px-6 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...categories]
                                .sort((a, b) => {
                                    if (a.type === TransactionType.Income && b.type === TransactionType.Expense) return -1;
                                    if (a.type === TransactionType.Expense && b.type === TransactionType.Income) return 1;
                                    return a.name.localeCompare(b.name);
                                })
                                .map(category => (
                                <tr key={category.id} className="bg-white border-b border-border hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-text-primary">{category.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${category.type === TransactionType.Income ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {category.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={() => openModal(category)} className="font-medium text-primary hover:underline">Edit</button>
                                        <button onClick={() => handleDelete(category.id)} className="font-medium text-red-600 hover:underline">Hapus</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-6">{currentCategory ? 'Edit' : 'Tambah'} Kategori</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-text-primary">Nama Kategori</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="type" className="block text-sm font-medium text-text-primary">Tipe Transaksi</label>
                                <select
                                    id="type"
                                    value={type}
                                    onChange={e => setType(e.target.value as TransactionType)}
                                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white"
                                >
                                    <option value={TransactionType.Income}>Pemasukan (Income)</option>
                                    <option value={TransactionType.Expense}>Pengeluaran (Expense)</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={closeModal} className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300">Batal</button>
                                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoriesPage;