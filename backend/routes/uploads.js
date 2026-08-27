const express = require('express');
const router = express.Router();

const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const User = require('../models/User');

// ==================================================
// CONFIGURAÇÕES
// ==================================================

const FFMPEG_PATH = require('ffmpeg-static');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

// ==================================================
// MULTER
// ==================================================

const storage = multer.diskStorage({

  destination: (req, file, cb) => {

    const userId = req.params.userId;

    const dir = path.join(
      UPLOADS_DIR,
      userId
    );

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {
        recursive: true
      });
    }

    cb(null, dir);
  },

  filename: (req, file, cb) => {

    const type = req.params.type;

    // 🎥 Vídeo
    if (type === 'video') {

      const extension =
        path.extname(file.originalname) || '.mp4';

      return cb(
        null,
        `${Date.now()}_original${extension}`
      );
    }

    // 🖼 Avatar / Banner
    cb(
      null,
      `${type}${path.extname(file.originalname)}`
    );
  }

});

const upload = multer({
  storage
});

// ==================================================
// PROCESSAR VÍDEO COM FFMPEG
// ==================================================

function compressVideo(inputPath, outputPath) {

  return new Promise((resolve, reject) => {

    console.log('');
    console.log('🎬 ========================================');
    console.log('🎬 INICIANDO COMPRESSÃO DO VÍDEO');
    console.log('🎬 ========================================');
    console.log('📥 Entrada:', inputPath);
    console.log('📤 Saída:', outputPath);
    console.log('🧠 FFmpeg:', FFMPEG_PATH);

    const args = [

      // arquivo de entrada
      '-i',
      inputPath,

      // vídeo H.264
      '-c:v',
      'libx264',

      // qualidade
      '-crf',
      '28',

      // preset equilibrado
      '-preset',
      'veryfast',

      // limita resolução para 720p
      '-vf',
      'scale=w=720:h=-2',

      // máximo 30 FPS
      '-r',
      '30',

      // áudio AAC
      '-c:a',
      'aac',

      '-b:a',
      '128k',

      // melhora início da reprodução
      '-movflags',
      '+faststart',

      // evita metadata desnecessária
      '-map_metadata',
      '-1',

      // saída
      outputPath
    ];

    const ffmpeg = spawn(
      FFMPEG_PATH,
      args,
      {
        windowsHide: true
      }
    );

    let stderr = '';

    ffmpeg.stderr.on(
      'data',
      data => {

        const text = data.toString();

        stderr += text;

        // Mostra progresso do FFmpeg
        if (
          text.includes('frame=') ||
          text.includes('time=')
        ) {

          process.stdout.write(
            `\r🎬 ${text.trim()}`
          );
        }

      }
    );

    ffmpeg.on(
      'error',
      error => {

        console.error('');
        console.error(
          '❌ Erro ao iniciar FFmpeg:',
          error
        );

        reject(error);
      }
    );

    ffmpeg.on(
      'close',
      code => {

        console.log('');

        if (code !== 0) {

          console.error(
            '❌ FFmpeg terminou com erro:',
            code
          );

          console.error(stderr);

          return reject(
            new Error(
              `FFmpeg terminou com código ${code}`
            )
          );
        }

        console.log(
          '✅ Vídeo comprimido com sucesso!'
        );

        resolve();
      }
    );

  });

}

// ==================================================
// ROTA DE UPLOAD
// ==================================================

router.post(
  '/:userId/:type',
  upload.single('file'),
  async (req, res) => {

    try {

      console.log('');
      console.log(
        '📤 [UPLOAD]',
        req.params
      );

      // ==================================================
      // VALIDAÇÃO
      // ==================================================

      if (!req.file) {

        console.warn(
          '⚠️ Nenhum arquivo enviado'
        );

        return res.status(400).json({
          success: false,
          error: 'Arquivo não enviado'
        });
      }

      const {
        userId,
        type
      } = req.params;

      // ==================================================
      // TIPOS PERMITIDOS
      // ==================================================

      if (
        ![
          'avatar',
          'banner',
          'video'
        ].includes(type)
      ) {

        console.warn(
          `⚠️ Tipo inválido: ${type}`
        );

        // remove arquivo enviado
        try {
          fs.unlinkSync(req.file.path);
        } catch {}

        return res.status(400).json({
          success: false,
          error: 'Tipo de upload inválido'
        });
      }

      // ==================================================
      // CAMINHO DO ARQUIVO
      // ==================================================

      const originalPath =
        req.file.path;

      // ==================================================
      // 🎥 VÍDEO
      // ==================================================

      if (type === 'video') {

        console.log(
          '🎥 Vídeo recebido'
        );

        console.log(
          '📦 Arquivo original:',
          req.file.filename
        );

        // tamanho original
        const originalSize =
          fs.statSync(originalPath).size;

        console.log(
          `📦 Tamanho original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`
        );

        // nome final
        const finalFilename =
          `${Date.now()}_optimized.mp4`;

        const outputPath =
          path.join(
            path.dirname(originalPath),
            finalFilename
          );

        // ==================================================
        // COMPRESSÃO
        // ==================================================

        await compressVideo(
          originalPath,
          outputPath
        );

        // ==================================================
        // VERIFICAR SAÍDA
        // ==================================================

        if (
          !fs.existsSync(outputPath)
        ) {

          throw new Error(
            'FFmpeg não criou o arquivo final'
          );
        }

        const optimizedSize =
          fs.statSync(outputPath).size;

        console.log(
          `📦 Tamanho otimizado: ${(optimizedSize / 1024 / 1024).toFixed(2)} MB`
        );

        const reduction =
          (
            1 -
            optimizedSize / originalSize
          ) * 100;

        console.log(
          `📉 Redução: ${reduction.toFixed(2)}%`
        );

        // ==================================================
        // APAGAR ORIGINAL
        // ==================================================

        try {

          fs.unlinkSync(
            originalPath
          );

          console.log(
            '🗑️ Arquivo original removido'
          );

        } catch (error) {

          console.warn(
            '⚠️ Não foi possível remover original:',
            error.message
          );

        }

        // ==================================================
        // URL FINAL
        // ==================================================

        const url =
          `${req.protocol}://${req.get('host')}/uploads/${userId}/${finalFilename}`;

        console.log(
          '🌐 URL final:',
          url
        );

        console.log(
          '🎉 UPLOAD DE VÍDEO FINALIZADO'
        );

        // ==================================================
        // RESPOSTA
        // ==================================================

        return res.json({

          success: true,

          url,

          type: 'video',

          originalSize,

          optimizedSize,

          reduction: Number(
            reduction.toFixed(2)
          )

        });

      }

      // ==================================================
      // 🖼 AVATAR / BANNER
      // ==================================================

      const extension =
        path.extname(
          req.file.originalname
        );

      const finalFilename =
        `${type}${extension}`;

      const finalPath =
        path.join(
          path.dirname(originalPath),
          finalFilename
        );

      // Se o nome já não for o mesmo
      if (
        originalPath !== finalPath
      ) {

        // remove arquivo anterior
        if (
          fs.existsSync(finalPath)
        ) {

          try {
            fs.unlinkSync(finalPath);
          } catch {}
        }

        fs.renameSync(
          originalPath,
          finalPath
        );
      }

      // ==================================================
      // URL
      // ==================================================

      const url =
        `${req.protocol}://${req.get('host')}/uploads/${userId}/${finalFilename}`;

      console.log(
        `🖼 ${type} recebido:`,
        url
      );

      // ==================================================
      // ATUALIZAR USUÁRIO
      // ==================================================

      const updateData = {};

      updateData[type] = url;

      const user =
        await User.findByIdAndUpdate(
          userId,
          {
            $set: updateData
          },
          {
            new: true
          }
        ).select('-password');

      if (!user) {

        console.warn(
          `⚠️ Usuário não encontrado: ${userId}`
        );

        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
      }

      console.log(
        `✅ ${type} atualizado para usuário: ${userId}`
      );

      return res.json({

        success: true,

        url,

        type

      });

    } catch (error) {

      console.error('');
      console.error(
        '❌ ========================================'
      );
      console.error(
        '❌ ERRO NO UPLOAD'
      );
      console.error(
        '❌ ========================================'
      );
      console.error(error);

      // tenta remover arquivo temporário
      if (
        req.file &&
        req.file.path &&
        fs.existsSync(req.file.path)
      ) {

        try {
          fs.unlinkSync(req.file.path);
        } catch {}
      }

      return res.status(500).json({

        success: false,

        error:
          'Erro ao processar upload',

        message:
          error.message

      });

    }

  }
);

module.exports = router;