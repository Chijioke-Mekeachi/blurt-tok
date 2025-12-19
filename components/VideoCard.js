// components/VideoCard.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../app/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';

const { width, height } = Dimensions.get('window');

const VideoCard = ({ 
  video, 
  onPress, 
  onProfilePress,
  onComment,
  onReward,
  onShare,
  onLike,
  autoPlay = false,
  isActive = false,
  username,
  displayName,
  avatarUrl
}) => {
  const [isLiked, setIsLiked] = useState(video?.is_liked || false);
  const [likeCount, setLikeCount] = useState(video?.like_count || 0);
  const [commentCount, setCommentCount] = useState(video?.comment_count || 0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [showDescription, setShowDescription] = useState(false);
  
  const videoRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive && autoPlay) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [isActive, autoPlay]);

  useEffect(() => {
    // Animation for new video load
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for engagement buttons
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleLike = () => {
    const newLikeState = !isLiked;
    setIsLiked(newLikeState);
    setLikeCount(prev => newLikeState ? prev + 1 : prev - 1);
    
    // Animation for like button
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (onLike) {
      onLike(video.id, newLikeState);
    }
  };

  const handleProfilePress = () => {
    if (username && onProfilePress) {
      onProfilePress(username);
    } else if (username) {
      // Default navigation if no callback provided
      router.push(`/profile/${username}`);
    }
  };

  const handleComment = () => {
    if (onComment) {
      onComment(video.id);
    } else {
      router.push(`/comments/${video.id}`);
    }
  };

  const handleReward = () => {
    if (onReward) {
      onReward(video);
    } else {
      Alert.alert(
        'Send Reward',
        `Reward @${username} for this video?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Send BLURT', 
            onPress: () => {
              router.push({
                pathname: '/wallet',
                params: { transferTo: username }
              });
            }
          }
        ]
      );
    }
  };

  const handleShare = async () => {
    if (onShare) {
      onShare(video);
    }
  };

  const toggleDescription = () => {
    setShowDescription(!showDescription);
  };

  const handleVideoPress = () => {
    if (onPress) {
      onPress(video.id);
    } else {
      router.push(`/video/${video.id}`);
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Video Player */}
      <TouchableOpacity 
        style={styles.videoContainer}
        activeOpacity={0.9}
        onPress={handleVideoPress}
      >
        {video?.video_url ? (
          <Video
            ref={videoRef}
            source={{ uri: video.video_url }}
            style={styles.video}
            resizeMode="cover"
            shouldPlay={isPlaying}
            isLooping
            isMuted={false}
          />
        ) : (
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.3)', 'rgba(99, 102, 241, 0.2)']}
            style={styles.videoPlaceholder}
          >
            <Ionicons name="videocam" size={60} color="rgba(255, 255, 255, 0.5)" />
            <Text style={styles.placeholderText}>Video Preview</Text>
          </LinearGradient>
        )}
        
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.3)']}
          style={styles.videoOverlay}
          pointerEvents="none"
        />
        
        {/* User Info Overlay */}
        <View style={styles.userInfoContainer}>
          <TouchableOpacity 
            style={styles.userInfo}
            onPress={handleProfilePress}
            activeOpacity={0.7}
          >
            {avatarUrl ? (
              <Image 
                source={{ uri: avatarUrl }} 
                style={styles.userAvatar} 
              />
            ) : (
              <View style={styles.userAvatarPlaceholder}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
            )}
            <View style={styles.userTextContainer}>
              <Text style={styles.displayName} numberOfLines={1}>
                {displayName || username || 'Anonymous'}
              </Text>
              <Text style={styles.username} numberOfLines={1}>
                @{username || 'anonymous'}
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.followButton}
            onPress={handleProfilePress}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.8)', 'rgba(99, 102, 241, 0.8)']}
              style={styles.followButtonGradient}
            >
              <Ionicons name="person-add" size={14} color="#fff" />
              <Text style={styles.followText}>View</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {/* Video Description */}
        <TouchableOpacity 
          style={styles.descriptionContainer}
          onPress={toggleDescription}
          activeOpacity={0.8}
        >
          <Text style={styles.videoTitle} numberOfLines={showDescription ? undefined : 2}>
            {video?.title || 'Untitled Video'}
          </Text>
          {video?.description && (
            <Text style={styles.videoDescription} numberOfLines={showDescription ? undefined : 2}>
              {video.description}
            </Text>
          )}
          {video?.hashtags && (
            <Text style={styles.hashtags} numberOfLines={1}>
              {video.hashtags}
            </Text>
          )}
        </TouchableOpacity>
        
        {/* Engagement Buttons */}
        <View style={styles.engagementButtons}>
          {/* Like Button */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity 
              style={styles.engagementButton}
              onPress={handleLike}
              activeOpacity={0.7}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <LinearGradient
                  colors={isLiked ? ['#ef4444', '#dc2626'] : ['rgba(239, 68, 68, 0.3)', 'rgba(220, 38, 38, 0.2)']}
                  style={styles.engagementButtonGradient}
                >
                  <Ionicons 
                    name={isLiked ? "heart" : "heart-outline"} 
                    size={24} 
                    color={isLiked ? "#fff" : "rgba(255, 255, 255, 0.9)"}
                  />
                </LinearGradient>
              </Animated.View>
              <Text style={styles.engagementCount}>{formatNumber(likeCount)}</Text>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Comment Button */}
          <TouchableOpacity 
            style={styles.engagementButton}
            onPress={handleComment}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.3)', 'rgba(99, 102, 241, 0.2)']}
              style={styles.engagementButtonGradient}
            >
              <Ionicons name="chatbubble-outline" size={24} color="rgba(255, 255, 255, 0.9)" />
            </LinearGradient>
            <Text style={styles.engagementCount}>{formatNumber(commentCount)}</Text>
          </TouchableOpacity>
          
          {/* Reward Button */}
          <TouchableOpacity 
            style={styles.engagementButton}
            onPress={handleReward}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['rgba(245, 158, 11, 0.3)', 'rgba(217, 119, 6, 0.2)']}
              style={styles.engagementButtonGradient}
            >
              <Ionicons name="flash" size={24} color="rgba(255, 255, 255, 0.9)" />
            </LinearGradient>
            <Text style={styles.engagementCount}>Reward</Text>
          </TouchableOpacity>
          
          {/* Share Button */}
          <TouchableOpacity 
            style={styles.engagementButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['rgba(16, 185, 129, 0.3)', 'rgba(5, 150, 105, 0.2)']}
              style={styles.engagementButtonGradient}
            >
              <Ionicons name="share-social-outline" size={24} color="rgba(255, 255, 255, 0.9)" />
            </LinearGradient>
            <Text style={styles.engagementCount}>Share</Text>
          </TouchableOpacity>
        </View>
        
        {/* Play/Pause Indicator */}
        {!isPlaying && isActive && (
          <View style={styles.playIndicator}>
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.8)', 'rgba(99, 102, 241, 0.8)']}
              style={styles.playIndicatorGradient}
            >
              <Ionicons name="play" size={40} color="#fff" />
            </LinearGradient>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height,
    backgroundColor: theme.colors.background,
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '600',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  userInfoContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 24,
    padding: 8,
    paddingRight: 16,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  userAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  userTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  displayName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  username: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  followButton: {
    marginLeft: 12,
  },
  followButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  followText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 120,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 16,
    padding: 16,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    lineHeight: 24,
  },
  videoDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  hashtags: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  engagementButtons: {
    position: 'absolute',
    right: 20,
    bottom: 120,
    alignItems: 'center',
    gap: 24,
  },
  engagementButton: {
    alignItems: 'center',
  },
  engagementButtonGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  engagementCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  playIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -40,
    marginTop: -40,
  },
  playIndicatorGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});

export default VideoCard;