const express = require('express');

const router = express.Router();

const UserBehavior =
  require('../models/UserBehavior');

const {
  learnFromBehavior
} =
  require('../AI/preferenceLearning');


// ============================================================
// 📊 REGISTRAR COMPORTAMENTO
// ============================================================

router.post('/track', async (req, res) => {

  try {

    // ========================================================
    // DADOS RECEBIDOS
    // ========================================================

    const {
      userId,
      videoId,

      watchTime,
      duration,
      stimulusLevel,

      category,
      tags,

      liked,
      commented,
      shared,

      sessionId
    } = req.body;


    console.log(
      '📊 BEHAVIOR RECEBIDO:',
      {
        userId,
        videoId,

        watchTime,
        duration,
        stimulusLevel,

        category,
        tags,

        liked,
        commented,
        shared,

        sessionId
      }
    );


    // ========================================================
    // VALIDAÇÕES
    // ========================================================

    if (!userId) {

      return res
        .status(400)
        .json({
          success: false,
          error: 'userId obrigatório'
        });

    }


    if (!videoId) {

      return res
        .status(400)
        .json({
          success: false,
          error: 'videoId obrigatório'
        });

    }


    // ========================================================
    // NORMALIZAÇÃO NUMÉRICA
    // ========================================================

    const safeWatchTime =
      Math.max(
        0,
        Number(watchTime) || 0
      );


    const safeDuration =
      Math.max(
        0,
        Number(duration) || 0
      );


    const rawStimulus =
      Number(stimulusLevel);


    const finalStimulus =
      Number.isFinite(rawStimulus)
        ? Math.max(
            0,
            Math.min(
              1,
              rawStimulus
            )
          )
        : 0.5;


    // ========================================================
    // CATEGORIA
    // ========================================================

    const safeCategory =

      typeof category === 'string' &&
      category.trim()

        ? category
            .trim()
            .toLowerCase()

        : 'general';


    // ========================================================
    // TAGS
    //
    // também remove duplicatas
    // ========================================================

    const safeTags =
      Array.isArray(tags)

        ? [
            ...new Set(
              tags

                .filter(
                  tag =>
                    typeof tag ===
                    'string'
                )

                .map(
                  tag =>
                    tag
                      .trim()
                      .toLowerCase()
                )

                .filter(Boolean)
            )
          ]

        : [];


    // ========================================================
    // INTERAÇÕES
    // ========================================================

    const safeLiked =
      liked === true;


    const safeCommented =
      commented === true;


    const safeShared =
      shared === true;


    // ========================================================
    // SESSION
    // ========================================================

    const safeSessionId =

      sessionId &&
      String(sessionId).trim()

        ? String(
            sessionId
          ).trim()

        : null;


    // ========================================================
    // COMPLETION RATE
    // ========================================================

    let completionRate = 0;


    if (safeDuration > 0) {

      completionRate =
        safeWatchTime /
        safeDuration;


      completionRate =
        Math.max(
          0,
          Math.min(
            1,
            completionRate
          )
        );

    }


    // ========================================================
    // CRIAR BEHAVIOR
    // ========================================================

    const behavior =
      new UserBehavior({

        userId,

        videoId,

        watchTime:
          safeWatchTime,

        duration:
          safeDuration,

        stimulusLevel:
          finalStimulus,

        category:
          safeCategory,

        tags:
          safeTags,

        liked:
          safeLiked,

        commented:
          safeCommented,

        shared:
          safeShared,

        sessionId:
          safeSessionId,

        completionRate

      });


    // ========================================================
    // SALVAR COMPORTAMENTO
    // ========================================================

    const savedBehavior =
      await behavior.save();


    console.log(
      '✅ COMPORTAMENTO SALVO:',
      {

        id:
          savedBehavior._id,

        userId:
          savedBehavior.userId,

        videoId:
          savedBehavior.videoId,

        watchTime:
          savedBehavior.watchTime,

        duration:
          savedBehavior.duration,

        completionRate:
          Number(
            savedBehavior
              .completionRate
              .toFixed(3)
          ),

        stimulusLevel:
          savedBehavior
            .stimulusLevel,

        category:
          savedBehavior.category,

        tags:
          savedBehavior.tags,

        liked:
          savedBehavior.liked,

        commented:
          savedBehavior.commented,

        shared:
          savedBehavior.shared,

        sessionId:
          savedBehavior.sessionId

      }
    );


    // ========================================================
    // 🧠 APRENDIZADO DE PREFERÊNCIA
    //
    // Não seguramos a resposta HTTP esperando isso terminar.
    //
    // O comportamento já está salvo.
    // O cérebro de preferências aprende logo em seguida.
    // ========================================================

    void learnFromBehavior(
      savedBehavior
    )
      .then(() => {

        console.log(
          '🧠 aprendizado de preferência concluído'
        );

      })
      .catch(
        learningError => {

          console.error(
            '⚠️ erro no aprendizado de preferência:',
            learningError
          );

        }
      );


    // ========================================================
    // RESPOSTA
    // ========================================================

    return res
      .status(201)
      .json({

        success: true,

        behaviorId:
          savedBehavior._id,

        behavior:
          savedBehavior

      });


  } catch (err) {

    console.error(
      '❌ ERRO AO SALVAR COMPORTAMENTO:',
      err
    );


    return res
      .status(500)
      .json({

        success: false,

        error:
          'Erro ao salvar comportamento',

        message:
          err.message

      });

  }

});


module.exports =
  router;