const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');

module.exports = {
  register: async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) return res.status(400).json({ message: 'Todos os campos são obrigatórios' });

      const user = await userModel.createUser({ name, email, password });
      res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar, banner: user.banner, bio: user.bio, cards: user.cards });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: 'Email e senha obrigatórios' });

      const user = await userModel.findUserByEmail(email);
      if (!user) return res.status(400).json({ message: 'Usuário não encontrado' });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(400).json({ message: 'Senha incorreta' });

      res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar, banner: user.banner, bio: user.bio, cards: user.cards });
    } catch (err) {
      res.status(500).json({ message: 'Erro ao fazer login' });
    }
  },

  getProfile: async (req, res) => {
    try {
      const { id } = req.params;
      const user = await userModel.findUserById(id);
      if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await userModel.updateUser(id, data);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
};
