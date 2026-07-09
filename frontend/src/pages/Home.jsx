import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import HeroSearch from '../components/HeroSearch';
import { ShieldCheck, LogOut, User, Bell, Clock, LogIn } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    const storedRole = localStorage.getItem('role');
    if (token) {
      setIsLoggedIn(true);
      setUsername(storedUsername || '');
      setRole(storedRole || '');
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setUsername('');
    setRole('');
    queryClient.invalidateQueries(['recent-searches']);
    navigate('/');
  };

  // Obtener búsquedas recientes si es elector y está logueado
  const { data: recentSearches } = useQuery({
    queryKey: ['recent-searches'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/elector/searches', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar búsquedas recientes');
      return res.json();
    },
    enabled: isLoggedIn && role === 'elector'
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Header/Navbar */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-4 flex justify-between items-center border-b border-slate-200">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-blue-700" />
          <span className="font-bold text-slate-900">Politech</span>
        </div>
        
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 flex items-center gap-1.5 font-medium">
                <User className="h-4 w-4" /> Hola, {username}
              </span>
              
              {role === 'admin' ? (
                <Link to="/admin/dashboard" className="text-sm font-semibold text-blue-700 hover:underline">
                  Dashboard Admin
                </Link>
              ) : (
                <Link to="/candidato/alertas" className="text-sm font-semibold text-blue-700 hover:underline flex items-center gap-1">
                  <Bell className="h-4 w-4" /> Mis Alertas
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="text-sm font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1"
              >
                <LogOut className="h-4 w-4" /> Salir
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1">
                <LogIn className="h-4 w-4" /> Iniciar Sesión
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-3xl w-full text-center space-y-8">
          <div className="flex justify-center mb-2">
            <div className="bg-blue-100 p-4 rounded-full">
              <ShieldCheck className="h-12 w-12 text-blue-700" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Politech <span className="text-blue-700">Perfil Exprés</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Accede de forma rápida y transparente a la información pública de los candidatos. Planes de gobierno, antecedentes y noticias verificadas en un solo lugar.
          </p>

          <div className="pt-4 w-full">
            <HeroSearch />
          </div>

          {/* Historial de búsquedas recientes */}
          {isLoggedIn && role === 'elector' && recentSearches && recentSearches.length > 0 && (
            <div className="max-w-2xl mx-auto pt-4 space-y-2 text-left bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>Búsquedas Recientes</span>
              </h3>
              <div className="flex flex-wrap gap-2 pt-1">
                {recentSearches.map((term, index) => (
                  <span
                    key={index}
                    className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/candidatos/search?q=${term}`);
                        const data = await response.json();
                        if (data && data.length > 0) {
                          const matched = data.find(c => c.nombre.toLowerCase() === term.toLowerCase()) || data[0];
                          navigate(`/candidato/${matched._id}`);
                        }
                      } catch (error) {
                        console.error("Error al navegar a búsqueda reciente:", error);
                      }
                    }}
                  >
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-12 text-sm text-slate-500">
            <p>Información procesada de fuentes oficiales. Promoviendo el voto informado.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
