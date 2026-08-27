// src/communicationbackend/api.ts
import { API_BASE_URL } from '../config/api';
export type Card = {
  id: string;
  text: string;
  color: string;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  cards: Card[];
};

export const api = {
  register: async (name: string, email: string, password: string): Promise<UserProfile> => {
    const res = await fetch(`${API_BASE_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Erro ao registrar');
    return res.json();
  },

  login: async (email: string, password: string): Promise<UserProfile> => {
    const res = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Erro ao logar');
    return res.json();
  },

  getProfile: async (id: string): Promise<UserProfile> => {
    const res = await fetch(`${API_BASE_URL}/users/${id}`);
    if (!res.ok) throw new Error((await res.json()).message || 'Erro ao buscar perfil');
    return res.json();
  },

  updateProfile: async (id: string, data: Partial<Omit<UserProfile, 'id' | 'email'>>): Promise<UserProfile> => {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Erro ao atualizar perfil');
    return res.json();
  },

  addCard: async (userId: string, text: string, color: string): Promise<Card> => {
    const res = await fetch(`${API_BASE_URL}/users/${userId}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, color }),
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Erro ao adicionar card');
    return res.json();
  },

  updateCard: async (userId: string, cardId: string, text: string, color?: string): Promise<Card> => {
    const body: any = { text };
    if (color) body.color = color;
    const res = await fetch(`${API_BASE_URL}/users/${userId}/cards/${cardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Erro ao atualizar card');
    return res.json();
  },

  deleteCard: async (userId: string, cardId: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/users/${userId}/cards/${cardId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Erro ao deletar card');
  },
};
