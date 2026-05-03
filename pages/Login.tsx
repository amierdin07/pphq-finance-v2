import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { Logo, EyeIcon, EyeSlashIcon } from '../constants';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, settings } = useAppContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const success = await login(email, password);
    if (success) {
      navigate('/');
    } else {
      setError('Email atau kata sandi salah, atau akun tidak aktif.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-50 rounded-full blur-3xl opacity-50" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50" />
      
      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl shadow-2xl rounded-[3rem] p-10 space-y-8 border border-white relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="flex flex-col items-center">
          <div className="relative group">
            {settings.appLogoUrl ? (
                <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl flex items-center justify-center p-4 border border-slate-100 group-hover:scale-105 transition-transform duration-500">
                    <img src={settings.appLogoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
            ) : (
                <div className="p-5 bg-emerald-500 rounded-[2rem] shadow-xl group-hover:rotate-12 transition-transform duration-500">
                    <Logo className="w-10 h-10 text-white" />
                </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white shadow-sm" />
          </div>
          
          <div className="mt-8 text-center">
            <h2 className="text-3xl font-black text-emerald-600 tracking-tight">
              {settings.appName || 'PPHQ Finance'}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-400 max-w-[240px] mx-auto uppercase tracking-widest leading-relaxed">
              {settings.appSubtitle || 'Manajemen Keuangan Unit Terpadu'}
            </p>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              User
            </label>
            <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-700"
                placeholder="user@pphq.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Kata Sandi
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-700 pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 hover:text-emerald-500 transition-colors"
              >
                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
            <div className="flex justify-end pr-1">
                <a href="https://wa.me/6281553854670" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors">Lupa password? Hubungi Admin</a>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 animate-in slide-in-from-top-2 duration-300">
                <p className="text-xs text-red-600 font-bold text-center leading-relaxed">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 hover:translate-y-[-2px] active:translate-y-[0px] transition-all disabled:opacity-50 disabled:translate-y-0"
          >
            {isLoading ? (
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Masuk...</span>
                </div>
            ) : 'Masuk ke Aplikasi'}
          </button>
        </form>

        <div className="text-center">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">PPHQ Finance v2.0 • 2026</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
