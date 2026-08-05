import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Linking,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../api/apiService';
import { CosmicBackground } from '../components/CosmicBackground';
import { Toast } from '../components/Toast';
import { COLORS, SHADOWS } from '../styles/theme';

export const HistoryScreen = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // newest, oldest
  const [sheetsUrl, setSheetsUrl] = useState('');
  
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setToastVisible(true);
  };

  const fetchHistory = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const response = await apiService.getHistory();
      setPosts(response.posts || []);
    } catch (err) {
      console.error(err);
      showToast("We couldn't load your generated posts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSheetsUrl = async () => {
    try {
      const response = await apiService.getSheetsUrl();
      setSheetsUrl(response.url);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchSheetsUrl();
  }, []);

  const handleCopyCaption = async (caption) => {
    await Clipboard.setStringAsync(caption);
    showToast('Caption copied!');
  };

  const handleOpenSheets = () => {
    if (sheetsUrl) {
      Linking.openURL(sheetsUrl).catch((err) => {
        console.error(err);
        showToast('Could not open Sheets URL');
      });
    }
  };

  const handleExport = (type, post) => {
    let url = '';
    if (type === 'png') {
      url = post.imageUrl;
    } else {
      url = apiService.getDownloadUrl(type, post);
    }

    if (url) {
      Linking.openURL(url)
        .then(() => showToast(`Starting ${type.toUpperCase()} export...`))
        .catch((err) => {
          console.error(err);
          showToast(`Could not open download link for ${type}`);
        });
    }
  };

  // Filter and sort items
  const filteredPosts = posts
    .filter(post => 
      post.imageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.caption.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const renderPostCard = ({ item }) => {
    return (
      <View style={[styles.card, SHADOWS.glass]}>
        <View style={styles.cardHeader}>
          <View style={styles.thumbnailWrapper}>
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.thumbnail}
              contentFit="cover"
            />
          </View>

          <View style={styles.metaCol}>
            <View style={styles.titleRow}>
              <Text style={styles.filename} numberOfLines={1} ellipsizeMode="tail">
                {item.imageName}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={12} color={COLORS.spacePink} />
              <Text style={styles.dateText}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.caption} numberOfLines={3} ellipsizeMode="tail">
          {item.caption}
        </Text>

        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => handleCopyCaption(item.caption)}
          >
            <Ionicons name="copy-outline" size={14} color={COLORS.spaceBlue} />
            <Text style={styles.actionBtnText}>Copy</Text>
          </TouchableOpacity>

          <View style={styles.exportsRow}>
            <TouchableOpacity style={styles.exportBadge} onPress={() => handleExport('png', item)}>
              <Text style={styles.exportBadgeText}>PNG</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBadge} onPress={() => handleExport('pdf', item)}>
              <Text style={styles.exportBadgeText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBadge} onPress={() => handleExport('docx', item)}>
              <Text style={styles.exportBadgeText}>Word</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <CosmicBackground>
      <Toast message={toastMsg} visible={toastVisible} onHide={() => setToastVisible(false)} />

      <View style={styles.container}>
        
        {/* Page title / controls */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Your Saved Posts</Text>
            <Text style={styles.subtitle}>Copy captions or export document reports.</Text>
          </View>

          {sheetsUrl ? (
            <TouchableOpacity style={styles.sheetsBtn} onPress={handleOpenSheets}>
              <Ionicons name="logo-google" size={14} color={COLORS.spaceBlue} />
              <Text style={styles.sheetsBtnText}>Sheet</Text>
              <Ionicons name="open-outline" size={12} color={COLORS.spaceBlue} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Search & Sort Filters */}
        <View style={[styles.filterBar, SHADOWS.glass]}>
          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={16} color={COLORS.slate500} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search posts..."
              placeholderTextColor={COLORS.slate500}
              style={styles.searchInput}
            />
          </View>

          <View style={styles.sortWrapper}>
            <TouchableOpacity
              onPress={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              style={styles.sortBtn}
            >
              <Ionicons 
                name={sortOrder === 'newest' ? 'arrow-down' : 'arrow-up'} 
                size={14} 
                color={COLORS.spacePink} 
              />
              <Text style={styles.sortText}>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main List */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.spacePink} />
          </View>
        ) : (
          <FlatList
            data={filteredPosts}
            renderItem={renderPostCard}
            keyExtractor={(item) => item.id || item.generationId || Math.random().toString()}
            contentContainerStyle={styles.list}
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchHistory(false);
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="file-tray-outline" size={48} color={COLORS.slate500} />
                <Text style={styles.emptyTitle}>No Posts Found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery ? 'Adjust your search parameters.' : 'Your approved posts will appear here.'}
                </Text>
              </View>
            }
          />
        )}

      </View>
    </CosmicBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.slate400,
    marginTop: 2,
  },
  sheetsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 5,
  },
  sheetsBtnText: {
    color: COLORS.spaceBlue,
    fontSize: 12,
    fontWeight: '600',
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.glassBg,
    borderColor: COLORS.glassBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
    marginBottom: 16,
    gap: 12,
    alignItems: 'center',
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 22, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    fontSize: 13,
  },
  sortWrapper: {
    justifyContent: 'center',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 114, 182, 0.08)',
    borderColor: 'rgba(244, 114, 182, 0.2)',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
  sortText: {
    color: COLORS.spacePink,
    fontSize: 11,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.glassBg,
    borderColor: COLORS.glassBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnailWrapper: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(10, 10, 22, 0.4)',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  metaCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filename: {
    color: COLORS.slate100,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dateText: {
    color: COLORS.slate500,
    fontSize: 10,
  },
  caption: {
    color: COLORS.slate300,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    backgroundColor: 'rgba(10, 10, 22, 0.2)',
    padding: 8,
    borderRadius: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopColor: COLORS.glassBorder,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnText: {
    color: COLORS.spaceBlue,
    fontSize: 11,
    fontWeight: '600',
  },
  exportsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  exportBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: COLORS.glassBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  exportBadgeText: {
    color: COLORS.slate300,
    fontSize: 10,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.slate300,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 4,
    textAlign: 'center',
  },
});
export default HistoryScreen;
