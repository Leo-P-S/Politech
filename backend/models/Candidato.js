const mongoose = require('mongoose');

// Definimos la estructura del "Perfil Exprés"
const candidatoSchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        required: true,
        trim: true 
    },
    partidoPolitico: { 
        type: String, 
        required: true 
    },
    propuestas: [{ 
        type: String 
    }],
    antecedentesJudiciales: [{ 
        type: String 
    }],
    noticias: [{ 
        titular: String,
        fuente: String,
        url: String
    }],
    resumenIA: { 
        type: String 
    }
}, {
    // Esto crea automáticamente los campos 'createdAt' y 'updatedAt'
    timestamps: true 
});

module.exports = mongoose.model('Candidato', candidatoSchema);