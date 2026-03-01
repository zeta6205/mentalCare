// models/User.js
const mongoose = require('mongoose');

// 🧩 Schema de cartões (para os posts e anotações do usuário)
const cardSchema = new mongoose.Schema({
  text: { type: String, required: true },
  color: { type: String, default: '#FFFFFF' },
});

// 🧠 Schema principal do usuário
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'O nome é obrigatório.'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'O e-mail é obrigatório.'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'A senha é obrigatória.'],
      minlength: [6, 'A senha deve ter no mínimo 6 caracteres.'],
    },
    avatar: {
      type: String,
      default: '',
    },
    banner: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
    },
    cards: [cardSchema],
  },
  {
    timestamps: true, // adiciona createdAt e updatedAt automaticamente
  }
);

// 🔒 Remove o campo de senha ao converter o usuário em JSON
userSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.password;
    return ret;
  },
});

// ✅ Exporta o modelo
module.exports = mongoose.model('User', userSchema);
