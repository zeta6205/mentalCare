import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { motion } from 'framer-motion';

const { width } = Dimensions.get('window');
// Base API URL — updated to the new host
const API_URL = 'http://192.168.4.109:3000';

interface Comment {
  _id: string;
  userId: string;
  userName: string;
  content: string;
  time: string;
}

interface Post {
  _id: string;
  userId: string;
  userName: string;
  avatar?: string;
  content: string;
  time: string;
  likes: number;
  comments?: Comment[];
}

const HomeScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [commentInputId, setCommentInputId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // 🔹 Carrega posts do servidor
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/posts`);
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível carregar os posts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // 🧠 Criação de novo post
  const handleCreatePost = async () => {
    if (!newPost.trim()) return;
    try {
      const res = await fetch(`${API_URL}/users/${user?._id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPost.trim() }),
      });
      const post = await res.json();

      if (!post || !post._id) {
        Alert.alert('Erro', 'Falha ao criar post.');
        return;
      }

      setPosts(prev => [post, ...prev]);
      setNewPost('');
    } catch (err) {
      console.error('Erro ao criar post:', err);
      Alert.alert('Erro', 'Não foi possível criar o post.');
    }
  };

  // ❤️ Curtir post
  const handleLikePost = async (postId: string) => {
    try {
      const res = await fetch(`${API_URL}/posts/${postId}/like`, { method: 'POST' });
      const updatedPost = await res.json();
      setPosts(prev => prev.map(p => (p._id === updatedPost._id ? updatedPost : p)));
    } catch (err) {
      console.error(err);
    }
  };

  // 💬 Comentar post
  const handleCommentPost = async (postId: string) => {
    if (!commentText.trim()) return;
    try {
      const res = await fetch(`${API_URL}/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?._id, comment: commentText.trim() }),
      });
      const updatedPost = await res.json();
      setPosts(prev => prev.map(p => (p._id === updatedPost._id ? updatedPost : p)));
      setCommentText('');
      setCommentInputId(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#007B83" />
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient colors={['#a8edea', '#fed6e3']} style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Olá, {user?.name}</Text>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Criar Post */}
        <View style={styles.createPost}>
          <TextInput
            style={styles.input}
            placeholder="Compartilhe algo inspirador..."
            value={newPost}
            onChangeText={setNewPost}
            multiline
          />
          <TouchableOpacity style={styles.postButton} onPress={handleCreatePost}>
            <Text style={styles.postButtonText}>Publicar</Text>
          </TouchableOpacity>
        </View>

        {/* Feed */}
        {posts.length === 0 ? (
          <Text style={styles.noPostsText}>✨ Nenhuma publicação ainda. Seja o primeiro!</Text>
        ) : (
          posts.map(post => (
            <View key={post._id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <Image
                  source={{
                    uri:
                      post.avatar ||
                      'https://cdn-icons-png.flaticon.com/512/847/847969.png',
                  }}
                  style={styles.avatar}
                />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.userName}>{post.userName}</Text>
                  <Text style={styles.postTime}>
                    {new Date(post.time).toLocaleString('pt-BR')}
                  </Text>
                </View>
              </View>

              <Text style={styles.postContent}>{post.content}</Text>

              <View style={styles.footer}>
                <TouchableOpacity
                  onPress={() => handleLikePost(post._id)}
                  style={styles.footerButton}
                >
                  <Text style={styles.footerText}>❤️ {post.likes}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCommentInputId(commentInputId === post._id ? null : post._id)}
                  style={styles.footerButton}
                >
                  <Text style={styles.footerText}>
                    💬 {post.comments?.length || 0}
                  </Text>
                </TouchableOpacity>
              </View>

              {commentInputId === post._id && (
                <View style={styles.commentInput}>
                  <TextInput
                    style={styles.commentTextInput}
                    placeholder="Escreva um comentário..."
                    value={commentText}
                    onChangeText={setCommentText}
                  />
                  <TouchableOpacity onPress={() => handleCommentPost(post._id)}>
                    <Ionicons name="send-outline" size={20} color="#007B83" />
                  </TouchableOpacity>
                </View>
              )}

              {post.comments?.map((c, index) => (
                <View key={index} style={styles.commentCard}>
                  <Text style={styles.commentText}>
                    <Text style={styles.commentUser}>{c.userName}: </Text>
                    {c.content}
                  </Text>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 30) : 60,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  logoutBtn: {
    backgroundColor: '#FF6B6B',
    padding: 10,
    borderRadius: 25,
  },
  createPost: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f1f1f1',
    borderRadius: 12,
    padding: 10,
    textAlignVertical: 'top',
    minHeight: 60,
    marginBottom: 10,
  },
  postButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#9CE8EA',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  postButtonText: {
    fontWeight: '700',
    color: '#000',
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  postTime: {
    fontSize: 12,
    color: '#777',
  },
  postContent: {
    fontSize: 15,
    color: '#333',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerButton: {
    backgroundColor: '#f1f1f1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  footerText: {
    fontWeight: '600',
    color: '#444',
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f6f6',
    borderRadius: 12,
    padding: 8,
    marginTop: 10,
  },
  commentTextInput: {
    flex: 1,
    paddingHorizontal: 10,
  },
  commentCard: {
    backgroundColor: '#f3f3f3',
    borderRadius: 12,
    padding: 8,
    marginTop: 8,
  },
  commentUser: {
    fontWeight: 'bold',
    color: '#007B83',
  },
  commentText: {
    color: '#333',
  },
  noPostsText: {
    textAlign: 'center',
    fontSize: 15,
    color: '#555',
    marginTop: 30,
  },
});
