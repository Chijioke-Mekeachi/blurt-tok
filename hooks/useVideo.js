import { useCallback, useState } from 'react';
import { postVideo as postToBlurt } from '../services/blurtService';
import { supabase } from '../services/supabaseClient';
import { uploadVideo } from '../services/videoService';

export const useVideo = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const uploadAndPost = useCallback(async (videoUri, caption, tags = [], username) => {
    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      // Step 1: Upload video to storage
      setProgress(10);
      const uploadResult = await uploadVideo(videoUri, username);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload video');
      }

      setProgress(50);

      // Step 2: Post to Blurt blockchain
      const postResult = await postToBlurt(caption, tags, uploadResult.url);
      
      if (!postResult.success) {
        throw new Error(postResult.error || 'Failed to post to blockchain');
      }

      setProgress(90);

      // Step 3: Index in Supabase (already done in postToBlurt)
      setProgress(100);

      return {
        success: true,
        videoId: uploadResult.videoId,
        transactionId: postResult.transactionId,
        message: postResult.message,
      };
    } catch (error) {
      console.error('Error in upload and post:', error);
      setError(error.message);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, []);

  const getVideoDetails = useCallback(async (videoId) => {
    try {
      const details = await supabase.getVideoDetails(videoId);
      return details;
    } catch (error) {
      console.error('Error getting video details:', error);
      return null;
    }
  }, []);

  const likeVideo = useCallback(async (videoId, userId) => {
    try {
      // Record like in analytics
      await supabase.recordAnalytics(userId, 'like', { video_id: videoId });
      return { success: true };
    } catch (error) {
      console.error('Error liking video:', error);
      return { success: false, error: error.message };
    }
  }, []);

  return {
    uploading,
    progress,
    error,
    uploadAndPost,
    getVideoDetails,
    likeVideo,
  };
};