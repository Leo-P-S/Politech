import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HeroSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user, role } = useAuth();

  useEffect(() => {
    if (searchTerm.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/candidatos/search?q=${searchTerm}`);
        const data = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error("Error buscando candidatos:", error);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSelectCandidate = async (candidato) => {

    // Registrar la búsqueda si es elector y está logueado (UH09)
    if (user && role === 'elector') {
      try {
        await fetch('/api/elector/searches', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ query: candidato.nombre })
        });
      } catch (error) {
        console.error("Error registrando búsqueda reciente:", error);
      }
    }

    navigate(`/candidato/${candidato._id}`);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Busca un candidato por nombre o partido..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((candidato) => (
            <li 
              key={candidato._id}
              onClick={() => handleSelectCandidate(candidato)}
              className="px-4 py-3 cursor-pointer hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-0 transition-colors"
            >
              <span className="font-medium text-slate-900">{candidato.nombre}</span>
              <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{candidato.partidoPolitico}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HeroSearch;
