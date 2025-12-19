// app/feed.js
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Platform,
  Share,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import VideoCard from '../components/VideoCard';
import { useFeed } from '../hooks/useFeed';
import { useAuth } from '../hooks/useAuth';
import { theme } from './theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { height, width } = Dimensions.get('window');

// Orange/Yellow and Pinkish Red gradient colors
const ORANGE_GRADIENT = ['#FF7B00', '#FFAA00'];
const PINK_RED_GRADIENT = ['#FF416C', '#FF4B2B'];
const WARM_PINK_GRADIENT = ['#FF6B95', '#FF8E53'];
const GOLD_GRADIENT = ['#FFD700', '#FFA500'];
const CORAL_GRADIENT = ['#FF6B6B', '#FFA8A8'];

export default function FeedScreen() {
  const [activeTab, setActiveTab] = useState('forYou');
  const [showHashtags, setShowHashtags] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  
  const forYouFeed = useFeed();
  const reelsFeed = useFeed('reels');
  
  const { feed, loading, refreshing, refreshFeed, loadMore, hasMore, currentHashtag, popularHashtags, loadHashtagFeed, clearHashtag } = 
    activeTab === 'forYou' ? forYouFeed : reelsFeed;
  
  const { user } = useAuth();
  
  const flatListRef = useRef(null);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    return () => {
      StatusBar.setBarStyle('dark-content');
    };
  }, []);

  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== undefined) {
      const newIndex = viewableItems[0].index;
      setActiveVideoIndex(newIndex);
    }
  }).current;

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 70,
    minimumViewTime: 100,
  };

  const renderVideo = useCallback(({ item, index }) => (
    <View style={styles.videoContainer}>
      <VideoCard
        video={item}
        onPress={(id) => router.push(`/video/${id}`)}
        onProfilePress={(username) => {
          if (username) {
            router.push(`/profile/${username}`);
          }
        }}
        onComment={(videoId) => router.push(`/comments/${videoId}`)}
        onReward={(video) => {
          console.log('Reward video:', item.id);
        }}
        onShare={async (video) => {
          try {
            await Share.share({
              message: `🔥 Check out this video on BlurtTok! ${video.video_url || 'https://blurttok.com/video/' + video.id}`,
              title: `🔥 Video by @${video.user?.username || 'blurttok'}`,
            });
          } catch (error) {
            console.log('Error sharing video:', error);
          }
        }}
        onLike={(videoId, liked) => {
          console.log(`Video ${videoId} ${liked ? 'liked' : 'unliked'}`);
        }}
        autoPlay={index === activeVideoIndex}
        isActive={index === activeVideoIndex}
        username={item.user?.username}
        displayName={item.user?.profile?.display_name}
      />
    </View>
  ), [activeVideoIndex]);

  const handleUpload = () => {
    router.push('/upload');
  };

  const handleProfile = () => {
    if (user?.username) {
      router.push(`/profile/${user.username}`);
    }
  };

  const handleDiscover = () => {
    setShowHashtags(!showHashtags);
  };

  const handleHashtagPress = (hashtag) => {
    if (activeTab !== 'reels') {
      setActiveTab('reels');
    }
    loadHashtagFeed(hashtag);
    setShowHashtags(false);
  };

  const handleClearHashtag = () => {
    clearHashtag();
    setActiveTab('forYou');
  };

  const handleTabPress = (tab) => {
    setActiveTab(tab);
    setShowHashtags(false);
    setActiveVideoIndex(0);
  };

  // FIXED: Use a combination of item.id and index to ensure unique keys
  const keyExtractor = useCallback((item, index) => {
    // If item has an id, use it with index to ensure uniqueness
    if (item.id) {
      return `${item.id}_${index}`;
    }
    // Fallback to index if no id, but still add prefix to avoid conflicts
    return `video_${index}_${Date.now()}`;
  }, []);

  const getItemLayout = useCallback((data, index) => ({
    length: height,
    offset: height * index,
    index,
  }), []);

  const HeaderComponent = () => (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={['rgba(20, 15, 10, 0.95)', 'rgba(25, 15, 10, 0.95)']}
        style={styles.header}
      >
        <TouchableOpacity onPress={handleProfile} style={styles.headerButton}>
          <LinearGradient
            colors={GOLD_GRADIENT}
            style={styles.avatarGradient}
          >
            {user?.username ? (
              <Text style={styles.avatarText}>
                {user.username.charAt(0).toUpperCase()}
              </Text>
            ) : (
              <Ionicons name="person" size={18} color="#fff" />
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'forYou' && styles.activeTab]}
            onPress={() => handleTabPress('forYou')}
          >
            {activeTab === 'forYou' && (
              <LinearGradient
                colors={ORANGE_GRADIENT}
                style={styles.tabGradient}
              />
            )}
            <Ionicons 
              name="flame" 
              size={16} 
              color={activeTab === 'forYou' ? '#fff' : theme.colors.textSecondary} 
              style={styles.tabIcon}
            />
            <Text style={[styles.tabText, activeTab === 'forYou' && styles.activeTabText]}>
              For You
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'reels' && styles.activeTab]}
            onPress={() => handleTabPress('reels')}
          >
            {activeTab === 'reels' && (
              <LinearGradient
                colors={PINK_RED_GRADIENT}
                style={styles.tabGradient}
              />
            )}
            <Ionicons 
              name="play-circle" 
              size={16} 
              color={activeTab === 'reels' ? '#fff' : theme.colors.textSecondary} 
              style={styles.tabIcon}
            />
            <Text style={[styles.tabText, activeTab === 'reels' && styles.activeTabText]}>
              Reels
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity onPress={handleDiscover} style={styles.headerButton}>
          <LinearGradient
            colors={showHashtags ? WARM_PINK_GRADIENT : ['rgba(255, 107, 107, 0.2)', 'rgba(255, 142, 83, 0.2)']}
            style={styles.discoverButton}
          >
            <Ionicons 
              name="search" 
              size={20} 
              color={showHashtags ? '#fff' : theme.colors.orangeLight} 
            />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  const FooterComponent = () => {
    if (loading && feed.length === 0) {
      return (
        <View style={styles.initialLoading}>
          <LinearGradient
            colors={ORANGE_GRADIENT}
            style={styles.loadingSpinner}
          >
            <ActivityIndicator size="large" color="#fff" />
          </LinearGradient>
          <Text style={styles.initialLoadingText}>🔥 Loading from Blurt...</Text>
        </View>
      );
    }

    if (hasMore) {
      return (
        <View style={styles.loadingFooter}>
          <LinearGradient
            colors={CORAL_GRADIENT}
            style={styles.loadingDot}
          >
            <ActivityIndicator size="small" color="#fff" />
          </LinearGradient>
          <Text style={styles.loadingText}>Loading more videos...</Text>
        </View>
      );
    }

    if (feed.length > 0) {
      return (
        <View style={styles.endFooter}>
          <LinearGradient
            colors={GOLD_GRADIENT}
            style={styles.endIcon}
          >
            <Ionicons name="checkmark-done" size={32} color="#fff" />
          </LinearGradient>
          <Text style={styles.endText}>🔥 You're all caught up!</Text>
          <Text style={styles.endSubtext}>More hot content coming soon</Text>
        </View>
      );
    }

    return null;
  };

  const EmptyComponent = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyState}>
        <LinearGradient
          colors={WARM_PINK_GRADIENT}
          style={styles.emptyIcon}
        >
          <Ionicons name="videocam-off" size={64} color="#fff" />
        </LinearGradient>
        <Text style={styles.emptyTitle}>No videos available</Text>
        <Text style={styles.emptySubtitle}>
          {currentHashtag 
            ? `No #${currentHashtag} content yet`
            : 'Start exploring the blockchain'}
        </Text>
        <TouchableOpacity 
          style={styles.emptyButton}
          onPress={refreshFeed}
        >
          <LinearGradient
            colors={ORANGE_GRADIENT}
            style={styles.emptyButtonGradient}
          >
            <Text style={styles.emptyButtonText}>🔥 Refresh Feed</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const getHashtagColor = (index) => {
    const gradients = [
      ORANGE_GRADIENT,
      PINK_RED_GRADIENT,
      GOLD_GRADIENT,
      WARM_PINK_GRADIENT,
      CORAL_GRADIENT,
    ];
    return gradients[index % gradients.length];
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={feed}
        renderItem={renderVideo}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        pagingEnabled
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        refreshing={refreshing}
        onRefresh={refreshFeed}
        ListHeaderComponent={HeaderComponent}
        ListFooterComponent={FooterComponent}
        ListEmptyComponent={EmptyComponent}
        maxToRenderPerBatch={2}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={1}
      />
      
      {/* Fixed Header - Always visible */}
      <View style={styles.fixedHeader}>
        <HeaderComponent />
      </View>
      
      {/* Hashtags Drawer */}
      {showHashtags && (
        <LinearGradient
          colors={['rgba(30, 20, 15, 0.98)', 'rgba(25, 15, 10, 0.95)']}
          style={styles.hashtagsDrawer}
        >
          <View style={styles.hashtagsHeader}>
            <Text style={styles.hashtagsTitle}>🔥 Trending Now</Text>
            <TouchableOpacity 
              onPress={() => setShowHashtags(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.hashtagsContainer}>
            {popularHashtags.slice(0, 8).map((hashtag, index) => (
              <TouchableOpacity 
                key={`${hashtag.tag}_${index}`} // Fixed: Add index to ensure unique key
                style={styles.hashtagChip}
                onPress={() => handleHashtagPress(hashtag.tag)}
              >
                <LinearGradient
                  colors={getHashtagColor(index)}
                  style={styles.hashtagGradient}
                />
                <Ionicons 
                  name="pricetag" 
                  size={14} 
                  color="#fff" 
                  style={styles.hashtagIcon}
                />
                <Text style={styles.hashtagText}>#{hashtag.tag}</Text>
                <View style={styles.hashtagCount}>
                  <Text style={styles.hashtagCountText}>{hashtag.count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>
      )}

      {/* Upload Button Only */}
      <TouchableOpacity 
        style={styles.uploadButton}
        onPress={handleUpload}
      >
        <LinearGradient
          colors={ORANGE_GRADIENT}
          style={styles.uploadButtonGradient}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Bottom Navigation */}
      <LinearGradient
        colors={['rgba(30, 20, 15, 0.98)', 'rgba(25, 15, 10, 0.95)']}
        style={styles.bottomNav}
      >
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => handleTabPress('forYou')}
        >
          <Ionicons 
            name={activeTab === 'forYou' ? 'home' : 'home-outline'} 
            size={24} 
            color={activeTab === 'forYou' ? theme.colors.orangeLight : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.navLabel,
            activeTab === 'forYou' && styles.navLabelActive
          ]}>
            Home
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={handleDiscover}
        >
          <Ionicons 
            name={showHashtags ? 'compass' : 'compass-outline'} 
            size={24} 
            color={showHashtags ? theme.colors.orangeLight : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.navLabel,
            showHashtags && styles.navLabelActive
          ]}>
            Discover
          </Text>
        </TouchableOpacity>
        
        <View style={styles.navSpacer} />
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={theme.colors.textSecondary} />
          <View style={styles.notificationBadge}>
            <LinearGradient
              colors={PINK_RED_GRADIENT}
              style={styles.notificationGradient}
            >
              <Text style={styles.notificationBadgeText}>3</Text>
            </LinearGradient>
          </View>
          <Text style={styles.navLabel}>Alerts</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={handleProfile}
        >
          <Ionicons name="person-outline" size={24} color={theme.colors.textSecondary} />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Current Video Indicator */}
      {feed.length > 1 && (
        <LinearGradient
          colors={['rgba(255, 123, 0, 0.8)', 'rgba(255, 65, 108, 0.8)']}
          style={styles.videoIndicator}
        >
          <Text style={styles.videoIndicatorText}>
            🔥 {activeVideoIndex + 1} / {feed.length}
          </Text>
        </LinearGradient>
      )}

      {/* Network Indicator */}
      {currentHashtag && (
        <TouchableOpacity 
          style={styles.networkIndicator}
          onPress={handleClearHashtag}
        >
          <LinearGradient
            colors={WARM_PINK_GRADIENT}
            style={styles.networkGradient}
          >
            <View style={styles.networkDot} />
            <Text style={styles.networkText}>#{currentHashtag}</Text>
            <Ionicons name="close" size={14} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerContainer: {
    position: 'relative',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  videoContainer: {
    height: height,
    width: width,
  },
  // Header - Fixed version
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 123, 0, 0.3)',
  },
  headerButton: {
    padding: theme.spacing.sm,
  },
  avatarGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 20, 15, 0.7)',
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 123, 0, 0.2)',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    position: 'relative',
    overflow: 'hidden',
  },
  tabGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  activeTab: {
    overflow: 'hidden',
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
  },
  discoverButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 123, 0, 0.3)',
  },
  // Hashtags Drawer
  hashtagsDrawer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 140 : 130,
    left: 0,
    right: 0,
    padding: theme.spacing.lg,
    zIndex: 99,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 123, 0, 0.3)',
  },
  hashtagsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  hashtagsTitle: {
    color: theme.colors.orangeLight,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: theme.spacing.xs,
    backgroundColor: 'rgba(255, 123, 0, 0.1)',
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 123, 0, 0.3)',
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  hashtagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 123, 0, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  hashtagGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  hashtagIcon: {
    marginLeft: theme.spacing.md,
    marginRight: theme.spacing.sm,
    zIndex: 1,
  },
  hashtagText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    zIndex: 1,
  },
  hashtagCount: {
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.md,
    zIndex: 1,
  },
  hashtagCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  // Upload Button Only
  uploadButton: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: 100,
    borderRadius: 24,
    overflow: 'hidden',
    zIndex: 90,
    shadowColor: '#FF7B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  uploadButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 170, 0, 0.7)',
  },
  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 123, 0, 0.3)',
    zIndex: 95,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    position: 'relative',
  },
  navLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  navLabelActive: {
    color: theme.colors.orangeLight,
    fontWeight: '700',
  },
  navSpacer: {
    width: 60,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: '25%',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    overflow: 'hidden',
  },
  notificationGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  // Video Indicator
  videoIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 150 : 140,
    right: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    zIndex: 80,
    borderWidth: 1,
    borderColor: 'rgba(255, 123, 0, 0.3)',
  },
  videoIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  // Loading and Empty States
  initialLoading: {
    height: height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: 'rgba(255, 170, 0, 0.5)',
  },
  initialLoadingText: {
    color: theme.colors.orangeLight,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingFooter: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  loadingDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  endFooter: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  endIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  endText: {
    color: theme.colors.orangeLight,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  endSubtext: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  emptyState: {
    height: height * 0.7,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    borderWidth: 2,
    borderColor: 'rgba(255, 123, 0, 0.3)',
  },
  emptyTitle: {
    color: theme.colors.orangeLight,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  emptyButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    minWidth: 200,
    shadowColor: '#FF7B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  emptyButtonGradient: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Network Indicator
  networkIndicator: {
    position: 'absolute',
    top: 160,
    left: theme.spacing.lg,
    zIndex: 80,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#FF416C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  networkGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    shadowColor: '#FF416C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  networkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
});