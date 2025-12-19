import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { theme } from '../app/theme';
import { formatNumber } from '../utils/format';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 3;

const ProfileGrid = ({ videos, onVideoPress, stats, isCurrentUser = false }) => {
  const renderVideoItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.videoItem}
      onPress={() => onVideoPress?.(item.id)}
    >
      <View style={styles.videoThumbnail}>
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder} />
        )}
        
        <View style={styles.videoOverlay}>
          <View style={styles.videoStats}>
            <Ionicons name="play" size={12} color={theme.colors.text} />
            <Text style={styles.statText}>{formatNumber(item.views || 0)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{formatNumber(stats?.videos || 0)}</Text>
        <Text style={styles.statLabel}>Videos</Text>
      </View>
      
      <View style={styles.statDivider} />
      
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{formatNumber(stats?.followers || 0)}</Text>
        <Text style={styles.statLabel}>Followers</Text>
      </View>
      
      <View style={styles.statDivider} />
      
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{formatNumber(stats?.following || 0)}</Text>
        <Text style={styles.statLabel}>Following</Text>
      </View>
      
      <View style={styles.statDivider} />
      
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>
          {stats?.earnings ? `${parseFloat(stats.earnings).toFixed(1)}K` : '0'}
        </Text>
        <Text style={styles.statLabel}>BLURT</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderStats()}
      
      {videos.length > 0 ? (
        <FlatList
          data={videos}
          renderItem={renderVideoItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons
            name="videocam-outline"
            size={64}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.emptyText}>
            {isCurrentUser ? 'Upload your first video!' : 'No videos yet'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    color: theme.colors.primary,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  statLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.glassBorder,
  },
  gridContent: {
    paddingHorizontal: theme.spacing.sm,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  videoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE * 1.5,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceLight,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceLight,
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  videoStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: theme.colors.text,
    fontSize: 10,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
});

export default ProfileGrid;