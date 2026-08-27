const express = require('express');

const router = express.Router();

const Video = require('../models/Video');
const Behavior = require('../models/UserBehavior');
const UserPreference = require('../models/UserPreference');
const VideoLike = require('../models/VideoLike');

const calculateScore = require('../AI/compulsionScore');
const decideIntervention = require('../AI/decisionEngine');
const generateIntervention = require('../AI/interventionEngine');
const generateFeed = require('../AI/feedEngine');


router.get('/:userId', async (req, res) => {

  try {

    const { userId } = req.params;


    // ==================================================
    // 1. HISTÓRICO RECENTE
    // ==================================================

    const behaviors =
      await Behavior.find({
        userId
      })
        .sort({
          createdAt: -1
        })
        .limit(30);


    // ==================================================
    // 2. MEMÓRIA PERSISTENTE DO USUÁRIO
    // ==================================================

    const persistentPreference =
      await UserPreference.findOne({
        userId
      });


    console.log(
      '💾 USER PREFERENCE:',
      persistentPreference
        ? {
            found: true,

            totalInteractions:
              persistentPreference
                .totalInteractions,

            lastBehaviorAt:
              persistentPreference
                .lastBehaviorAt
          }
        : {
            found: false
          }
    );


    // ==================================================
    // 3. COMPULSION SCORE
    // ==================================================

    const score =
      calculateScore(
        behaviors
      );


    console.log(
      '🧠 compulsionScore:',
      score
    );


    // ==================================================
    // 4. DECISION ENGINE
    // ==================================================

    const decision =
      decideIntervention(
        score
      );


    console.log(
      '🧠 DECISION:',
      decision
    );


    // ==================================================
    // 5. INTERVENTION ENGINE
    // ==================================================

    const intervention =
      generateIntervention(
        decision
      );


    if (intervention) {

      console.log(
        '💬 INTERVENÇÃO:',
        intervention
      );

    }


    // ==================================================
    // 6. VÍDEOS DISPONÍVEIS
    // ==================================================

    const videos =
      await Video.find()
        .sort({
          createdAt: -1
        });
        
        // ==================================================
// LIKES DO USUÁRIO
// ==================================================

const userLikes =
  await VideoLike.find({

    userId,

    videoId: {
      $in:
        videos.map(
          video =>
            video._id
        )
    }

  })
    .select('videoId')
    .lean();


const likedVideoIds =
  new Set(

    userLikes.map(
      like =>
        String(
          like.videoId
        )
    )

  );

    // ==================================================
    // 7. RECOMMENDATION ENGINE + CONTRA-ALGORITMO
    //
    // Agora enviamos:
    //
    // - catálogo
    // - compulsão
    // - histórico recente
    // - decisão
    // - preferência persistente
    // ==================================================

    const generatedFeed =
      generateFeed(
        videos,
        score,
        behaviors,
        decision,
        persistentPreference
      );


    // ==================================================
    // 8. NORMALIZAÇÃO PARA O FRONTEND
    // ==================================================

    const feed =
      generatedFeed.map(
        video => ({

          id:
            video._id
              ? video._id.toString()
              : video.id,

          uri:
            video.uri,

          description:
            video.description || '',

          duration:
            video.duration || 0,

          category:
            video.category ||
            'general',

          tags:
            Array.isArray(
              video.tags
            )
              ? video.tags
              : [],

          stimulusLevel:
            Number.isFinite(
              video.stimulusLevel
            )
              ? video.stimulusLevel
              : 0.5,

          emotion:
            video.emotion ||
            'neutral',

          userId:
            video.userId,

       likedByMe:
      likedVideoIds.has(
      String(
      video._id ||
      video.id
    )
  ),

        })
      );


    // ==================================================
    // 9. DEBUG
    // ==================================================

    console.log(
      '🧠 feed enviado:',
      {

        totalVideos:
          feed.length,

        score,

        state:
          decision.state,

        action:
          decision.action,

        persistentPreference:
          Boolean(
            persistentPreference
          ),

        preferenceInteractions:
          persistentPreference
            ?.totalInteractions ||
          0

      }
    );


    // ==================================================
    // 10. RESPOSTA
    // ==================================================

    return res.json({

      success: true,

      score,

      behaviorCount:
        behaviors.length,

      state:
        decision.state,

      action:
        decision.action,

      intervention,

      feedStrategy:
        decision.feedStrategy ||
        null,

      feed

    });


  } catch (err) {

    console.error(
      '❌ erro feed:',
      err
    );


    return res
      .status(500)
      .json({

        success: false,

        error:
          'Erro no feed',

        message:
          err.message

      });

  }

});


module.exports = router;