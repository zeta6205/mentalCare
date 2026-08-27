const express = require('express');
const router = express.Router();

//  IA MOCK (depois vira IA real)
router.post('/analyze-video', async (req, res) => {
  try {
    const { uri, description } = req.body;

    //  Simulação de IA
    let category = 'general';
    let emotion = 'neutral';

    if (description?.toLowerCase().includes('calma')) {
      category = 'mental_health';
      emotion = 'calm';
    }

    if (description?.toLowerCase().includes('feliz')) {
      emotion = 'happy';
    }

    res.json({
      category,
      emotion,
      tags: [category, emotion],
    });

  } catch (err) {
    res.status(500).json({ error: 'Erro IA' });
  }
});

module.exports = router;