const User = require('../models/User');
const bcrypt = require('bcrypt');

module.exports = {

  // 🚀 REGISTRO
  register: async (req, res) => {
    try {

      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          message: 'Todos os campos são obrigatórios'
        });
      }

      // 🔥 verifica email existente
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({
          message: 'Email já cadastrado'
        });
      }

      // 🔐 hash senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // 👤 cria usuário
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        avatar: '',
        banner: '',
        bio: '',
        cards: []
      });

      res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        banner: user.banner,
        bio: user.bio,
        cards: user.cards
      });

    } catch (err) {

      console.error('❌ ERRO REGISTRO:', err);

      res.status(500).json({
        message: 'Erro ao registrar usuário'
      });
    }
  },

  // 🔐 LOGIN
  login: async (req, res) => {
    try {

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          message: 'Email e senha obrigatórios'
        });
      }

      // 🔥 busca usuário
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(400).json({
          message: 'Usuário não encontrado'
        });
      }

      // 🔐 compara senha
      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.status(400).json({
          message: 'Senha incorreta'
        });
      }

      res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        banner: user.banner,
        bio: user.bio,
        cards: user.cards
      });

    } catch (err) {

      console.error('❌ ERRO LOGIN:', err);

      res.status(500).json({
        message: 'Erro ao fazer login'
      });
    }
  },

  // 👤 PERFIL
  getProfile: async (req, res) => {
    try {

      const { id } = req.params;

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          message: 'Usuário não encontrado'
        });
      }

      res.json(user);

    } catch (err) {

      console.error('❌ ERRO PERFIL:', err);

      res.status(500).json({
        message: 'Erro ao buscar perfil'
      });
    }
  },

  // ✏️ UPDATE PROFILE
  updateProfile: async (req, res) => {
    try {

      const { id } = req.params;
      const data = req.body;

      const updated = await User.findByIdAndUpdate(
        id,
        data,
        { new: true }
      );

      res.json(updated);

    } catch (err) {

      console.error('❌ ERRO UPDATE:', err);

      res.status(500).json({
        message: 'Erro ao atualizar perfil'
      });
    }
  }

};

