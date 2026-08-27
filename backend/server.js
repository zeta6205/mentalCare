// ==================================================
// MENTALCARE — SERVER
// ==================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// ==================================================
// ROTAS
// ==================================================

const behaviorRoutes = require('./routes/behavior');
const aiRoutes = require('./routes/ai');
const videoRoutes = require('./routes/videos');
const uploadsRoute = require('./routes/uploads');
const usersRoute = require('./routes/users');
const feedRoutes = require('./routes/feed');
const commentsRoutes = require('./routes/comments');

// ==================================================
// APP
// ==================================================

const app = express();

// Porta:
// - local: 3000
// - deploy: plataforma fornece process.env.PORT
const PORT = process.env.PORT || 3000;

// 0.0.0.0 permite acesso pela rede local
// e também funciona no deploy.
const HOST = '0.0.0.0';

// ==================================================
// CONFIGURAÇÕES
// ==================================================

app.disable('x-powered-by');

app.set(
  'trust proxy',
  1
);

// ==================================================
// MONGODB
// ==================================================

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/mentalCare';

mongoose.connect(MONGODB_URI)
  .then(() => {

    console.log('====================================');
    console.log('✅ MongoDB conectado!');
    console.log('====================================');

  })
  .catch((err) => {

    console.error(
      '❌ Erro ao conectar MongoDB:',
      err.message
    );

  });

// ==================================================
// MIDDLEWARES
// ==================================================

app.use(
  cors({
    origin: '*',
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS'
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization'
    ]
  })
);

app.use(
  express.json({
    limit: '10mb'
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb'
  })
);

// ==================================================
// LOG DE REQUISIÇÕES
// ==================================================

// Mantemos o log detalhado durante o desenvolvimento.
// Em produção, podemos trocar por um logger apropriado.

app.use((req, res, next) => {

  const start = Date.now();

  console.log(
    `[REQ] ${req.method} ${req.originalUrl}`
  );

  // Loga body apenas quando existir
  if (
    req.body &&
    Object.keys(req.body).length > 0
  ) {

    console.log(
      '[BODY]',
      req.body
    );

  }

  res.on('finish', () => {

    const duration =
      Date.now() - start;

    console.log(
      `[RES] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`
    );

  });

  next();

});

// ==================================================
// ARQUIVOS ESTÁTICOS
// ==================================================

// Vídeos, avatars e banners ficam aqui.
//
// /uploads/userId/arquivo.mp4
// /uploads/userId/avatar.jpg
// /uploads/userId/banner.jpg

app.use(
  '/uploads',
  express.static(
    path.join(__dirname, 'uploads'),
    {
      etag: true,
      lastModified: true,
      maxAge: '1h'
    }
  )
);

// ==================================================
// HEALTH CHECK
// ==================================================

// Muito importante para o deploy.
// A plataforma poderá verificar se o servidor está vivo.

app.get(
  '/health',
  (req, res) => {

    const mongoState =
      mongoose.connection.readyState;

    const mongoConnected =
      mongoState === 1;

    res.status(
      mongoConnected ? 200 : 503
    ).json({

      success: mongoConnected,

      server: 'online',

      mongodb:
        mongoConnected
          ? 'connected'
          : 'disconnected',

      environment:
        process.env.NODE_ENV || 'development',

      timestamp:
        new Date().toISOString()

    });

  }
);

// ==================================================
// ROTAS PRINCIPAIS
// ==================================================

// 🎥 Vídeos
app.use(
  '/videos',
  videoRoutes
);

// 👤 Usuários
app.use(
  '/users',
  usersRoute
);

// 📁 Uploads
app.use(
  '/uploads',
  uploadsRoute
);

// 🧠 Feed inteligente
app.use(
  '/feed',
  feedRoutes
);

// 💬 Comentários de vídeos
app.use(
  '/comments',
  commentsRoutes
);

// 🤖 IA
app.use(
  '/ai',
  aiRoutes
);

// 🧠 Comportamento / compulsão
app.use(
  '/behavior',
  behaviorRoutes
);

// ==================================================
// MODELO DE USUÁRIO
// ==================================================

const User = require('./models/User');

// ==================================================
// MODELO DE POSTS
// ==================================================

const commentSchema =
  new mongoose.Schema({

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    userName: {
      type: String,
      default: ''
    },

    content: {
      type: String,
      default: ''
    },

    time: {
      type: Date,
      default: Date.now
    }

  });

// --------------------------------------------------

const postSchema =
  new mongoose.Schema({

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    userName: {
      type: String,
      default: ''
    },

    avatar: {
      type: String,
      default: null
    },

    content: {
      type: String,
      required: true,
      trim: true
    },

    time: {
      type: Date,
      default: Date.now
    },

    likes: {
      type: Number,
      default: 0
    },

    comments: {
      type: [commentSchema],
      default: []
    }

  });

// ==================================================
// MODELO POST
// ==================================================

// Evita erro de OverwriteModelError caso o arquivo
// seja recarregado em algum ambiente.

const Post =
  mongoose.models.Post ||
  mongoose.model(
    'Post',
    postSchema
  );

// ==================================================
// CRIAR POST
// ==================================================

app.post(
  '/users/:id/posts',
  async (req, res) => {

    try {

      const {
        id
      } = req.params;

      const {
        content
      } = req.body;

      // ----------------------------------------------
      // VALIDAÇÃO
      // ----------------------------------------------

      if (
        !content ||
        typeof content !== 'string' ||
        !content.trim()
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Conteúdo obrigatório.'

        });

      }

      // ----------------------------------------------
      // BUSCAR USUÁRIO
      // ----------------------------------------------

      const user =
        await User.findById(id);

      if (!user) {

        return res.status(404).json({

          success: false,

          message:
            'Usuário não encontrado.'

        });

      }

      // ----------------------------------------------
      // CRIAR POST
      // ----------------------------------------------

      const newPost =
        new Post({

          userId:
            user._id,

          userName:
            user.name,

          avatar:
            user.avatar || null,

          content:
            content.trim()

        });

      const savedPost =
        await newPost.save();

      console.log(
        '📦 Post salvo:',
        savedPost._id
      );

      // ----------------------------------------------
      // RESPOSTA
      // ----------------------------------------------

      return res.status(201).json(
        savedPost
      );

    } catch (err) {

      console.error(
        '❌ Erro ao criar post:',
        err
      );

      return res.status(500).json({

        success: false,

        message:
          'Erro ao criar post'

      });

    }

  }
);

// ==================================================
// BUSCAR POSTS
// ==================================================

app.get(
  '/posts',
  async (req, res) => {

    try {

      const posts =
        await Post
          .find()
          .sort({
            time: -1
          });

      return res.json(
        posts
      );

    } catch (err) {

      console.error(
        '❌ Erro ao buscar posts:',
        err
      );

      return res.status(500).json({

        success: false,

        message:
          'Erro ao buscar posts'

      });

    }

  }
);

// ==================================================
// 404
// ==================================================

app.use(
  (req, res) => {

    console.log(
      `⚠️ Rota não encontrada: ${req.method} ${req.originalUrl}`
    );

    return res.status(404).json({

      success: false,

      error:
        'Rota não encontrada',

      path:
        req.originalUrl

    });

  }
);

// ==================================================
// ERROR HANDLER GLOBAL
// ==================================================

app.use(
  (err, req, res, next) => {

    console.error(
      '❌ ERRO GLOBAL:',
      err
    );

    if (res.headersSent) {

      return next(err);

    }

    return res.status(500).json({

      success: false,

      error:
        'Erro interno do servidor',

      message:
        process.env.NODE_ENV === 'production'
          ? 'Erro interno'
          : err.message

    });

  }
);

// ==================================================
// START SERVER
// ==================================================

const server =
  app.listen(
    PORT,
    HOST,
    () => {

      console.log('');
      console.log('====================================');
      console.log('🚀 MENTALCARE BACKEND');
      console.log('====================================');
      console.log(
        `🌐 Porta: ${PORT}`
      );
      console.log(
        `🏠 Ambiente: ${
          process.env.NODE_ENV || 'development'
        }`
      );
      console.log(
        `📁 Uploads: ${path.join(__dirname, 'uploads')}`
      );
      console.log(
        `🩺 Health: /health`
      );
      console.log('====================================');
      console.log('');

    }
  );

// ==================================================
// ERROS DO SERVIDOR
// ==================================================

server.on(
  'error',
  (err) => {

    console.error(
      '❌ Erro no servidor:',
      err
    );

  }
);

// ==================================================
// ENCERRAMENTO LIMPO
// ==================================================

async function gracefulShutdown(
  signal
) {

  console.log(
    `\n🛑 Recebido ${signal}. Encerrando servidor...`
  );

  server.close(
    async () => {

      console.log(
        '✅ Servidor HTTP encerrado.'
      );

      try {

        await mongoose.connection.close();

        console.log(
          '✅ MongoDB desconectado.'
        );

        process.exit(0);

      } catch (err) {

        console.error(
          '❌ Erro ao fechar MongoDB:',
          err
        );

        process.exit(1);

      }

    }
  );

}

// ==================================================
// SIGNALS
// ==================================================

process.on(
  'SIGINT',
  () => gracefulShutdown('SIGINT')
);

process.on(
  'SIGTERM',
  () => gracefulShutdown('SIGTERM')
);
