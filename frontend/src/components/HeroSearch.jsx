import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Users, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HeroSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const loadCandidates = async () => {
    setIsOpen(true);
    setMessage('');
    if (candidates.length > 0) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/candidatos/available');
      if (!response.ok) throw new Error('No se pudo cargar la lista');
      setCandidates(await response.json());
    } catch (error) {
      console.error("Error cargando candidatos:", error);
      setMessage('No se pudo cargar la lista de candidatos. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const normalizedTerm = searchTerm.trim().toLocaleLowerCase('es');
  const suggestions = candidates.filter(candidato =>
    candidato.nombre.toLocaleLowerCase('es').includes(normalizedTerm) ||
    candidato.partidoPolitico?.toLocaleLowerCase('es').includes(normalizedTerm)
  );

  const handleSelectCandidate = async (candidato) => {
    setSearchTerm(candidato.nombre);
    setIsOpen(false);
    setMessage('');

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

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    const exactMatch = candidates.find(candidato =>
      candidato.nombre.toLocaleLowerCase('es') === normalizedTerm
    );
    if (exactMatch) {
      handleSelectCandidate(exactMatch);
    } else {
      setIsOpen(true);
      setMessage('Selecciona uno de los candidatos registrados en la lista.');
    }
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
          onFocus={loadCandidates}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setMessage('');
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="candidate-options"
          autoComplete="off"
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-left">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
            <Users className="h-4 w-4" />
            <span>{searchTerm ? 'Candidatos coincidentes' : `${candidates.length} candidatos disponibles`}</span>
          </div>
          {!isLoading && suggestions.length > 0 && (
            <ul id="candidate-options" role="listbox" className="max-h-72 overflow-y-auto">
              {suggestions.map((candidato) => (
            <li 
              key={candidato._id}
              role="option"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelectCandidate(candidato)}
              className="px-4 py-3 cursor-pointer hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-0 transition-colors"
            >
              <span className="font-medium text-slate-900">{candidato.nombre}</span>
              <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{candidato.partidoPolitico}</span>
            </li>
              ))}
            </ul>
          )}
          {!isLoading && suggestions.length === 0 && !message && (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-slate-500">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span>No existe un candidato registrado con ese nombre o partido.</span>
            </div>
          )}
          {message && (
            <div className="flex items-center gap-2 px-4 py-4 text-sm font-medium text-amber-700 bg-amber-50">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HeroSearch;
