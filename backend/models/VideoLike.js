const mongoose = require('mongoose');

const videoLikeSchema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'User',

        required: true,

        index: true
      },

      videoId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'Video',

        required: true,

        index: true
      },

      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  );


// ============================================================
// 🔒 UM LIKE POR USUÁRIO / VÍDEO
// ============================================================

videoLikeSchema.index(
  {
    userId: 1,
    videoId: 1
  },
  {
    unique: true
  }
);


module.exports =
  mongoose.model(
    'VideoLike',
    videoLikeSchema
  );