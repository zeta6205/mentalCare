import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  TouchableOpacity,
  Text,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';

const { width } = Dimensions.get('window');
const numColumns = 3;
const imageSize = width / numColumns - 4; // espaço entre imagens

const mockData = Array.from({ length: 30 }).map((_, i) => ({
  id: i.toString(),
  uri: `https://picsum.photos/id/${i + 10}/200/200`,
}));

const SearchScreen = () => {
  const [searchText, setSearchText] = useState('');

  const filteredData = mockData.filter((item) =>
    item.id.includes(searchText)
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Barra de pesquisa */}
        <View style={styles.searchBar}>
          <TextInput
            style={styles.input}
            placeholder="Pesquisar"
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#888"
          />
        </View>

        {/* Grid de imagens */}
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          renderItem={({ item }) => (
            <TouchableOpacity>
              <Image source={{ uri: item.uri }} style={styles.image} />
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
          showsVerticalScrollIndicator={false}
        />

        {filteredData.length === 0 && (
          <View style={styles.noResults}>
            <Text>Nenhum resultado encontrado</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0fcfb',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 20 : 40,
  },
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  searchBar: {
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  input: {
    fontSize: 16,
    color: '#333',
  },
  image: {
    width: imageSize,
    height: imageSize,
    margin: 1,
    borderRadius: 10,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
});
