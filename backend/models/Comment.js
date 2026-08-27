const mongoose = require('mongoose');

const commentSchema =
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

      text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
      },

      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  );


commentSchema.index({
  videoId: 1,
  createdAt: 1
});


module.exports =
  mongoose.model(
    'Comment',
    commentSchema
  );
