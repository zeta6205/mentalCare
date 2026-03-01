// server.js — versão completa e funcional
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const fsExtra = require('fs-extra');
const path = require('path');

// Importa rotas de usuário
const usersRoute = require('./routes/users');

const app = express();
const PORT = 3000;

// ==================================================
// 🔗 Conexão com MongoDB
// ==================================================
mongoose.connect('mongodb://localhost:27017/mentalCare', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB conectado!'))
  .catch(err => console.error('❌ Erro ao conectar MongoDB:', err));

// ==================================================
// 🧩 Middlewares globais
// ==================================================
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log simples para debug
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url} - body:`, req.body);
  next();
});

// ==================================================
// 🧠 Modelos
// ==================================================
const User = require('./models/User');

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  content: String,
  time: { type: Date, default: Date.now },
});

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  avatar: String,
  content: String,
  time: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  comments: [commentSchema],
});

const Post = mongoose.model('Post', postSchema);

// ==================================================
// 📦 Funções auxiliares
// ==================================================
function sanitizeUser(userDoc) {
  if (!userDoc) return null;
  const u = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete u.password;
  if (!u.avatar || typeof u.avatar !== 'string' || !u.avatar.trim()) u.avatar = null;
  if (!u.banner || typeof u.banner !== 'string' || !u.banner.trim()) u.banner = null;
  return u;
}

// ==================================================
// 📂 Configuração de uploads com multer
// ==================================================
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const userId = req.params.id;
    const uploadPath = path.join(__dirname, 'uploads', userId);
    await fsExtra.ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const type = req.params.type;
    cb(null, `${type}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

// ==================================================
// 🧭 Rotas principais
// ==================================================

// Rotas de usuários
app.use('/users', usersRoute);

// Importa e usa as rotas de upload
const uploadsRoute = require('./routes/uploads');
app.use('/uploads', uploadsRoute);

// ==================================================
// 📮 Rotas de postagens
// ==================================================
app.post('/users/:id/posts', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Conteúdo obrigatório.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const newPost = new Post({
      userId: user._id,
      userName: user.name,
      avatar: user.avatar || null,
      content: content.trim(),
      time: new Date(),
      likes: 0,
      comments: [],
    });

    const savedPost = await newPost.save();

    console.log('📦 Post salvo no MongoDB:', savedPost);
    return res.status(201).json(savedPost);


    console.log(`✅ Novo post criado por ${user.name}: ${savedPost.content}`);
    return res.status(201).json(savedPost);
  } catch (err) {
    console.error('❌ Erro ao criar post:', err);
    return res.status(500).json({ message: 'Erro ao criar post.', error: err.message });
  }
});

app.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ time: -1 });
    return res.json(posts);
  } catch (err) {
    console.error('❌ Erro ao buscar posts:', err);
    return res.status(500).json({ message: 'Erro ao buscar posts' });
  }
});

app.post('/posts/:postId/like', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post não encontrado' });
    post.likes += 1;
    await post.save();
    return res.json(post);
  } catch (err) {
    console.error('❌ Erro ao curtir post:', err);
    return res.status(500).json({ message: 'Erro ao curtir post' });
  }
});

app.post('/posts/:postId/comment', async (req, res) => {
  const { userId, comment } = req.body;
  if (!userId || !comment) return res.status(400).json({ message: 'Campos obrigatórios' });
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post não encontrado' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    post.comments.push({ userId: user._id, userName: user.name, content: comment });
    await post.save();
    return res.json(post);
  } catch (err) {
    console.error('❌ Erro ao comentar post:', err);
    return res.status(500).json({ message: 'Erro ao comentar post' });
  }
});

// ==================================================
// 🚀 Inicialização do servidor
// ==================================================
app.listen(PORT, '0.0.0.0', () => {
  // Ajuste: atualizar o IP exibido no log para o novo host
  console.log(`🚀 Servidor rodando em http://192.168.4.109:${PORT}`);
});
