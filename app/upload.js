import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import NeonButton from '../components/NeonButton';
import { useVideo } from '../hooks/useVideo';
import { useAuth } from '../hooks/useAuth';
import { theme } from './theme';
import { Ionicons } from '@expo/vector-icons';

export default function UploadScreen() {
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [videoUri, setVideoUri] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [isPickingVideo, setIsPickingVideo] = useState(false);
  
  const { uploading, progress, uploadAndPost } = useVideo();
  const { user } = useAuth();

  const pickVideo = async () => {
    try {
      setIsPickingVideo(true);
      
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your media library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setVideoUri(asset.uri);
        setVideoInfo({
          duration: asset.duration,
          width: asset.width,
          height: asset.height,
        });
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video');
    } finally {
      setIsPickingVideo(false);
    }
  };

  const captureVideo = async () => {
    try {
      setIsPickingVideo(true);
      
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow camera access');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setVideoUri(asset.uri);
        setVideoInfo({
          duration: asset.duration,
          width: asset.width,
          height: asset.height,
        });
      }
    } catch (error) {
      console.error('Error capturing video:', error);
      Alert.alert('Error', 'Failed to capture video');
    } finally {
      setIsPickingVideo(false);
    }
  };

  const handleSubmit = async () => {
    if (!videoUri) {
      Alert.alert('No Video', 'Please select or record a video first');
      return;
    }

    if (!caption.trim()) {
      Alert.alert('No Caption', 'Please add a caption for your video');
      return;
    }

    if (!user?.username) {
      Alert.alert('Not Authenticated', 'Please login to upload videos');
      return;
    }

    const tagArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, 5);

    Alert.alert(
      'Post to Blockchain',
      `This will permanently store your video on the Blurt blockchain.\n\n` +
      `• Content cannot be deleted or modified\n` +
      `• 10% platform fee applies to all rewards\n` +
      `• Transaction fees will be deducted\n\n` +
      `Proceed with upload?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'UPLOAD NOW',
          style: 'destructive',
          onPress: async () => {
            const result = await uploadAndPost(
              videoUri,
              caption,
              tagArray,
              user.username
            );

            if (result.success) {
              Alert.alert(
                'Success!',
                'Your video has been posted to the blockchain',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } else {
              Alert.alert('Upload Failed', result.error || 'Please try again');
            }
          },
        },
      ]
    );
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Post</Text>
          <View style={styles.headerSpacer} />
        </View>

        {uploading && (
          <View style={styles.uploadProgress}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Uploading to Blockchain</Text>
              <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress}%` },
                ]}
              />
            </View>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary}
              style={styles.progressSpinner}
            />
          </View>
        )}

        {/* Video Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>VIDEO CONTENT</Text>
          
          {videoUri ? (
            <View style={styles.videoPreview}>
              <Video
                source={{ uri: videoUri }}
                style={styles.videoPlayer}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                isLooping={false}
                useNativeControls
              />
              
              {videoInfo && (
                <View style={styles.videoInfo}>
                  <Text style={styles.videoInfoText}>
                    Duration: {formatDuration(videoInfo.duration)}
                  </Text>
                  <Text style={styles.videoInfoText}>
                    Resolution: {videoInfo.width}x{videoInfo.height}
                  </Text>
                </View>
              )}
              
              <TouchableOpacity
                onPress={() => setVideoUri(null)}
                style={styles.removeVideoButton}
              >
                <Ionicons name="close-circle" size={32} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.videoSelector}>
              <TouchableOpacity
                onPress={pickVideo}
                disabled={isPickingVideo}
                style={styles.videoOption}
              >
                <View style={styles.videoOptionIcon}>
                  <Ionicons name="folder-open" size={40} color={theme.colors.primary} />
                </View>
                <Text style={styles.videoOptionText}>Select Video</Text>
                {isPickingVideo && (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                    style={styles.pickingSpinner}
                  />
                )}
              </TouchableOpacity>
              
              <View style={styles.videoOptionDivider}>
                <Text style={styles.dividerText}>OR</Text>
              </View>
              
              <TouchableOpacity
                onPress={captureVideo}
                disabled={isPickingVideo}
                style={styles.videoOption}
              >
                <View style={styles.videoOptionIcon}>
                  <Ionicons name="videocam" size={40} color={theme.colors.secondary} />
                </View>
                <Text style={styles.videoOptionText}>Record Video</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Caption Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CAPTION</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.captionInput}
              value={caption}
              onChangeText={setCaption}
              placeholder="What's happening?"
              placeholderTextColor={theme.colors.textMuted}
              multiline
              maxLength={500}
            />
            <Text style={styles.charCount}>{caption.length}/500</Text>
          </View>
        </View>

        {/* Tags Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TAGS (Optional)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.tagsInput}
              value={tags}
              onChangeText={setTags}
              placeholder="comedy, gaming, crypto, tech, art"
              placeholderTextColor={theme.colors.textMuted}
            />
            <Text style={styles.inputHint}>Separate with commas, max 5 tags</Text>
          </View>
        </View>

        {/* Blockchain Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
            <Text style={styles.infoTitle}>Blockchain Information</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Network:</Text>
            <Text style={styles.infoValue}>Blurt Blockchain</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Storage:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.accent }]}>
              Permanent (On-chain)
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform Fee:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.warning }]}>
              10% on all future rewards
            </Text>
          </View>
          
          <View style={styles.infoNote}>
            <Ionicons
              name="shield-checkmark"
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.infoNoteText}>
              Fees support platform development and are sent to @trevorcodz
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <NeonButton
            title="POST TO BLOCKCHAIN"
            onPress={handleSubmit}
            variant="primary"
            size="large"
            loading={uploading}
            disabled={uploading || !videoUri || !caption.trim()}
            style={styles.submitButton}
          />
          
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },
  uploadProgress: {
    backgroundColor: theme.colors.glass,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  progressTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  progressPercent: {
    color: theme.colors.primary,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  progressSpinner: {
    alignSelf: 'center',
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  videoPreview: {
    position: 'relative',
    height: 200,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceLight,
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  videoInfoText: {
    color: theme.colors.text,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  removeVideoButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: theme.borderRadius.round,
  },
  videoSelector: {
    backgroundColor: theme.colors.glass,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    borderWidth: 2,
    borderColor: theme.colors.glassBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  videoOption: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    width: '100%',
  },
  videoOptionIcon: {
    marginBottom: theme.spacing.md,
  },
  videoOptionText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  pickingSpinner: {
    marginTop: theme.spacing.md,
  },
  videoOptionDivider: {
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
    width: '100%',
    position: 'relative',
  },
  dividerText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
  },
  inputContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    overflow: 'hidden',
  },
  captionInput: {
    padding: theme.spacing.lg,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'right',
    padding: theme.spacing.md,
    fontFamily: 'monospace',
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassBorder,
  },
  tagsInput: {
    padding: theme.spacing.lg,
    color: theme.colors.text,
    fontSize: 16,
  },
  inputHint: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    padding: theme.spacing.md,
    fontStyle: 'italic',
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassBorder,
  },
  infoCard: {
    backgroundColor: theme.colors.glass,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  infoTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  infoLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassBorder,
  },
  infoNoteText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginLeft: theme.spacing.sm,
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    marginTop: theme.spacing.xl,
  },
  submitButton: {
    marginBottom: theme.spacing.lg,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});