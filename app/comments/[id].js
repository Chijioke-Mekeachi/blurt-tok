import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import CommentBubble from '../../components/CommentBubble';
import NeonButton from '../../components/NeonButton';
import { useAuth } from '../../hooks/useAuth';
import { postComment } from '../../services/blurtService';
import { supabase } from '../../services/supabaseClient';
import { theme } from '../theme';
import { formatNumber, formatTimeAgo } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';

export default function CommentsScreen() {
  const { id } = useLocalSearchParams();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [video, setVideo] = useState(null);
  
  const { user } = useAuth();
  const flatListRef = useRef(null);

  useEffect(() => {
    loadComments();
  }, [id]);

  const loadComments = async () => {
    try {
      setLoading(true);
      
      // Load video details
      const { data: videoData } = await supabase
        .from('videos')
        .select('*, user:users(username)')
        .eq('id', id)
        .single();
      
      setVideo(videoData);

      // Load comments
      const commentsData = await supabase.getComments(id);
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to post comments');
      router.push('/auth');
      return;
    }

    if (!newComment.trim()) {
      Alert.alert('Empty Comment', 'Please enter a comment');
      return;
    }

    if (!video?.blurt_tx) {
      Alert.alert('Error', 'Cannot post comment for this video');
      return;
    }

    try {
      setPosting(true);

      const result = await postComment(
        video.user?.username,
        video.blurt_tx,
        newComment.trim()
      );

      if (result.success) {
        // Add comment to local state
        const newCommentObj = {
          id: result.transactionId,
          content: newComment,
          user: { username: user.username },
          created_at: new Date().toISOString(),
          blurt_tx: result.transactionId,
        };

        setComments(prev => [...prev, newCommentObj]);
        setNewComment('');
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Failed to post', result.error);
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const handleProfilePress = (username) => {
    router.push(`/profile/${username}`);
  };

  const renderComment = ({ item }) => (
    <CommentBubble
      comment={item}
      onProfilePress={handleProfilePress}
      onReply={(comment) => {
        setNewComment(`@${comment.user?.username} `);
      }}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading comments...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerTitleText}>COMMENTS</Text>
          <Text style={styles.headerSubtitle}>
            {formatNumber(comments.length)} comments
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Comments List */}
      {comments.length > 0 ? (
        <FlatList
          ref={flatListRef}
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.commentsList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons
            name="chatbubble-outline"
            size={64}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.emptyText}>No comments yet</Text>
          <Text style={styles.emptySubtext}>
            Be the first to comment on this video
          </Text>
        </View>
      )}

      {/* Comment Input */}
      <View style={styles.inputContainer}>
        {!user ? (
          <View style={styles.authPrompt}>
            <Text style={styles.authText}>Login to join the conversation</Text>
            <NeonButton
              title="LOGIN"
              onPress={() => router.push('/auth')}
              variant="primary"
              size="small"
            />
          </View>
        ) : (
          <>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Add a comment..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                onPress={handlePostComment}
                disabled={posting || !newComment.trim()}
                style={[
                  styles.sendButton,
                  (!newComment.trim() || posting) && styles.sendButtonDisabled,
                ]}
              >
                {posting ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Ionicons
                    name="send"
                    size={24}
                    color={newComment.trim() ? theme.colors.primary : theme.colors.textMuted}
                  />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.charCount}>
              {newComment.length}/1000
            </Text>
          </>
        )}
      </View>

      {/* Network Status */}
      <View style={styles.networkStatus}>
        <View style={styles.networkDot} />
        <Text style={styles.networkText}>
          Comments are stored on the Blurt blockchain
        </Text>
      </View>
    </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 60,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleText: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  commentsList: {
    padding: theme.spacing.lg,
    paddingBottom: 120,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 200,
  },
  emptyText: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginTop: theme.spacing.lg,
  },
  emptySubtext: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassBorder,
    padding: theme.spacing.lg,
  },
  authPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.glass,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  authText: {
    color: theme.colors.text,
    fontSize: 14,
    flex: 1,
    marginRight: theme.spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    paddingHorizontal: theme.spacing.md,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    paddingVertical: theme.spacing.md,
    maxHeight: 100,
  },
  sendButton: {
    padding: theme.spacing.md,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  charCount: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
    fontFamily: 'monospace',
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.glass,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    position: 'absolute',
    top: 130,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginRight: theme.spacing.sm,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  networkText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
});