import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import ProfileHeader from '../components/ProfileHeader';
import AISummaryCard from '../components/AISummaryCard';
import DataTabs from '../components/DataTabs';

const fetchCandidate = async (id) => {
  const res = await fetch(`/api/candidatos/${id}`);
  if (!res.ok) {
    throw new Error('Candidato no encontrado');
  }
  return res.json();
};

const CandidateProfile = () => {
  const { id } = useParams();

  const { data: candidato, isLoading, isError } = useQuery({
    queryKey: ['candidato', id],
    queryFn: () => fetchCandidate(id),
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        <p className="mt-4 text-slate-500 font-medium">Cargando perfil público...</p>
      </div>
    );
  }

  if (isError || !candidato) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-16 w-16 text-slate-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Candidato no encontrado</h2>
        <p className="text-slate-600 mb-6">No pudimos localizar la información pública de este registro.</p>
        <Link to="/" className="text-blue-700 font-medium hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Volver al buscador
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Navegación superior */}
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a búsqueda</span>
          </Link>
        </div>

        {/* Cabecera del Perfil */}
        <ProfileHeader candidato={candidato} />

        {/* Resumen IA */}
        <AISummaryCard resumenIA={candidato.resumenIA} />

        {/* Pestañas de Datos Duros */}
        <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
          <DataTabs candidatoData={candidato} />
        </div>
        
      </div>
    </div>
  );
};

export default CandidateProfile;
