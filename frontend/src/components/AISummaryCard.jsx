import React from 'react';
import { Sparkles, Bot, Info } from 'lucide-react';

const AISummaryCard = ({ resumenIA }) => {
  return (
    <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl mb-8 relative">
      <div className="absolute top-0 right-0 bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
        <Bot className="w-3 h-3" />
        <span>Síntesis Automática</span>
      </div>
      
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-bold text-slate-900">Resumen del Perfil</h2>
      </div>
      
      <div className="prose prose-slate max-w-none">
        <p className="text-slate-700 leading-relaxed whitespace-pre-line text-base">
          {resumenIA || 'Actualmente no hay un resumen generado por Inteligencia Artificial para este candidato.'}
        </p>
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-200 flex items-start gap-2">
        <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500">
          Este resumen es generado automáticamente y puede tener variaciones. Revisa las pestañas inferiores para ver los datos detallados.
        </p>
      </div>
    </div>
  );
};

export default AISummaryCard;
