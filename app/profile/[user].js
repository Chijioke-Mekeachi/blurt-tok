// app/profile.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  Modal,
  ActionSheetIOS,
  Platform,
  RefreshControl,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabaseClient';
import { getUserProfile, followUser, checkIfFollowing } from '../../services/supabaseService';
import { useWallet } from '../../hooks/useWallet';
import NeonButton from '../../components/NeonButton';
import { theme } from '../theme';
import { formatNumber, formatTimeAgo } from '../../utils/format';
import { pickImage, takePhoto, getDefaultAvatarUrl } from '../../services/avatarService';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = height * 0.3;

export default function ProfileScreen() {
  const { user: profileUsername } = useLocalSearchParams();
  const { user: currentUser, updateProfile, updateAvatar } = useAuth();
  
  // Use wallet for current user or viewing user (fix for non-existent users)
  const walletUsername = profileUsername || currentUser?.username;
  const {
    balance,
    formatAmount,
    loading: walletLoading,
    refresh: refreshWallet,
    transactions = [],
    pendingDeposits,
  } = useWallet(walletUsername);
  
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    video_count: 0,
    follower_count: 0,
    following_count: 0,
    total_earnings: 0,
    total_likes: 0,
    total_comments: 0
  });
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileExists, setProfileExists] = useState(true);
  
  const [editForm, setEditForm] = useState({
    display_name: '',
    bio: '',
    location: '',
    website: '',
    twitter_username: '',
    instagram_username: '',
    tiktok_username: '',
  });
  
  const [avatarLoading, setAvatarLoading] = useState(false);
  
  const isCurrentUser = currentUser?.username === profileUsername;

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Balance pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating animation for particles
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    loadProfile();
  }, [profileUsername]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setProfileExists(true);
      
      // Load profile from Supabase
      const profileData = await getUserProfile(profileUsername);
      
      if (profileData) {
        setProfile(profileData);
        setStats({
          video_count: profileData.video_count || 0,
          follower_count: profileData.follower_count || 0,
          following_count: profileData.following_count || 0,
          total_earnings: profileData.total_earnings || 0,
          total_likes: profileData.total_likes || 0,
          total_comments: profileData.total_comments || 0
        });

        // Check if current user is following this profile
        if (currentUser && !isCurrentUser) {
          const following = await checkIfFollowing(currentUser.id, profileUsername);
          setIsFollowing(following);
        }
      } else {
        // Profile doesn't exist
        setProfileExists(false);
        setProfile({
          username: profileUsername,
          display_name: profileUsername,
          avatar_url: getDefaultAvatarUrl(profileUsername),
          created_at: new Date().toISOString(),
          bio: '',
          location: '',
          website: '',
          twitter_username: '',
          instagram_username: '',
          tiktok_username: '',
          video_count: 0,
          follower_count: 0,
          following_count: 0,
          total_earnings: 0,
          total_likes: 0,
          total_comments: 0
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfileExists(false);
      setProfile({
        username: profileUsername,
        display_name: profileUsername,
        avatar_url: getDefaultAvatarUrl(profileUsername),
        created_at: new Date().toISOString(),
        bio: '',
        location: '',
        website: '',
        twitter_username: '',
        instagram_username: '',
        tiktok_username: '',
        video_count: 0,
        follower_count: 0,
        following_count: 0,
        total_earnings: 0,
        total_likes: 0,
        total_comments: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadProfile(),
      refreshWallet(),
    ]);
    setRefreshing(false);
  };

  const handleFollow = async () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login to follow users');
      router.push('/auth');
      return;
    }
    
    try {
      const result = await followUser(currentUser.id, profileUsername);
      if (result.success) {
        setIsFollowing(result.following);
        
        // Update follower count
        setStats(prev => ({
          ...prev,
          follower_count: result.following 
            ? prev.follower_count + 1 
            : Math.max(0, prev.follower_count - 1)
        }));
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSendReward = () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login to send rewards');
      router.push('/auth');
      return;
    }
    
    Alert.alert(
      'Send Reward',
      `Send BLURT to @${profileUsername}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: () => {
            router.push({
              pathname: '/wallet',
              params: { transferTo: profileUsername }
            });
          }
        }
      ]
    );
  };

  const showAvatarOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleTakePhoto();
          } else if (buttonIndex === 2) {
            handlePickImage();
          }
        }
      );
    } else {
      setAvatarModalVisible(true);
    }
  };

  const handlePickImage = async () => {
    try {
      const image = await pickImage();
      if (image) {
        await handleAvatarUpload(image);
      }
      setAvatarModalVisible(false);
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const image = await takePhoto();
      if (image) {
        await handleAvatarUpload(image);
      }
      setAvatarModalVisible(false);
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', error.message || 'Failed to take photo');
    }
  };

  const handleAvatarUpload = async (image) => {
    try {
      setAvatarLoading(true);
      const result = await updateAvatar(image);
      if (result.success) {
        Alert.alert('Success', 'Profile photo updated successfully');
        loadProfile();
      } else {
        Alert.alert('Error', 'Failed to update profile photo');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', error.message || 'Failed to upload image');
    } finally {
      setAvatarLoading(false);
    }
  };

  const openEditModal = () => {
    if (currentUser?.profile) {
      setEditForm({
        display_name: currentUser.profile.display_name || '',
        bio: currentUser.profile.bio || '',
        location: currentUser.profile.location || '',
        website: currentUser.profile.website || '',
        twitter_username: currentUser.profile.twitter_username || '',
        instagram_username: currentUser.profile.instagram_username || '',
        tiktok_username: currentUser.profile.tiktok_username || '',
      });
    }
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    try {
      const result = await updateProfile(editForm);
      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully');
        setEditModalVisible(false);
        loadProfile();
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Calculate total balance
  const getTotalBalance = () => {
    if (walletLoading) return 0;
    return (balance?.available || 0) + (balance?.rewards || 0);
  };

  const renderAvatar = () => {
    if (profile?.avatar_url) {
      return (
        <Image 
          source={{ uri: profile.avatar_url }} 
          style={styles.avatarImage}
        />
      );
    }
    return (
      <View style={styles.avatarPlaceholder}>
        <Ionicons name="person" size={48} color="#fff" />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[theme.colors.background, '#0f172a']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingCard}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons name="person-circle" size={80} color={theme.colors.primary} />
          </Animated.View>
          <Text style={styles.loadingTitle}>Loading Profile</Text>
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loadingSpinner} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.dummyContainer}>
        <LinearGradient
          colors={[theme.colors.background, '#0f172a']}
          style={StyleSheet.absoluteFill}
        />
        <ScrollView contentContainerStyle={styles.dummyScrollContent}>
          {/* Header with Back Button */}
          <View style={styles.dummyHeader}>
            <TouchableOpacity 
              style={styles.dummyBackButton}
              onPress={() => router.back()}
            >
              <LinearGradient
                colors={['rgba(30, 41, 59, 0.8)', 'rgba(15, 23, 42, 0.9)']}
                style={styles.dummyBackButtonGradient}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.dummyHeaderTitle}>Profile</Text>
          </View>

          {/* Dummy User Content */}
          <View style={styles.dummyContent}>
            <View style={styles.dummyAvatarContainer}>
              <View style={styles.dummyAvatar}>
                <Ionicons name="help-circle" size={60} color={theme.colors.textSecondary} />
              </View>
            </View>
            
            <Text style={styles.dummyUsername}>@{profileUsername}</Text>
            <Text style={styles.dummyTitle}>This is a dummy user</Text>
            
            <Text style={styles.dummyText}>
              This user doesn't have a profile yet or doesn't exist in the database.
              You can't follow or send rewards to this user.
            </Text>
            
            {/* Dummy Stats */}
            <View style={styles.dummyStats}>
              <View style={styles.dummyStatItem}>
                <Text style={styles.dummyStatNumber}>0</Text>
                <Text style={styles.dummyStatLabel}>Videos</Text>
              </View>
              
              <View style={styles.dummyStatItem}>
                <Text style={styles.dummyStatNumber}>0</Text>
                <Text style={styles.dummyStatLabel}>Followers</Text>
              </View>
              
              <View style={styles.dummyStatItem}>
                <Text style={styles.dummyStatNumber}>0</Text>
                <Text style={styles.dummyStatLabel}>Following</Text>
              </View>
              
              <View style={styles.dummyStatItem}>
                <Text style={styles.dummyStatNumber}>0</Text>
                <Text style={styles.dummyStatLabel}>Earned</Text>
              </View>
            </View>
            
            {/* Empty Videos Section */}
            <View style={styles.dummyVideosSection}>
              <Text style={styles.dummyVideosTitle}>VIDEOS</Text>
              <View style={styles.dummyVideosEmpty}>
                <Ionicons name="videocam-off" size={48} color={theme.colors.textSecondary} />
                <Text style={styles.dummyVideosEmptyTitle}>No videos here</Text>
                <Text style={styles.dummyVideosEmptyText}>
                  This user hasn't posted any videos yet
                </Text>
              </View>
            </View>
            
            {/* Back Button */}
            <TouchableOpacity 
              style={styles.dummyActionButton}
              onPress={() => router.back()}
            >
              <LinearGradient
                colors={[theme.colors.primary, '#8b5cf6']}
                style={styles.dummyActionButtonGradient}
              >
                <Text style={styles.dummyActionButtonText}>Go Back</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const totalBalance = getTotalBalance();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Animated Background */}
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#334155']}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            title="Updating..."
            titleColor={theme.colors.primary}
          />
        }
      >
        {/* Cover Image */}
        <Animated.View 
          style={[
            styles.coverContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {profile.cover_url ? (
            <Image 
              source={{ uri: profile.cover_url }} 
              style={styles.coverImage}
              blurRadius={5}
            />
          ) : (
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.3)', 'rgba(99, 102, 241, 0.2)', 'transparent']}
              style={styles.coverPlaceholder}
            />
          )}
          <View style={styles.coverOverlay} />
          
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButtonContainer}
            onPress={() => router.back()}
          >
            <LinearGradient
              colors={['rgba(30, 41, 59, 0.8)', 'rgba(15, 23, 42, 0.9)']}
              style={styles.backButtonGradient}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Profile Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.avatarContainer}>
            {renderAvatar()}
            {isCurrentUser && profileExists && (
              <TouchableOpacity 
                style={styles.editAvatarButton}
                onPress={showAvatarOptions}
                disabled={avatarLoading}
              >
                <LinearGradient
                  colors={[theme.colors.primary, '#8b5cf6']}
                  style={styles.editAvatarGradient}
                >
                  {avatarLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#fff" />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={styles.username}>@{profile.username}</Text>
          {profile.display_name && (
            <Text style={styles.displayName}>{profile.display_name}</Text>
          )}
          
          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}
          
          {/* Location and Website */}
          <View style={styles.infoRow}>
            {profile.location && (
              <View style={styles.infoItem}>
                <Ionicons name="location" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.infoText}>{profile.location}</Text>
              </View>
            )}
            {profile.website && (
              <TouchableOpacity style={styles.infoItem}>
                <Ionicons name="link" size={14} color={theme.colors.primary} />
                <Text style={[styles.infoText, { color: theme.colors.primary }]}>
                  {profile.website.replace(/^https?:\/\//, '')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Social Links */}
          {(profile.twitter_username || profile.instagram_username || profile.tiktok_username) && (
            <View style={styles.socialLinks}>
              {profile.twitter_username && (
                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="logo-twitter" size={18} color="#1DA1F2" />
                </TouchableOpacity>
              )}
              {profile.instagram_username && (
                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="logo-instagram" size={18} color="#E1306C" />
                </TouchableOpacity>
              )}
              {profile.tiktok_username && (
                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="logo-tiktok" size={18} color="#000" />
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {/* Balance Card - Only show for existing users */}
          {profileExists && (
            <Animated.View 
              style={[
                styles.balanceCard,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <LinearGradient
                colors={['rgba(30, 41, 59, 0.8)', 'rgba(15, 23, 42, 0.9)']}
                style={styles.balanceGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              
              <View style={styles.balanceHeader}>
                <View style={styles.balanceRow}>
                  <Ionicons name="wallet" size={20} color={theme.colors.primary} />
                  <Text style={styles.balanceLabel}>WALLET BALANCE</Text>
                </View>
                <TouchableOpacity 
                  style={styles.refreshBalanceButton}
                  onPress={refreshWallet}
                  disabled={walletLoading}
                >
                  <LinearGradient
                    colors={[theme.colors.primary, '#8b5cf6']}
                    style={styles.refreshButtonGradient}
                  >
                    {walletLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="refresh" size={16} color="#fff" />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              
              {walletLoading ? (
                <View style={styles.balanceLoading}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.balanceLoadingText}>Loading blockchain balance...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.balanceAmount}>{formatAmount(totalBalance)}</Text>
                  <Text style={styles.balanceSubtitle}>BLURT</Text>
                  
                  <View style={styles.balanceBreakdown}>
                    <View style={styles.balanceItem}>
                      <LinearGradient
                        colors={['#10b981', '#34d399']}
                        style={styles.balanceDot}
                      />
                      <View style={styles.balanceTextContainer}>
                        <Text style={styles.balanceItemLabel}>Available</Text>
                        <Text style={styles.balanceItemValue}>
                          {formatAmount(balance?.available || 0)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.separator} />
                    
                    <View style={styles.balanceItem}>
                      <LinearGradient
                        colors={['#f59e0b', '#fbbf24']}
                        style={styles.balanceDot}
                      />
                      <View style={styles.balanceTextContainer}>
                        <Text style={styles.balanceItemLabel}>Rewards</Text>
                        <Text style={styles.balanceItemValue}>
                          {formatAmount(balance?.rewards || 0)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </Animated.View>
          )}
          
          {/* Action Buttons */}
          <View style={styles.actions}>
            {isCurrentUser ? (
              <>
                {profileExists ? (
                  <>
                    <NeonButton
                      title="EDIT PROFILE"
                      onPress={openEditModal}
                      variant="secondary"
                      size="small"
                      style={styles.actionButton}
                    />
                    <NeonButton
                      title="MY WALLET"
                      onPress={() => router.push('/wallet')}
                      variant="primary"
                      size="small"
                      style={styles.actionButton}
                    />
                  </>
                ) : (
                  <NeonButton
                    title="CREATE PROFILE"
                    onPress={() => router.push('/auth')}
                    variant="primary"
                    size="small"
                    style={styles.actionButton}
                  />
                )}
              </>
            ) : (
              <>
                {profileExists ? (
                  <>
                    <NeonButton
                      title={isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                      onPress={handleFollow}
                      variant={isFollowing ? 'accent' : 'primary'}
                      size="small"
                      style={styles.actionButton}
                    />
                    <NeonButton
                      title="SEND REWARD"
                      onPress={handleSendReward}
                      variant="accent"
                      size="small"
                      style={styles.actionButton}
                    />
                  </>
                ) : (
                  <Text style={styles.cannotInteractText}>
                    This is a dummy user. You can't interact with them.
                  </Text>
                )}
              </>
            )}
          </View>
        </Animated.View>

        {/* Stats - Only show for existing users */}
        {profileExists && (
          <Animated.View 
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>PROFILE STATS</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <LinearGradient
                  colors={['rgba(59, 130, 246, 0.2)', 'rgba(99, 102, 241, 0.1)']}
                  style={styles.statCircle}
                >
                  <Ionicons name="videocam" size={24} color={theme.colors.primary} />
                </LinearGradient>
                <Text style={styles.statNumber}>{formatNumber(stats.video_count)}</Text>
                <Text style={styles.statLabel}>Videos</Text>
              </View>
              
              <View style={styles.statItem}>
                <LinearGradient
                  colors={['rgba(16, 185, 129, 0.2)', 'rgba(52, 211, 153, 0.1)']}
                  style={styles.statCircle}
                >
                  <Ionicons name="people" size={24} color="#10b981" />
                </LinearGradient>
                <Text style={styles.statNumber}>{formatNumber(stats.follower_count)}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              
              <View style={styles.statItem}>
                <LinearGradient
                  colors={['rgba(139, 92, 246, 0.2)', 'rgba(167, 139, 250, 0.1)']}
                  style={styles.statCircle}
                >
                  <Ionicons name="person-add" size={24} color="#8b5cf6" />
                </LinearGradient>
                <Text style={styles.statNumber}>{formatNumber(stats.following_count)}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
              
              <View style={styles.statItem}>
                <LinearGradient
                  colors={['rgba(245, 158, 11, 0.2)', 'rgba(251, 191, 36, 0.1)']}
                  style={styles.statCircle}
                >
                  <Ionicons name="cash" size={24} color="#f59e0b" />
                </LinearGradient>
                <Text style={styles.statNumber}>
                  {formatAmount(stats.total_earnings || 0)}
                </Text>
                <Text style={styles.statLabel}>Earned</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Engagement Stats - Only show for existing users */}
        {profileExists && (
          <Animated.View 
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>ENGAGEMENT</Text>
            <View style={styles.engagementContainer}>
              <View style={styles.engagementItem}>
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  style={styles.engagementIcon}
                >
                  <Ionicons name="heart" size={18} color="#fff" />
                </LinearGradient>
                <Text style={styles.engagementText}>
                  {formatNumber(stats.total_likes)} Likes
                </Text>
              </View>
              <View style={styles.engagementItem}>
                <LinearGradient
                  colors={[theme.colors.primary, '#2563eb']}
                  style={styles.engagementIcon}
                >
                  <Ionicons name="chatbubble" size={18} color="#fff" />
                </LinearGradient>
                <Text style={styles.engagementText}>
                  {formatNumber(stats.total_comments)} Comments
                </Text>
              </View>
              <View style={styles.engagementItem}>
                <LinearGradient
                  colors={['#f59e0b', '#d97706']}
                  style={styles.engagementIcon}
                >
                  <Ionicons name="flash" size={18} color="#fff" />
                </LinearGradient>
                <Text style={styles.engagementText}>
                  {formatNumber(stats.video_count)} Videos
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Member Since */}
        <Animated.View 
          style={[
            styles.memberSince,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Ionicons name="calendar" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.memberSinceText}>
            {profileExists ? 'Member since' : 'Profile not created yet'} {new Date(profile.created_at).toLocaleDateString()}
          </Text>
        </Animated.View>

        {/* Videos Section */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>VIDEOS</Text>
          {stats.video_count > 0 ? (
            <Text style={styles.emptyText}>Videos will appear here</Text>
          ) : (
            <View style={styles.emptyVideos}>
              <LinearGradient
                colors={['rgba(30, 41, 59, 0.8)', 'rgba(15, 23, 42, 0.9)']}
                style={styles.emptyVideosGradient}
              >
                <Ionicons name="videocam-off" size={48} color={theme.colors.textSecondary} />
                <Text style={styles.emptyTitle}>No videos yet</Text>
                <Text style={styles.emptySubtext}>
                  {isCurrentUser ? 'Start creating content to appear here!' : 'This user hasn\'t posted any videos yet'}
                </Text>
                {isCurrentUser && profileExists && (
                  <TouchableOpacity 
                    style={styles.createButton}
                    onPress={() => router.push('/create')}
                  >
                    <LinearGradient
                      colors={[theme.colors.primary, '#8b5cf6']}
                      style={styles.createButtonGradient}
                    >
                      <Text style={styles.createButtonText}>Create Video</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </View>
          )}
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {profileExists 
              ? 'Profile data stored on Supabase • Real-time updates' 
              : 'This is a dummy user profile • No data stored'}
          </Text>
          <View style={styles.scanline} />
        </View>
      </ScrollView>

      {/* Edit Profile Modal - Only for existing current user */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
        statusBarTranslucent
      >
        <BlurView intensity={90} style={StyleSheet.absoluteFill}>
          <View style={styles.modalOverlay}>
            <Animated.View 
              style={[
                styles.modalContainer,
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
              ]}
            >
              <LinearGradient
                colors={['rgba(30, 41, 59, 0.95)', 'rgba(15, 23, 42, 0.98)']}
                style={styles.modalContent}
              >
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <Ionicons name="person-circle" size={24} color={theme.colors.primary} />
                    <Text style={styles.modalTitle}>Edit Profile</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalContentScroll} showsVerticalScrollIndicator={false}>
                  {/* Avatar Upload Section */}
                  <View style={styles.avatarUploadSection}>
                    <Text style={styles.avatarUploadLabel}>Profile Photo</Text>
                    <TouchableOpacity 
                      style={styles.avatarUploadContainer}
                      onPress={showAvatarOptions}
                      disabled={avatarLoading}
                    >
                      {currentUser?.profile?.avatar_url ? (
                        <Image 
                          source={{ uri: currentUser.profile.avatar_url }} 
                          style={styles.modalAvatarImage} 
                        />
                      ) : (
                        <View style={styles.modalAvatarPlaceholder}>
                          <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
                        </View>
                      )}
                      <View style={styles.avatarUploadButton}>
                        {avatarLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Ionicons name="camera" size={20} color="#fff" />
                        )}
                      </View>
                    </TouchableOpacity>
                    <Text style={styles.avatarUploadHint}>
                      Tap to change profile photo
                    </Text>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Display Name</Text>
                    <TextInput
                      style={styles.formInput}
                      value={editForm.display_name}
                      onChangeText={(text) => setEditForm({...editForm, display_name: text})}
                      placeholder="Your name"
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Bio</Text>
                    <TextInput
                      style={[styles.formInput, styles.textArea]}
                      value={editForm.bio}
                      onChangeText={(text) => setEditForm({...editForm, bio: text})}
                      placeholder="Tell everyone about yourself"
                      placeholderTextColor={theme.colors.textSecondary}
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Location</Text>
                    <TextInput
                      style={styles.formInput}
                      value={editForm.location}
                      onChangeText={(text) => setEditForm({...editForm, location: text})}
                      placeholder="City, Country"
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Website</Text>
                    <TextInput
                      style={styles.formInput}
                      value={editForm.website}
                      onChangeText={(text) => setEditForm({...editForm, website: text})}
                      placeholder="https://yourwebsite.com"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="url"
                    />
                  </View>
                  
                  <Text style={styles.socialSectionTitle}>Social Media</Text>
                  
                  <View style={styles.formGroup}>
                    <View style={styles.socialInputContainer}>
                      <Ionicons name="logo-twitter" size={20} color="#1DA1F2" style={styles.socialIcon} />
                      <TextInput
                        style={[styles.formInput, styles.socialInput]}
                        value={editForm.twitter_username}
                        onChangeText={(text) => setEditForm({...editForm, twitter_username: text})}
                        placeholder="Twitter username"
                        placeholderTextColor={theme.colors.textSecondary}
                      />
                    </View>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <View style={styles.socialInputContainer}>
                      <Ionicons name="logo-instagram" size={20} color="#E1306C" style={styles.socialIcon} />
                      <TextInput
                        style={[styles.formInput, styles.socialInput]}
                        value={editForm.instagram_username}
                        onChangeText={(text) => setEditForm({...editForm, instagram_username: text})}
                        placeholder="Instagram username"
                        placeholderTextColor={theme.colors.textSecondary}
                      />
                    </View>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <View style={styles.socialInputContainer}>
                      <Ionicons name="logo-tiktok" size={20} color="#000" style={styles.socialIcon} />
                      <TextInput
                        style={[styles.formInput, styles.socialInput]}
                        value={editForm.tiktok_username}
                        onChangeText={(text) => setEditForm({...editForm, tiktok_username: text})}
                        placeholder="TikTok username"
                        placeholderTextColor={theme.colors.textSecondary}
                      />
                    </View>
                  </View>
                  
                  <View style={styles.modalFooter}>
                    <TouchableOpacity 
                      style={styles.modalCancelButton}
                      onPress={() => setEditModalVisible(false)}
                    >
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.modalConfirmButton}
                      onPress={handleSaveProfile}
                    >
                      <LinearGradient
                        colors={[theme.colors.primary, '#8b5cf6']}
                        style={styles.modalConfirmGradient}
                      >
                        <Text style={styles.modalConfirmText}>Save Changes</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </LinearGradient>
            </Animated.View>
          </View>
        </BlurView>
      </Modal>

      {/* Avatar Options Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={avatarModalVisible}
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.avatarOptionsOverlay}>
          <View style={styles.avatarOptionsContainer}>
            <Text style={styles.avatarOptionsTitle}>Change Profile Photo</Text>
            
            <TouchableOpacity 
              style={styles.avatarOption}
              onPress={handleTakePhoto}
            >
              <Ionicons name="camera" size={24} color={theme.colors.primary} />
              <Text style={styles.avatarOptionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.avatarOption}
              onPress={handlePickImage}
            >
              <Ionicons name="images" size={24} color={theme.colors.primary} />
              <Text style={styles.avatarOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.avatarOption, styles.avatarCancelOption]}
              onPress={() => setAvatarModalVisible(false)}
            >
              <Text style={styles.avatarCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  dummyContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  dummyScrollContent: {
    paddingBottom: 32,
  },
  dummyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.1)',
  },
  dummyBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dummyBackButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dummyHeaderTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 16,
  },
  dummyContent: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 40,
  },
  dummyAvatarContainer: {
    marginBottom: 20,
  },
  dummyAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: theme.colors.background,
  },
  dummyUsername: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dummyTitle: {
    color: theme.colors.primary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  dummyText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  dummyStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  dummyStatItem: {
    width: (width - 48 - 48) / 2,
    alignItems: 'center',
    marginBottom: 24,
  },
  dummyStatNumber: {
    color: theme.colors.textSecondary,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  dummyStatLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dummyVideosSection: {
    width: '100%',
    marginBottom: 32,
  },
  dummyVideosTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  dummyVideosEmpty: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 24,
    padding: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  dummyVideosEmptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
  },
  dummyVideosEmptyText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  dummyActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    width: '100%',
  },
  dummyActionButtonGradient: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  dummyActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cannotInteractText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
    fontStyle: 'italic',
  },
  // Existing styles from previous version continue below...
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 24,
    padding: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 24,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  coverContainer: {
    height: HEADER_HEIGHT,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backButtonContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    marginTop: -60,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: theme.colors.background,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: theme.colors.background,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: theme.colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  editAvatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  displayName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  bio: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 8,
  },
  infoText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginLeft: 6,
  },
  socialLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  balanceCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'hidden',
  },
  balanceGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginLeft: 8,
  },
  refreshBalanceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  refreshButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginBottom: 4,
    textShadowColor: 'rgba(59, 130, 246, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  balanceSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 24,
  },
  balanceBreakdown: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  balanceDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  balanceTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceItemLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '500',
  },
  balanceItemValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    marginVertical: 8,
  },
  balanceLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  balanceLoadingText: {
    color: '#94a3b8',
    fontSize: 14,
    marginLeft: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 32,
  },
  actionButton: {
    marginHorizontal: 8,
    minWidth: 140,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: (width - 48 - 24) / 2,
    alignItems: 'center',
    marginBottom: 24,
  },
  statCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  statNumber: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  engagementContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  engagementIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  engagementText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  memberSince: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  memberSinceText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginLeft: 8,
  },
  emptyVideos: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  emptyVideosGradient: {
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
  emptySubtext: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    padding: 32,
    paddingBottom: 48,
  },
  footerText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  scanline: {
    width: '80%',
    height: 1,
    backgroundColor: theme.colors.primary,
    opacity: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    maxHeight: '90%',
  },
  modalContent: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 30,
  },
  modalContentScroll: {
    maxHeight: 600,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.1)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 12,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarUploadSection: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.1)',
  },
  avatarUploadLabel: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  avatarUploadContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 8,
  },
  modalAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  modalAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUploadButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(15, 23, 42, 0.9)',
  },
  avatarUploadHint: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  formGroup: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  formLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    color: theme.colors.text,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  socialSectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 24,
    marginBottom: 16,
    marginTop: 8,
  },
  socialInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  socialIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  socialInput: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 0,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 130, 246, 0.1)',
    marginTop: 16,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    paddingVertical: 16,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  modalCancelText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginLeft: 12,
  },
  modalConfirmGradient: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarOptionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOptionsContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 24,
    padding: 24,
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  avatarOptionsTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  avatarOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  avatarCancelOption: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    marginTop: 8,
    justifyContent: 'center',
  },
  avatarOptionText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
    flex: 1,
  },
  avatarCancelText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
});