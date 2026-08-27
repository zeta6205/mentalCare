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
import { EmptyState } from '../components/ui/EmptyState';
import { GlassSurface } from '../components/ui/GlassSurface';
import { colors, radius, sizes, spacing, typography } from '../theme';

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
        <GlassSurface style={styles.searchBar}>
          <TextInput
            style={styles.input}
            placeholder="Pesquisar"
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#888"
          />
        </GlassSurface>

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
          contentContainerStyle={{ paddingBottom: sizes.bottomTabBarReservedSpace, paddingTop: 10 }}
          showsVerticalScrollIndicator={false}
        />

        {filteredData.length === 0 && (
          <EmptyState title="Nenhum resultado encontrado" description="Tente outro termo para explorar a comunidade." />
        )}
      </View>
    </SafeAreaView>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 20 : 40,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  searchBar: {
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
  },
  image: {
    width: imageSize,
    height: imageSize,
    margin: spacing.xxs / 4,
    borderRadius: radius.input,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
});
