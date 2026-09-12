import { useState } from 'react';
import { useStore } from '../../store/StoreContext';
import { BookOpen, User, Lock, AlertCircle, Loader2 } from 'lucide-react';

export function LoginPage() {
  const { login } = useStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(identifier, password);
      if (!result) {
        setError('بيانات الدخول غير صحيحة. تأكد من البريد/الهاتف وكلمة المرور.');
      }
    } catch {
      setError('حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
            <BookOpen size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">أكاديمية ربانيون</h1>
          <p className="text-slate-400 text-sm mt-1">نظام الإدارة المتكامل</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 animate-scale-in">
          <h2 className="text-xl font-bold text-slate-800 mb-1">تسجيل الدخول</h2>
          <p className="text-slate-500 text-sm mb-6">أدخل بياناتك للوصول إلى لوحة التحكم</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                البريد الإلكتروني أو رقم الهاتف
              </label>
              <div className="relative">
                <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@rabanyoon.edu أو 01012345678"
                  className="input-field pr-10"
                  dir="ltr"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-10"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-rose-50 text-rose-700 p-3 rounded-xl text-sm animate-fade-in">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !identifier || !password}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                'دخول'
              )}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
