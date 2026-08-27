const mongoose = require('mongoose');

const behaviorSchema = new mongoose.Schema({

  // 👤 usuário
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 🎥 vídeo assistido
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },

  // ⏱ tempo assistido (segundos)
  watchTime: {
    type: Number,
    default: 0
  },

  // 🎬 duração total do vídeo
  duration: {
    type: Number,
    default: 0
  },

  // 📊 retenção
  completionRate: {
    type: Number,
    default: 0
  },

  // 🧠 nível de estímulo do conteúdo
  stimulusLevel: {
    type: Number,
    default: 0.5
  },

  // 🎯 categoria do vídeo
  category: {
    type: String,
    default: 'general'
  },

  // 🏷 tags do vídeo
  tags: {
    type: [String],
    default: []
  },

  // 📱 interação
  liked: {
    type: Boolean,
    default: false
  },

  commented: {
    type: Boolean,
    default: false
  },

  shared: {
    type: Boolean,
    default: false
  },

  // 🔥 sessão contínua
  sessionId: {
    type: String,
    default: null
  },

  // 🧠 timestamp
  createdAt: {
    type: Date,
    default: Date.now
  }

});

// 🚀 índices (performance futura)
behaviorSchema.index({ userId: 1 });
behaviorSchema.index({ createdAt: -1 });
behaviorSchema.index({ stimulusLevel: 1 });

module.exports = mongoose.model('UserBehavior', behaviorSchema);

