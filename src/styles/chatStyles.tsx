import { StyleSheet, Platform, StatusBar } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0fcfb',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! : 0,
  },
  topBar: {
    width: '100%',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 15,
  },
  messagesContainer: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingVertical: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 20,
    padding: 10,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  theirMessage: {
    backgroundColor: '#e5f6f5',
    alignSelf: 'flex-start',
  },
  myMessage: {
    backgroundColor: '#a8edea',
    alignSelf: 'flex-end',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  theirMessageText: {
    color: '#333',
  },
  myMessageText: {
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    marginHorizontal: 10,
    marginBottom: Platform.OS === 'ios' ? 3 : 2, // 👈 bem próximo do fundo
    paddingHorizontal: 10,
    paddingVertical: 4, // 👈 padding pequeno para deixar compacto
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 3, // 👈 padding inferior bem pequeno
    paddingHorizontal: 6,
  },
  sendButton: {
    backgroundColor: '#a8edea',
    borderRadius: 20,
    padding: 6,
    marginLeft: 6,
  },
    sendButtonDisabled: {
      backgroundColor: '#a0a0a0',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
      padding: 20,
    },
    errorText: {
      color: '#ff6b6b',
      textAlign: 'center',
      fontSize: 16,
      lineHeight: 22,
    },
});
