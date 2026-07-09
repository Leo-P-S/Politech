const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const electorSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    recentSearches: [{ 
        type: String 
    }], // UH09: Historial de búsquedas recientes
    alertSubscriptions: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Candidato' 
    }] // UH21, UH22: Candidatos suscritos para alertas
}, { 
    timestamps: true 
});

// Encriptar contraseña antes de guardar al elector
electorSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Método para verificar la contraseña
electorSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Elector', electorSchema);
