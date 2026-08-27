const mongoose = require('mongoose');

const preferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    categories: {
      type: Map,
      of: Number,
      default: {},
    },

    tags: {
      type: Map,
      of: Number,
      default: {},
    },

    totalInteractions: {
      type: Number,
      default: 0,
    },

    lastBehaviorAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.model(
    'UserPreference',
    preferenceSchema
  );