const mongoose = require("mongoose")

const videoSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    uri: String,

    title: String,
    description: String,
    tags: [String],
    duration: Number,

    category: String,
    stimulusLevel: Number,

    emotion: String, // você já usa no controller

    createdAt: {
        type: Date,
        default: Date.now
    }

})

module.exports = mongoose.model("Video", videoSchema)