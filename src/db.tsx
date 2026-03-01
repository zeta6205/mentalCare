// src/db.ts

//  Tipos principais
export type Message = {
  id: string;
  text: string;
  sender: string; // ID do usuário
  timestamp: number;
};

export type Conversation = {
  id: string;
  participants: string[]; // IDs dos usuários na conversa
  messages: Message[];
};

export type DailyCard = {
  id: string;
  title: string;
  description: string;
  date: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar: string;
  dailyCards: DailyCard[];
};

//  Base de dados simulada (mock)
export let users: User[] = [
  {
    id: '1',
    name: 'Ana - Psicóloga',
    email: 'ana@example.com',
    password: '123456',
    avatar: 'https://i.pravatar.cc/150?img=5',
    dailyCards: [
      {
        id: '1',
        title: 'Autocuidado',
        description: 'Lembre-se de respirar fundo e tirar um tempo pra si hoje 💖',
        date: new Date().toISOString(),
      },
    ],
  },
  {
    id: '2',
    name: 'Lucas',
    email: 'lucas@example.com',
    password: '123456',
    avatar: 'https://i.pravatar.cc/150?img=3',
    dailyCards: [],
  },
  {
    id: '3',
    name: 'Clara',
    email: 'clara@example.com',
    password: '123456',
    avatar: 'https://i.pravatar.cc/150?img=12',
    dailyCards: [],
  },
];

//  Conversas simuladas
export let conversations: Conversation[] = [
  {
    id: '1',
    participants: ['1', '2'], // Ana e Lucas
    messages: [
      { id: '1', text: 'Oi! Como você está?', sender: '1', timestamp: Date.now() - 60000 },
      { id: '2', text: 'Tudo bem, e você?', sender: '2', timestamp: Date.now() - 30000 },
    ],
  },
  {
    id: '2',
    participants: ['1', '3'], // Ana e Clara
    messages: [
      { id: '1', text: 'Podemos conversar um pouco?', sender: '3', timestamp: Date.now() - 20000 },
    ],
  },
];

//  Funções utilitárias
export const addMessageToConversation = (conversationId: string, message: Message) => {
  const conv = conversations.find(c => c.id === conversationId);
  if (conv) conv.messages.push(message);
};

export const findUserByEmail = (email: string) => users.find(u => u.email === email);

export const findUserById = (id: string) => users.find(u => u.id === id);

export const addUser = (user: User) => {
  const exists = users.some(u => u.email === user.email);
  if (!exists) users.push(user);
  else throw new Error('Email já cadastrado');
};

export const addDailyCard = (userId: string, card: DailyCard) => {
  const user = users.find(u => u.id === userId);
  if (user) user.dailyCards.push(card);
};

export const updateUserAvatar = (userId: string, newAvatar: string) => {
  const user = users.find(u => u.id === userId);
  if (user) user.avatar = newAvatar;
};

export const getUserConversations = (userId: string) =>
  conversations.filter(c => c.participants.includes(userId));
