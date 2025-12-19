import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import HUDOverlay from '../../components/HUDOverlay';
import NeonButton from '../../components/NeonButton';
import { useVideo } from '../../hooks/useVideo';
import { useWallet } from '../../hooks/useWallet';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabaseClient';
import { theme } from '../theme';
import { formatNumber, formatBLURT, formatTimeAgo } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = width * 1.777;

export default function VideoDetailScreen() {
  const { id } = useLocalSearchParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rewardAmount, setRewardAmount] = useState(1);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [userLiked, setUserLiked] = useState(false);
  
  const videoRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const { getVideoDetails, likeVideo } = useVideo();
  const { user } = useAuth();
  const { sendRewardToVideo, calculateFee, formatAmount } = useWallet(user?.username);

  useEffect(() => {
    loadVideoDetails();
  }, [id]);

  const loadVideoDetails = async () => {
    try {
      setLoading(true);
      const details = await getVideoDetails(id);
      setVideo(details);
    } catch (error) {
      console.error('Error loading video details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }

    try {
      setUserLiked(!userLiked);
      await likeVideo(id, user.id);
      
      // Update local state
      setVideo(prev => ({
        ...prev,
        likes_count: prev.likes_count + (userLiked ? -1 : 1),
      }));
    } catch (error) {
      console.error('Error liking video:', error);
      setUserLiked(!userLiked); // Revert on error
    }
  };

  const handleReward = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }

    if (!video?.blurt_tx || !video.user?.username) {
      Alert.alert('Error', 'Cannot send reward for this video');
      return;
    }

    const { fee, creatorAmount } = calculateFee(rewardAmount);
    
    Alert.alert(
      'Confirm Reward',
      `Send ${formatAmount(rewardAmount)} to @${video.user.username}?\n\n` +
      `Creator receives: ${formatAmount(creatorAmount)}\n` +
      `Platform fee (10%): ${formatAmount(fee)}\n\n` +
      `This transaction will be recorded on the Blurt blockchain.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SEND REWARD',
          style: 'destructive',
          onPress: async () => {
            const result = await sendRewardToVideo(
              video.user.username,
              video.blurt_tx,
              rewardAmount
            );

            if (result.success) {
              Alert.alert('Success!', 'Reward sent successfully');
              setShowRewardModal(false);
              loadVideoDetails(); // Refresh data
            } else {
              Alert.alert('Failed', result.error);
            }
          },
        },
      ]
    );
  };

  const handleComment = () => {
    router.push(`/comments/${id}`);
  };

  const handleProfilePress = () => {
    if (video?.user?.username) {
      router.push(`/profile/${video.user.username}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading video...</Text>
      </View>
    );
  }

  if (!video) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={64} color={theme.colors.error} />
        <Text style={styles.errorText}>Video not found</Text>
        <NeonButton
          title="GO BACK"
          onPress={() => router.back()}
          variant="secondary"
          style={styles.backButton}
        />
      </View>
    );
  }

  const rewardOptions = [0.1, 0.5, 1, 5, 10, 50];
  const { fee, creatorAmount } = calculateFee(rewardAmount);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Video Player */}
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{ uri: video.video_url || 'https://example.com/video.mp4' }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay={true}
          isLooping={true}
          useNativeControls
        />
        
        <HUDOverlay
          likes={video.likes_count || 0}
          comments={video.comments_count || 0}
          rewards={video.totalRewards || 0}
          onLike={handleLike}
          onComment={handleComment}
          onReward={() => setShowRewardModal(true)}
          userLiked={userLiked}
        />
      </View>

      {/* Video Info */}
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.profileInfo}
            onPress={handleProfilePress}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {video.user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View>
              <Text style={styles.username}>@{video.user?.username}</Text>
              <Text style={styles.timestamp}>
                {formatTimeAgo(video.created_at)}
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.followButton}>
            <Text style={styles.followText}>+ Follow</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.caption}>{video.caption}</Text>
        
        {video.tags && video.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {video.tags.map((tag, index) => (
              <Text key={index} style={styles.tag}>#{tag}</Text>
            ))}
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={20} color={theme.colors.error} />
            <Text style={styles.statValue}>{formatNumber(video.likes_count || 0)}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Ionicons name="chatbubble" size={20} color={theme.colors.primary} />
            <Text style={styles.statValue}>{formatNumber(video.commentCount || 0)}</Text>
            <Text style={styles.statLabel}>Comments</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Ionicons name="flash" size={20} color={theme.colors.warning} />
            <Text style={styles.statValue}>{formatNumber(video.totalRewards || 0)}</Text>
            <Text style={styles.statLabel}>BLURT</Text>
          </View>
        </View>

        {/* Reward Section */}
        <View style={styles.rewardSection}>
          <Text style={styles.sectionTitle}>SUPPORT CREATOR</Text>
          
          <View style={styles.rewardOptions}>
            {rewardOptions.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.rewardOption,
                  rewardAmount === amount && styles.rewardOptionActive,
                ]}
                onPress={() => setRewardAmount(amount)}
              >
                <Text
                  style={[
                    styles.rewardOptionText,
                    rewardAmount === amount && styles.rewardOptionTextActive,
                  ]}
                >
                  {amount} BLURT
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.rewardCustom}>
            <TextInput
              style={styles.rewardInput}
              value={rewardAmount.toString()}
              onChangeText={(text) => {
                const num = parseFloat(text) || 0;
                setRewardAmount(num > 0 ? num : 0);
              }}
              keyboardType="numeric"
              placeholder="Custom amount"
              placeholderTextColor={theme.colors.textMuted}
            />
            <Text style={styles.blurtText}>BLURT</Text>
          </View>
          
          <View style={styles.rewardBreakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Creator receives:</Text>
              <Text style={styles.breakdownValue}>
                {formatAmount(creatorAmount)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Platform fee (10%):</Text>
              <Text style={[styles.breakdownValue, { color: theme.colors.warning }]}>
                {formatAmount(fee)} → @trevorcodz
              </Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Total:</Text>
              <Text style={[styles.breakdownValue, { color: theme.colors.primary }]}>
                {formatAmount(rewardAmount)}
              </Text>
            </View>
          </View>
          
          <NeonButton
            title="SEND REWARD"
            onPress={handleReward}
            variant="accent"
            size="large"
            disabled={!user || rewardAmount <= 0}
            style={styles.rewardButton}
          />
          
          {!user && (
            <Text style={styles.authHint}>
              Login to send rewards
            </Text>
          )}
        </View>

        {/* Comments Preview */}
        <TouchableOpacity style={styles.commentsPreview} onPress={handleComment}>
          <Text style={styles.commentsTitle}>COMMENTS</Text>
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsCount}>
              {formatNumber(video.commentCount || 0)} comments
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.commentPreview}>
            <Ionicons name="chatbubble-outline" size={24} color={theme.colors.textSecondary} />
            <Text style={styles.commentPreviewText}>
              Tap to view and add comments
            </Text>
          </View>
        </TouchableOpacity>

        {/* Transaction Info */}
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionTitle}>BLOCKCHAIN TRANSACTION</Text>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Transaction ID:</Text>
            <Text style={styles.transactionValue} numberOfLines={1}>
              {video.blurt_tx || 'N/A'}
            </Text>
          </View>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Blockchain:</Text>
            <Text style={styles.transactionValue}>Blurt</Text>
          </View>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Storage:</Text>
            <Text style={[styles.transactionValue, { color: theme.colors.accent }]}>
              Permanent (On-chain)
            </Text>
          </View>
        </View>
      </View>

      {/* Scanline */}
      <View style={styles.scanline} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 20,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    width: 200,
  },
  videoContainer: {
    width: width,
    height: VIDEO_HEIGHT,
    backgroundColor: theme.colors.surfaceLight,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    color: theme.colors.background,
    fontSize: 20,
    fontWeight: 'bold',
  },
  username: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  timestamp: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary + '30',
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  followText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  caption: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: theme.spacing.lg,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.xl,
  },
  tag: {
    color: theme.colors.secondary,
    fontSize: 14,
    marginRight: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.glass,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginVertical: theme.spacing.xs,
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
  rewardSection: {
    backgroundColor: theme.colors.glass,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: theme.spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rewardOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.lg,
  },
  rewardOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  rewardOptionActive: {
    backgroundColor: theme.colors.accent + '20',
    borderColor: theme.colors.accent,
  },
  rewardOptionText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rewardOptionTextActive: {
    color: theme.colors.accent,
  },
  rewardCustom: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  rewardInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    paddingVertical: theme.spacing.md,
  },
  blurtText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
  rewardBreakdown: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  breakdownLabel: {
    color: theme.colors.text,
    fontSize: 14,
  },
  breakdownValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: theme.colors.glassBorder,
    marginVertical: theme.spacing.sm,
  },
  rewardButton: {
    marginBottom: theme.spacing.sm,
  },
  authHint: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  commentsPreview: {
    backgroundColor: theme.colors.glass,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  commentsTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  commentsCount: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  commentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  commentPreviewText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginLeft: theme.spacing.sm,
    fontStyle: 'italic',
  },
  transactionInfo: {
    backgroundColor: theme.colors.glass,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  transactionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: theme.spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  transactionLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  transactionValue: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
    marginLeft: theme.spacing.sm,
  },
  scanline: {
    height: 1,
    backgroundColor: theme.colors.primary,
    opacity: 0.3,
    marginVertical: theme.spacing.xl,
  },
});