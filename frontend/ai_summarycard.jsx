import React from 'react';

const AISummaryCard = ({ resumen }) => {
  return (
    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-blue-100 p-6 rounded-lg shadow-sm mb-6 relative">
      <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg flex items-center">
        <span>✨ Resumen por IA</span>
      </div>
      
      <h2 className="text-xl font-bold text-blue-900 mb-3">Síntesis del Candidato</h2>
      <p className="text-gray-700 leading-relaxed whitespace-pre-line">
        {resumen}
      </p>
      <p className="text-xs text-gray-400 mt-4 text-right">
        *Este resumen es generado automáticamente y puede tener variaciones. Revisa las pestañas inferiores para ver las fuentes oficiales.
      </p>
    </div>
  );
};

export default AISummaryCard;
