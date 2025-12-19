import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../app/theme';
import { formatTimeAgo } from '../utils/format';
import { Ionicons } from '@expo/vector-icons';

const CommentBubble = ({
  comment,
  onUpvote,
  onReply,
  onProfilePress,
  isThread = false,
}) => {
  return (
    <View style={[
      styles.container,
      isThread && styles.threadContainer,
    ]}>
      <TouchableOpacity
        onPress={() => onProfilePress?.(comment.user?.username)}
        style={styles.header}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {comment.user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>@{comment.user?.username}</Text>
          <Text style={styles.timestamp}>
            {formatTimeAgo(comment.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
      
      <Text style={styles.content}>{comment.content}</Text>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onUpvote?.(comment.id)}
        >
          <Ionicons
            name="arrow-up-outline"
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.actionText}>Upvote</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onReply?.(comment)}
        >
          <Ionicons
            name="return-down-forward-outline"
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.actionText}>Reply</Text>
        </TouchableOpacity>
      </View>
      
      {!isThread && (
        <View style={styles.glowLine} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.glass,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  threadContainer: {
    marginLeft: theme.spacing.xl,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  content: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  actionText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginLeft: 4,
  },
  glowLine: {
    position: 'absolute',
    bottom: -8,
    left: '10%',
    right: '10%',
    height: 1,
    backgroundColor: theme.colors.primary,
    opacity: 0.3,
  },
});

export default CommentBubble;