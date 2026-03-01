const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.params.userId;
    const dir = path.join(__dirname, '../uploads', userId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const type = req.params.type;
    // Usar o tipo (avatar/banner) como nome do arquivo
    cb(null, `${type}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

// Rota de upload para avatar e banner
router.post('/:userId/:type', upload.single('file'), async (req, res) => {
  try {
    console.log('[REQ] POST /uploads/:userId/:type', req.params);
    
    if (!req.file) {
      console.warn('⚠️ Nenhum arquivo enviado');
      return res.status(400).json({ error: 'Arquivo não enviado' });
    }

    const { userId, type } = req.params;
    if (!['avatar', 'banner'].includes(type)) {
      console.warn(`⚠️ Tipo inválido: ${type}`);
      return res.status(400).json({ error: 'Tipo de upload inválido' });
    }

    const url = `${req.protocol}://${req.get('host')}/uploads/${userId}/${req.file.filename}`;
    console.log(`✅ Arquivo salvo em: ${url}`);

    // Atualiza o usuário no banco
    const updateData = {};
    updateData[type] = url;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!user) {
      console.warn(`⚠️ Usuário não encontrado: ${userId}`);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    console.log(`✅ ${type} atualizado para usuário: ${userId}`);
    res.json({ url });

  } catch (error) {
    console.error('❌ Erro no upload:', error);
    res.status(500).json({ error: 'Erro ao processar upload' });
  }
});

module.exports = router;
