// routes/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');

// 🟢 Registro de usuário
router.post('/register', async (req, res) => {
  try {
    console.log('[REQ] POST /users/register - body:', req.body);

    const { name, email, password } = req.body;

    // 🔹 Verifica se o usuário já existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.warn(`⚠️ Tentativa de registro com e-mail existente: ${email}`);
      return res.status(400).json({ error: 'Usuário já existe.' });
    }

    // 🔹 Criptografa a senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔹 Cria novo usuário
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      avatar: '',
      banner: '',
      cards: [],
    });

    await newUser.save();

    console.log(`✅ Usuário registrado com sucesso: ${email}`);

    // 🔹 Retorna o usuário (sem senha)
    return res.status(201).json({
      message: 'Usuário registrado com sucesso!',
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        banner: newUser.banner,
      },
    });
  } catch (error) {
    console.error('❌ ERRO DETALHADO NO REGISTRO:', error);
    return res.status(500).json({ error: 'Erro ao registrar usuário.' });
  }
});

// 🟣 Login
router.post('/login', async (req, res) => {
  try {
    console.log('[REQ] POST /users/login - body:', req.body);
    const { email, password } = req.body;

    // 🔹 Busca o usuário no banco
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: 'Usuário não encontrado.' });

    // 🔹 Verifica a senha
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ error: 'Senha incorreta.' });

    console.log(`✅ Login bem-sucedido: ${email}`);

    // 🔹 Retorna o usuário (sem senha)
    return res.json({
      message: 'Login bem-sucedido!',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        banner: user.banner,
      },
    });
  } catch (err) {
    console.error('❌ Erro no login:', err);
    return res.status(500).json({ error: 'Erro no login.' });
  }
});

// 🔹 Buscar usuário por ID (corrigido e protegido)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[REQ] GET /users/${id}`);

  try {
    // validação de formato
    if (!id || id.length !== 24) {
      console.warn(`⚠️ ID inválido recebido: ${id}`);
      return res.status(400).json({ error: 'ID de usuário inválido.' });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      console.warn(`⚠️ Usuário não encontrado: ${id}`);
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    console.log(`✅ Perfil encontrado: ${user.email}`);
    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      bio: user.bio || '',
      avatar: user.avatar || '',
      banner: user.banner || '',
      cards: user.cards || [],
    });
  } catch (err) {
    console.error('❌ Erro ao buscar usuário:', err.message);
    return res.status(500).json({ error: 'Erro interno ao buscar usuário.' });
  }
});

// ✏️ Atualizar usuário (perfil)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[REQ] PUT /users/${id} - body:`, req.body);

  try {
    if (!id || id.length !== 24) {
      console.warn(`⚠️ ID inválido para update: ${id}`);
      return res.status(400).json({ error: 'ID de usuário inválido.' });
    }

    const { name, email, bio, password } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    // Se email for alterado, verifica duplicidade
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing && existing._id.toString() !== id) {
        return res.status(400).json({ error: 'E-mail já em uso por outro usuário.' });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (typeof bio !== 'undefined') user.bio = bio;

    if (password) {
      const bcrypt = require('bcryptjs');
      const hashed = await bcrypt.hash(password, 10);
      user.password = hashed;
    }

    await user.save();

    const sanitized = {
      _id: user._id,
      name: user.name,
      email: user.email,
      bio: user.bio || '',
      avatar: user.avatar || '',
      banner: user.banner || '',
      cards: user.cards || [],
    };

    console.log(`✅ Usuário atualizado: ${user.email}`);
    return res.status(200).json(sanitized);
  } catch (err) {
    console.error('❌ Erro ao atualizar usuário:', err);
    return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});


module.exports = router;
