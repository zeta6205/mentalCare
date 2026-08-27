const express =
  require('express');

const router =
  express.Router();

const Video =
  require('../models/Video');

const VideoLike =
  require('../models/VideoLike');

const fusionClassifier =
  require('../AI/fusionClassifier');

const path =
  require('path');

const fs =
  require('fs');


function getLocalUploadPath(
  publicUrl
) {

  const parsedUrl =
    new URL(publicUrl);

  const pathname =
    decodeURIComponent(
      parsedUrl.pathname
    );

  const uploadsPrefix =
    '/uploads/';

  if (
    !pathname.startsWith(
      uploadsPrefix
    )
  ) {

    throw new Error(
      'URL de vídeo não aponta para uploads.'
    );

  }

  const uploadsDir =
    path.resolve(
      __dirname,
      '../uploads'
    );

  const localFilePath =
    path.resolve(
      uploadsDir,
      pathname.slice(
        uploadsPrefix.length
      )
    );

  const relativePath =
    path.relative(
      uploadsDir,
      localFilePath
    );

  if (
    !relativePath ||
    relativePath.startsWith('..') ||
    path.isAbsolute(relativePath) ||
    !fs.existsSync(localFilePath)
  ) {

    throw new Error(
      'Arquivo de vídeo local não encontrado.'
    );

  }

  return localFilePath;

}


// ============================================================
// 🔥 POST VIDEO
// ============================================================

router.post(
  '/',
  async (req, res) => {

    try {

      const {
        userId,
        uri,
        description,
        duration
      } = req.body;


      // ================================================
      // URL → CAMINHO LOCAL
      // ================================================

      const publicUrl =
        uri;

      let localFilePath =
        null;

      try {

        localFilePath =
          getLocalUploadPath(
            publicUrl
          );

      } catch (error) {

        console.warn(
          'Caminho local do vídeo indisponível:',
          error.message
        );

      }


      // ================================================
      // ESPERA UPLOAD FINALIZAR
      // ================================================

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            1000
          )
      );


      let classification;


      try {

        // ==============================================
        // IA PRINCIPAL
        // ==============================================

        classification =
          await fusionClassifier(
            {
              description,
              duration
            },

            localFilePath
          );

      } catch (err) {

        console.log(
          '⚠️ erro IA, usando fallback'
        );


        classification = {

          category:
            'general',

          stimulusLevel:
            0.5,

          tags:
            ['neutral'],

          emotion:
            'neutral'

        };

      }


      // ================================================
      // CRIAR VÍDEO
      // ================================================

      const video =
        new Video({

          userId,

          uri: publicUrl,

          description,

          duration,

          category:
            classification.category,

          stimulusLevel:
            classification
              .stimulusLevel,

          tags:
            classification.tags,

          emotion:
            classification.emotion

        });


      await video.save();


      console.log(
        '🧠 FUSION IA:',
        classification
      );


      return res.json(
        video
      );


    } catch (err) {

      console.error(
        '❌ erro vídeo:',
        err
      );


      return res
        .status(500)
        .json({
          error:
            'Erro ao salvar vídeo'
        });

    }

  }
);


// ============================================================
// ❤️ CURTIR VÍDEO
//
// POST /videos/:videoId/like
//
// BODY:
// {
//   userId: "..."
// }
// ============================================================

router.post(
  '/:videoId/like',
  async (req, res) => {

    try {

      const {
        videoId
      } = req.params;


      const {
        userId
      } = req.body;


      if (!userId) {

        return res
          .status(400)
          .json({

            success: false,

            error:
              'userId obrigatório'

          });

      }


      // ================================================
      // CONFIRMAR QUE O VÍDEO EXISTE
      // ================================================

      const video =
        await Video.findById(
          videoId
        )
          .select('_id')
          .lean();


      if (!video) {

        return res
          .status(404)
          .json({

            success: false,

            error:
              'Vídeo não encontrado'

          });

      }


      // ================================================
      // LIKE IDEMPOTENTE
      //
      // Se já existir:
      // mantém o mesmo.
      //
      // Se não existir:
      // cria.
      // ================================================

      await VideoLike.findOneAndUpdate(
        {
          userId,
          videoId
        },

        {
          $setOnInsert: {
            userId,
            videoId,
            createdAt:
              new Date()
          }
        },

        {
          upsert: true,

          new: true,

          setDefaultsOnInsert:
            true
        }
      );


      const likeCount =
        await VideoLike.countDocuments({
          videoId
        });


      console.log(
        '❤️ LIKE:',
        {
          userId,
          videoId,
          likeCount
        }
      );


      return res.json({

        success: true,

        liked: true,

        likeCount

      });


    } catch (err) {

      // ================================================
      // PROTEÇÃO EXTRA PARA DUPLICIDADE
      // ================================================

      if (
        err &&
        err.code === 11000
      ) {

        return res.json({

          success: true,

          liked: true

        });

      }


      console.error(
        '❌ erro like:',
        err
      );


      return res
        .status(500)
        .json({

          success: false,

          error:
            'Erro ao curtir vídeo'

        });

    }

  }
);


// ============================================================
// 🤍 REMOVER LIKE
//
// DELETE /videos/:videoId/like
//
// BODY:
// {
//   userId: "..."
// }
// ============================================================

router.delete(
  '/:videoId/like',
  async (req, res) => {

    try {

      const {
        videoId
      } = req.params;


      const {
        userId
      } = req.body;


      if (!userId) {

        return res
          .status(400)
          .json({

            success: false,

            error:
              'userId obrigatório'

          });

      }


      await VideoLike.deleteOne({
        userId,
        videoId
      });


      const likeCount =
        await VideoLike.countDocuments({
          videoId
        });


      console.log(
        '🤍 UNLIKE:',
        {
          userId,
          videoId,
          likeCount
        }
      );


      return res.json({

        success: true,

        liked: false,

        likeCount

      });


    } catch (err) {

      console.error(
        '❌ erro unlike:',
        err
      );


      return res
        .status(500)
        .json({

          success: false,

          error:
            'Erro ao remover like'

        });

    }

  }
);


// ============================================================
// 🔥 GET VIDEOS
// ============================================================

router.get(
  '/',
  async (req, res) => {

    try {

      const videos =
        await Video.find()
          .sort({
            createdAt: -1
          })
          .populate(
            'userId',
            'name avatar'
          );


      const formatted =
        videos.map(
          v => ({

            id:
              v._id,

            uri:
              v.uri,

            description:
              v.description,

            user:
              v.userId?.name ||
              'User',

            avatar:
              v.userId?.avatar,

            emotion:
              v.emotion,

            category:
              v.category,

            tags:
              v.tags ||
              [],

            stimulusLevel:
              v.stimulusLevel ||
              0.5,

            duration:
              v.duration ||
              0,

            createdAt:
              v.createdAt

          })
        );


      return res.json(
        formatted
      );


    } catch (err) {

      console.error(
        '❌ erro feed:',
        err
      );


      return res
        .status(500)
        .json({

          error:
            'Erro ao buscar vídeos'

        });

    }

  }
);


module.exports =
  router;
