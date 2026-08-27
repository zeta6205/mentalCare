const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const Comment = require('../models/Comment');
const Video = require('../models/Video');


// ============================================================
// 💬 FORMATAR COMENTÁRIO
// ============================================================

const formatComment = comment => ({
  id:
    String(comment._id),

  videoId:
    String(comment.videoId),

  userId:
    comment.userId?._id
      ? String(comment.userId._id)
      : String(comment.userId),

  userName:
    comment.userId?.name ||
    'Usuário',

  avatar:
    comment.userId?.avatar ||
    null,

  text:
    comment.text,

  createdAt:
    comment.createdAt
});


// ============================================================
// 💬 CRIAR COMENTÁRIO
//
// POST /comments
// BODY: { userId, videoId, text }
// ============================================================

router.post(
  '/',
  async (req, res) => {

    try {

      const {
        userId,
        videoId,
        text
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


      if (!videoId) {

        return res
          .status(400)
          .json({
            success: false,
            error:
              'videoId obrigatório'
          });
      }


      if (
        !mongoose.isValidObjectId(
          userId
        ) ||
        !mongoose.isValidObjectId(
          videoId
        )
      ) {

        return res
          .status(400)
          .json({
            success: false,
            error:
              'ID inválido'
          });
      }


      const safeText =
        typeof text === 'string'
          ? text.trim()
          : '';


      if (!safeText) {

        return res
          .status(400)
          .json({
            success: false,
            error:
              'Comentário vazio'
          });
      }


      if (safeText.length > 500) {

        return res
          .status(400)
          .json({
            success: false,
            error:
              'Comentário deve ter no máximo 500 caracteres'
          });
      }


      const videoExists =
        await Video.exists({
          _id: videoId
        });


      if (!videoExists) {

        return res
          .status(404)
          .json({
            success: false,
            error:
              'Vídeo não encontrado'
          });
      }


      const comment =
        new Comment({
          userId,
          videoId,
          text: safeText
        });


      await comment.save();


      await comment.populate(
        'userId',
        'name avatar'
      );


      const formatted =
        formatComment(comment);


      console.log(
        '💬 COMENTÁRIO SALVO:',
        {
          commentId:
            formatted.id,

          userId:
            formatted.userId,

          videoId:
            formatted.videoId
        }
      );


      return res
        .status(201)
        .json({
          success: true,
          comment:
            formatted
        });


    } catch (err) {

      console.error(
        '❌ erro comentário:',
        err
      );


      return res
        .status(500)
        .json({
          success: false,
          error:
            'Erro ao salvar comentário'
        });
    }
  }
);


// ============================================================
// 💬 LISTAR COMENTÁRIOS DO VÍDEO
//
// GET /comments/video/:videoId
// ============================================================

router.get(
  '/video/:videoId',
  async (req, res) => {

    try {

      const {
        videoId
      } = req.params;


      if (
        !mongoose.isValidObjectId(
          videoId
        )
      ) {

        return res
          .status(400)
          .json({
            success: false,
            error:
              'videoId inválido'
          });
      }


      const comments =
        await Comment.find({
          videoId
        })
          .sort({
            createdAt: 1
          })
          .populate(
            'userId',
            'name avatar'
          );


      return res.json({
        success: true,
        comments:
          comments.map(
            formatComment
          ),
        total:
          comments.length
      });


    } catch (err) {

      console.error(
        '❌ erro ao buscar comentários:',
        err
      );


      return res
        .status(500)
        .json({
          success: false,
          error:
            'Erro ao buscar comentários'
        });
    }
  }
);


module.exports = router;
