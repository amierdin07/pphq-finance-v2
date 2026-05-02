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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card shadow-lg rounded-xl p-8 space-y-6 border border-border">
        <div className="flex flex-col items-center">
          {settings.appLogoUrl ? (
            <img src={settings.appLogoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-lg" />
          ) : (
            <Logo />
          )}
          <h2 className="mt-4 text-center text-2xl font-bold text-text-primary">
            Selamat Datang di {settings.appName || 'PPHQ Finance'}
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            {settings.appSubtitle || 'Masuk untuk melanjutkan ke dasbor Anda'}
          </p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-text-primary">
              Alamat Email
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm"
                placeholder="admin@pphq.com"
              />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-text-primary">
              Kata Sandi
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-500" />
                ) : (
                    <EyeIcon className="h-5 w-5 text-gray-500" />
                )}
              </button>
            </div>
            <div className="flex justify-end mt-2">
                <a href="https://wa.me/6281553854670" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-600 hover:underline">Lupa password? Hubungi Admin Pusat</a>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:bg-primary/50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Memproses...' : 'Masuk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
