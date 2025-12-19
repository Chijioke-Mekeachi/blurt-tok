// components/UserProfileLink.js
import React from 'react';
import {
  TouchableOpacity,
  View,
  Image,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../app/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { getDefaultAvatarUrl } from '../services/avatarService';

const UserProfileLink = ({
  username,
  displayName,
  avatarUrl,
  size = 'medium',
  showName = true,
  showChevron = false,
  showVerified = false,
  isVerified = false,
  onPress,
}) => {
  if (!username) return null;

  const handlePress = () => {
    if (onPress) {
      onPress(username);
    } else {
      router.push(`/profile/${username}`);
    }
  };

  const sizes = {
    small: {
      container: 32,
      fontSize: 12,
      iconSize: 16,
    },
    medium: {
      container: 44,
      fontSize: 14,
      iconSize: 20,
    },
    large: {
      container: 56,
      fontSize: 16,
      iconSize: 24,
    },
  };

  const currentSize = sizes[size];

  const getAvatarSource = () => {
    if (avatarUrl) {
      return { uri: avatarUrl };
    }
    return { uri: getDefaultAvatarUrl(username) };
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          {avatarUrl || true ? (
            <Image
              source={getAvatarSource()}
              style={[
                styles.avatar,
                {
                  width: currentSize.container,
                  height: currentSize.container,
                  borderRadius: currentSize.container / 2,
                },
              ]}
            />
          ) : (
            <LinearGradient
              colors={[theme.colors.primary, '#8b5cf6']}
              style={[
                styles.avatarPlaceholder,
                {
                  width: currentSize.container,
                  height: currentSize.container,
                  borderRadius: currentSize.container / 2,
                },
              ]}
            >
              <Ionicons
                name="person"
                size={currentSize.iconSize}
                color="#fff"
              />
            </LinearGradient>
          )}
          
          {isVerified && showVerified && (
            <View style={styles.verifiedBadge}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.verifiedGradient}
              >
                <Ionicons name="checkmark" size={10} color="#fff" />
              </LinearGradient>
            </View>
          )}
        </View>
        
        {showName && (
          <View style={styles.nameContainer}>
            {displayName ? (
              <Text
                style={[
                  styles.displayName,
                  { fontSize: currentSize.fontSize },
                ]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
            ) : null}
            <Text
              style={[
                styles.username,
                { fontSize: currentSize.fontSize - 2 },
              ]}
              numberOfLines={1}
            >
              @{username}
            </Text>
          </View>
        )}
        
        {showChevron && (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.colors.textSecondary}
            style={styles.chevron}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  verifiedGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  displayName: {
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  username: {
    color: theme.colors.textSecondary,
  },
  chevron: {
    marginLeft: 8,
  },
});

export default UserProfileLink;