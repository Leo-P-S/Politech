const mongoose = require('mongoose');

const analisisIASchema = new mongoose.Schema({
    resumen_noticia: String,
    categoria: String,
    sentimiento: String,
    sesgo_politico: String,
    entidades_clave: [String]
}, { _id: false });

const noticiaSchema = new mongoose.Schema({
    titular: { type: String, required: true },
    fecha: String,
    medio_prensa: String,
    enlace_origen: { type: String, required: true },
    contenido_crudo: String,
    procesado_por_ia: { type: Boolean, default: false },
    analisis_ia: analisisIASchema
});

// Definimos la estructura del "Perfil Exprés"
const candidatoSchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        required: true,
        trim: true,
        unique: true
    },
    partidoPolitico: { 
        type: String, 
        default: 'Desconocido'
    },
    propuestas: [{ 
        type: String 
    }],
    antecedentesJudiciales: [{ 
        type: String 
    }],
    historial_noticias: [noticiaSchema],
    equipoTrabajo: [{
        nombre: String,
        cargo: String
    }],
    resumenIA: { 
        type: String 
    }
}, {
    // Esto crea automáticamente los campos 'createdAt' y 'updatedAt'
    timestamps: true 
});

module.exports = mongoose.model('Candidato', candidatoSchema);