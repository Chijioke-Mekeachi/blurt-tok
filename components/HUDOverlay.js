import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { theme } from '../app/theme';
import { formatNumber } from '../utils/format';
import { Ionicons } from '@expo/vector-icons';

const HUDOverlay = ({
  likes,
  comments,
  rewards,
  onLike,
  onComment,
  onReward,
  onShare,
  userLiked = false,
  compact = true,
}) => {
  const [likeAnim] = useState(new Animated.Value(1));
  const [rewardAnim] = useState(new Animated.Value(1));

  const handleLike = () => {
    Animated.sequence([
      Animated.timing(likeAnim, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(likeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    onLike?.();
  };

  const handleReward = () => {
    Animated.sequence([
      Animated.timing(rewardAnim, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(rewardAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    onReward?.();
  };

  const ActionButton = ({ icon, count, onPress, animatedValue, active, color = theme.colors.text }) => (
    <TouchableOpacity onPress={onPress} style={styles.button}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: animatedValue }],
            backgroundColor: active ? color + '20' : theme.colors.glass,
            borderColor: active ? color : theme.colors.glassBorder,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={compact ? 20 : 24}
          color={active ? color : theme.colors.text}
        />
      </Animated.View>
      {count > 0 && (
        <Text style={[
          styles.count,
          { color: active ? color : theme.colors.textSecondary }
        ]}>
          {formatNumber(count)}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <ActionButton
        icon={userLiked ? 'heart' : 'heart-outline'}
        count={likes}
        onPress={handleLike}
        animatedValue={likeAnim}
        active={userLiked}
        color={theme.colors.error}
      />
      
      <ActionButton
        icon="chatbubble-outline"
        count={comments}
        onPress={onComment}
        animatedValue={new Animated.Value(1)}
        color={theme.colors.secondary}
      />
      
      <ActionButton
        icon="flash-outline"
        count={rewards}
        onPress={handleReward}
        animatedValue={rewardAnim}
        color={theme.colors.warning}
      />
      
      {!compact && (
        <ActionButton
          icon="share-outline"
          count={0}
          onPress={onShare}
          animatedValue={new Animated.Value(1)}
          color={theme.colors.primary}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: 120,
    alignItems: 'center',
    zIndex: 10,
  },
  compact: {
    bottom: 80,
  },
  button: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 2,
    ...theme.shadows.deep,
  },
  count: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default HUDOverlay;