import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck, User, Lock, AlertCircle, Loader2 } from 'lucide-react';

const Login = () => {
  const [role, setRole] = useState('elector'); // elector o admin
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: async ({ username, password, role }) => {
      const endpoint = role === 'admin' ? '/api/auth/admin/login' : '/api/auth/elector/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Credenciales incorrectas');
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Guardar token y rol en localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);
      
      if (data.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    },
    onError: (err) => {
      setErrorMsg(err.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    loginMutation.mutate({ username, password, role });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-blue-50 p-3 rounded-full text-blue-700">
              <ShieldCheck className="h-8 w-8" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Iniciar Sesión</h2>
          <p className="text-sm text-slate-500">Accede a tu cuenta de Politech</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => { setRole('elector'); setErrorMsg(''); }}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              role === 'elector' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Elector
          </button>
          <button
            type="button"
            onClick={() => { setRole('admin'); setErrorMsg(''); }}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              role === 'admin' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Administrador
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm font-medium text-red-700">{errorMsg}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Usuario</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <User className="h-4 w-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="nombre_usuario"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Contraseña</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-sm flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Validando acceso...</span>
              </>
            ) : (
              <span>Ingresar</span>
            )}
          </button>
        </form>

        {/* Footer/Links */}
        {role === 'elector' && (
          <div className="text-center text-sm text-slate-500">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-blue-700 font-semibold hover:underline">
              Regístrate aquí
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
