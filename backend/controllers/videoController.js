const Video = require("../models/Video")
const classifyContent = require("../AI/contentClassifier")

module.exports = {

    uploadVideo: async (req, res) => {
        try {
            const videoData = req.body

            // Classificação automática (IA)
            const classification = classifyContent(videoData)

            const newVideo = new Video({
                ...videoData,
                category: classification.category,
                stimulusLevel: classification.stimulusLevel
            })

            await newVideo.save()

            res.json(newVideo)

        } catch (error) {
            res.status(500).json({ error: "Erro ao enviar vídeo" })
        }
    },

    getVideos: async (req, res) => {
        try {
            const videos = await Video.find().sort({ createdAt: -1 })
            res.json(videos)
        } catch (error) {
            res.status(500).json({ error: "Erro ao buscar vídeos" })
        }
    }

}