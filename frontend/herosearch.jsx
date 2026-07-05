import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const HeroSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Debounce: Espera a que el usuario deje de escribir por 500ms
  useEffect(() => {
    // Si el texto es muy corto, limpiar sugerencias y no hacer petición
    if (searchTerm.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/candidatos/search?q=${searchTerm}`);
        const data = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error("Error buscando candidatos:", error);
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500 milisegundos de retraso

    // Cleanup function: cancela el timeout si el usuario sigue escribiendo
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Redirigir al perfil del candidato al hacer clic en una sugerencia
  const handleSelectCandidate = (candidatoId) => {
    navigate(`/candidato/${candidatoId}`);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <input
        type="text"
        placeholder="Busca un candidato (Ej. 'Perez' o 'Peres')..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-4 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
      />
      
      {/* Indicador de carga */}
      {isLoading && <p className="absolute mt-2 text-gray-500">Buscando...</p>}

      {/* Lista de sugerencias desplegable */}
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
          {suggestions.map((candidato) => (
            <li 
              key={candidato._id}
              onClick={() => handleSelectCandidate(candidato._id)}
              className="p-3 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
            >
              <span>{candidato.nombreCompleto}</span>
              <span className="text-sm text-gray-400">{candidato.partido}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HeroSearch;
