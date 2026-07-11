import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Directory = () => {
  const [candidatos, setCandidatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroPartido, setFiltroPartido] = useState('Todos');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/candidatos/available')
      .then(res => res.json())
      .then(data => {
        setCandidatos(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error cargando directorio:', err);
        setLoading(false);
      });
  }, []);

  const partidos = ['Todos', ...new Set(candidatos.map(c => c.partidoPolitico))].filter(Boolean);

  const candidatosFiltrados = filtroPartido === 'Todos' 
    ? candidatos 
    : candidatos.filter(c => c.partidoPolitico === filtroPartido);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Directorio Electoral 2026</h1>
            <p className="text-slate-500 mt-1">Explora a todos los candidatos y filtra por agrupación política.</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            ← Volver al Inicio
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Sidebar de Filtros */}
            <aside className="w-full md:w-64 shrink-0 space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Filtrar por Partido</h3>
                <div className="flex flex-col gap-2">
                  {partidos.map(partido => (
                    <label key={partido} className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="partido" 
                        value={partido}
                        checked={filtroPartido === partido}
                        onChange={(e) => setFiltroPartido(e.target.value)}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-600"
                      />
                      <span className={`text-sm transition-colors ${filtroPartido === partido ? 'text-blue-700 font-semibold' : 'text-slate-600 group-hover:text-slate-900'}`}>
                        {partido}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </aside>

            {/* Grid de Resultados */}
            <main className="flex-1 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {candidatosFiltrados.map(candidato => (
                  <div 
                    key={candidato._id}
                    onClick={() => navigate(`/candidato/${candidato._id}`)}
                    className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg mb-4 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      {candidato.nombre.charAt(0)}
                    </div>
                    <h2 className="font-bold text-slate-900 text-lg group-hover:text-blue-700 transition-colors">{candidato.nombre}</h2>
                    <p className="text-sm text-slate-500 mt-1">{candidato.partidoPolitico}</p>
                  </div>
                ))}
                
                {candidatosFiltrados.length === 0 && (
                  <div className="col-span-full p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
                    No se encontraron candidatos para este filtro.
                  </div>
                )}
              </div>
            </main>
          </div>
        )}
      </div>
    </div>
  );
};

export default Directory;
