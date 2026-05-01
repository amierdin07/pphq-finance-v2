import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Role, AppSettings } from '../types';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { gapi } from 'gapi-script';
import { CameraIcon, UserIcon, SettingsIcon, LogoutIcon } from '../constants';
import { compressImage } from '../utils/imageUtils';

// Google Icon
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.223,0-9.655-3.397-11.127-7.962l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.993,36.61,44,30.836,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
);

const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

const SettingsPage = () => {
    const { currentUser, allTransactions, settings, updateSettings, updateUser, logout } = useAppContext();
    const [token, setToken] = useState<string | null>(localStorage.getItem('google_access_token'));
    const [profile, setProfile] = useState<any | null>(JSON.parse(localStorage.getItem('google_profile') || 'null'));
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState('');

    const logoInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Branding State
    const [appLogoUrl, setAppLogoUrl] = useState(settings.appLogoUrl || '');
    const [appName, setAppName] = useState(settings.appName || '');
    const [appSubtitle, setAppSubtitle] = useState(settings.appSubtitle || '');
    const [isSavingBranding, setIsSavingBranding] = useState(false);

    // Profile State
    const [userName, setUserName] = useState(currentUser?.name || '');
    const [userEmail, setUserEmail] = useState(currentUser?.email || '');
    const [userAvatarUrl, setUserAvatarUrl] = useState(currentUser?.avatarUrl || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);

    useEffect(() => {
        const initClient = () => {
             gapi.client.init({
                clientId: GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/spreadsheets'
             });
        };
        gapi.load('client:auth2', initClient);

        if(token) {
            fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json'
                }
            })
            .then(res => res.json())
            .then(data => {
                setProfile(data);
                localStorage.setItem('google_profile', JSON.stringify(data));
            })
            .catch(err => {
                console.error("Failed to fetch profile:", err);
                handleDisconnect();
            });
        }
    }, [token]);


    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'avatar') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsCompressing(true);
        try {
            const compressed = await compressImage(file, 100, true);
            if (type === 'logo') setAppLogoUrl(compressed);
            else setUserAvatarUrl(compressed);
        } catch (error) {
            alert("Gagal memproses gambar.");
        } finally {
            setIsCompressing(false);
        }
    };

    const login = useGoogleLogin({
        onSuccess: (codeResponse) => {
            setToken(codeResponse.access_token);
            localStorage.setItem('google_access_token', codeResponse.access_token);
        },
        onError: (error) => console.log('Login Failed:', error),
        scope: 'https://www.googleapis.com/auth/spreadsheets'
    });

    const handleDisconnect = () => {
        googleLogout();
        setToken(null);
        setProfile(null);
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_profile');
        setSyncMessage('');
    };

    const handleSync = async () => {
        setIsSyncing(true);
        setSyncMessage('');

        if (!token) {
            setSyncMessage('Koneksi Google terputus. Harap hubungkan kembali.');
            setIsSyncing(false);
            return;
        }

        try {
            const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    properties: {
                        title: `PPHQ Finance - Laporan Keuangan ${new Date().toLocaleString('id-ID')}`
                    }
                })
            });

            if (!createResponse.ok) throw new Error('Failed to create spreadsheet');
            const spreadsheet = await createResponse.json();
            const spreadsheetId = spreadsheet.spreadsheetId;

            const headers = ['ID Transaksi', 'Tanggal', 'Cabang', 'Kategori', 'Deskripsi', 'Tipe', 'Jenis', 'Jumlah', 'Dibuat Oleh'];
            const values = allTransactions.map(t => [
                t.id, t.date, t.branchId, t.category, t.description, t.type, t.nature, t.amount, t.createdBy
            ]);

            const updateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    values: [headers, ...values]
                })
            });

             if (!updateResponse.ok) throw new Error('Failed to upload data');
            
            setSyncMessage(`Sinkronisasi berhasil! Lihat di: ${spreadsheet.spreadsheetUrl}`);
        } catch (error: any) {
            setSyncMessage(`Gagal menyinkronkan data: ${error.message}.`);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSaveBranding = async () => {
        setIsSavingBranding(true);
        try {
            await updateSettings({ appLogoUrl, appName, appSubtitle });
            alert('Pengaturan tampilan berhasil disimpan.');
        } catch (error) {
            alert('Gagal menyimpan pengaturan.');
        } finally {
            setIsSavingBranding(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!currentUser) return;
        
        if (newPassword && newPassword !== confirmPassword) {
            alert('Konfirmasi kata sandi tidak cocok.');
            return;
        }

        setIsSavingProfile(true);
        try {
            const updateData: any = { 
                ...currentUser, 
                name: userName, 
                email: userEmail,
                avatarUrl: userAvatarUrl 
            };
            
            if (newPassword) {
                updateData.password = newPassword;
            }

            await updateUser(updateData);
            alert('Profil berhasil diperbarui.');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            alert('Gagal memperbarui profil.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Pengaturan Akun</h1>
                    <p className="text-slate-400 font-medium mt-1">Kelola informasi profil, password, dan aplikasi.</p>
                </div>
                <button onClick={logout} className="px-5 py-2.5 bg-red-50 text-red-500 font-bold text-xs rounded-xl hover:bg-red-100 transition-all flex items-center gap-2">
                    <LogoutIcon className="w-4 h-4" />
                    Logout
                </button>
            </div>

            <div className={`grid grid-cols-1 ${currentUser?.role === Role.Admin ? 'lg:grid-cols-3' : 'max-w-2xl mx-auto'} gap-8`}>
                <div className={`${currentUser?.role === Role.Admin ? 'lg:col-span-2' : ''} space-y-8`}>
                    
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <span className="p-2 bg-blue-50 rounded-lg"><UserIcon className="w-5 h-5 text-blue-500" /></span>
                            Profil Saya
                        </h2>
                        
                        <div className="space-y-8">
                            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group">
                                <div className="relative">
                                    <img 
                                        src={userAvatarUrl || `https://i.pravatar.cc/128?u=${currentUser?.id}`} 
                                        alt="Avatar" 
                                        className="w-24 h-24 rounded-3xl object-cover shadow-xl border-4 border-white"
                                    />
                                    <button 
                                        onClick={() => avatarInputRef.current?.click()}
                                        className="absolute -bottom-2 -right-2 p-2 bg-blue-500 text-white rounded-xl shadow-lg hover:bg-blue-600 transition-all scale-90 group-hover:scale-100"
                                    >
                                        <CameraIcon className="w-4 h-4" />
                                    </button>
                                    <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
                                </div>
                                <div className="flex-grow space-y-1 text-center sm:text-left">
                                    <p className="text-sm font-bold text-slate-700">{currentUser?.email}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentUser?.role} • {currentUser?.role === Role.Admin ? 'Super Admin' : `unit ID: ${currentUser?.branchId}`}</p>
                                    {isCompressing && <p className="text-[10px] text-emerald-600 font-bold animate-pulse">Memproses gambar...</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                                    <input 
                                        type="text" 
                                        value={userName} 
                                        onChange={e => setUserName(e.target.value)}
                                        className="mt-2 w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-700"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Alamat Email</label>
                                    <input 
                                        type="email" 
                                        value={userEmail} 
                                        onChange={e => setUserEmail(e.target.value)}
                                        className="mt-2 w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-50">
                                <h3 className="text-sm font-bold text-slate-800 mb-4">Ubah Kata Sandi</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password Baru</label>
                                        <input 
                                            type="password" 
                                            value={newPassword} 
                                            onChange={e => setNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="mt-2 w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Konfirmasi Password</label>
                                        <input 
                                            type="password" 
                                            value={confirmPassword} 
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="mt-2 w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-700"
                                        />
                                    </div>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-3 italic font-medium">Biarkan kosong jika tidak ingin mengubah kata sandi.</p>
                            </div>
                            
                            <button 
                                onClick={handleSaveProfile}
                                disabled={isSavingProfile || isCompressing}
                                className="w-full sm:w-auto px-10 py-4 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                            >
                                {isSavingProfile ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
                            </button>
                        </div>
                    </div>

                    {currentUser?.role === Role.Admin && (
                        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <span className="p-2 bg-emerald-50 rounded-lg"><svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" /></svg></span>
                                Tampilan Aplikasi
                            </h2>
                            <p className="text-slate-400 text-sm mb-6 ml-11">Kustomisasi logo dan branding aplikasi.</p>
                            
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nama Aplikasi</label>
                                        <input 
                                            type="text" 
                                            value={appName} 
                                            onChange={e => setAppName(e.target.value)}
                                            className="mt-2 w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Slogan / Subtitle</label>
                                        <input 
                                            type="text" 
                                            value={appSubtitle} 
                                            onChange={e => setAppSubtitle(e.target.value)}
                                            className="mt-2 w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-700"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Logo Aplikasi</label>
                                    <div className="mt-3 flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group">
                                        <div className="relative">
                                            <div className="w-20 h-20 bg-emerald-500 rounded-2xl overflow-hidden flex items-center justify-center p-0 shadow-xl border-4 border-white">
                                                {appLogoUrl ? <img src={appLogoUrl} className="w-full h-full object-cover" alt="Logo Preview" /> : <div className="text-white text-xs font-bold">LOGO</div>}
                                            </div>
                                            <button 
                                                onClick={() => logoInputRef.current?.click()}
                                                className="absolute -bottom-2 -right-2 p-2 bg-emerald-500 text-white rounded-xl shadow-lg hover:bg-emerald-600 transition-all scale-90 group-hover:scale-100"
                                            >
                                                <CameraIcon className="w-4 h-4" />
                                            </button>
                                            <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
                                        </div>
                                        <div className="flex-grow">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Upload Logo Baru</p>
                                            <p className="text-[10px] text-slate-400 font-medium">Klik ikon kamera untuk mengunggah logo (PNG/JPG). Ukuran disarankan kotak 1:1.</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={handleSaveBranding}
                                    disabled={isSavingBranding || isCompressing}
                                    className="px-10 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    {isSavingBranding ? 'Menyimpan...' : 'Terapkan Branding Baru'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {currentUser?.role === Role.Admin && (
                    <div className="space-y-8">
                        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-full">
                            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <span className="p-2 bg-yellow-50 rounded-lg"><GoogleIcon className="w-5 h-5" /></span>
                                Google Sheets
                            </h2>
                            <p className="text-slate-500 text-xs mb-6 ml-11 leading-relaxed">
                                Backup data ke Google Sheets untuk kemudahan analisis offline dan laporan Spreadsheet.
                            </p>
 
                             <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                                 {profile ? (
                                     <div className="space-y-6">
                                         <div className="flex items-center gap-3">
                                             <img src={profile.picture} alt="profile" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                                             <div className="overflow-hidden">
                                                 <p className="font-bold text-slate-700 text-sm truncate">{profile.name}</p>
                                                 <p className="text-[10px] text-slate-400 truncate font-bold">{profile.email}</p>
                                             </div>
                                         </div>
                                         
                                         <div className="space-y-3">
                                             <button
                                                 onClick={handleSync}
                                                 disabled={isSyncing}
                                                 className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all font-bold text-sm disabled:opacity-50 shadow-md"
                                             >
                                                 {isSyncing ? 'Menyinkronkan...' : 'Backup Sekarang'}
                                             </button>
                                             <button
                                                 onClick={handleDisconnect}
                                                 className="w-full py-2.5 text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                                             >
                                                 Putuskan Koneksi
                                             </button>
                                         </div>
                                     </div>
                                 ) : (
                                     <div className="text-center py-4">
                                         <button
                                             onClick={() => login()}
                                             className="inline-flex items-center gap-3 px-5 py-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all w-full justify-center"
                                         >
                                             <GoogleIcon />
                                             <span className="font-bold text-slate-700 text-sm">Hubungkan Google</span>
                                         </button>
                                     </div>
                                 )}
 
                                 {syncMessage && (
                                     <div className={`mt-4 p-4 rounded-xl text-[10px] font-bold border ${syncMessage.includes('Gagal') ? 'text-red-600 bg-red-50 border-red-100' : 'text-emerald-700 bg-emerald-50 border-emerald-100'}`}>
                                         {syncMessage.startsWith('Sinkronisasi berhasil!') ? (
                                             <div className="flex flex-col gap-2">
                                                 <span>✅ {syncMessage.split('Lihat di: ')[0]}</span>
                                                 <a href={syncMessage.split('Lihat di: ')[1]} target="_blank" rel="noopener noreferrer" className="inline-block px-3 py-2 bg-emerald-600 text-white rounded-lg text-center hover:bg-emerald-700">Buka Spreadsheet</a>
                                             </div>
                                         ) : syncMessage}
                                     </div>
                                 )}
                             </div>
                         </div>
                     </div>
                 )}
             </div>
         </div>
     );
 };
 
 export default SettingsPage;