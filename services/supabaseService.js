import { supabase } from './supabaseClient';

// Profile functions
// Add this function to your supabaseService.js file
export const getUserProfile = async (username) => {
  try {
    console.log('getUserProfile called for:', username);
    
    if (!username) {
      throw new Error('Username is required');
    }

    // Get the user first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.toLowerCase())
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      // Try case-insensitive search
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .ilike('username', username.toLowerCase());
      
      if (users && users.length > 0) {
        userData = users[0];
      } else {
        return null;
      }
    }

    if (!userData) {
      return null;
    }

    // Get the profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userData.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      // Create a basic profile if it doesn't exist
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          user_id: userData.id,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
          display_name: userData.username
        })
        .select()
        .single();

      if (newProfile) {
        return {
          ...userData,
          ...newProfile
        };
      }
      
      // Return user data even if profile doesn't exist
      return {
        ...userData,
        display_name: userData.username,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
      };
    }

    // Combine user and profile data
    return {
      ...userData,
      ...profileData
    };
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
};

export const updateUserProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

export const followUser = async (followerId, followingUsername) => {
  try {
    // Get the user to follow
    const { data: followingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', followingUsername)
      .single();

    if (userError || !followingUser) {
      throw new Error('User not found');
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingUser.id)
      .single();

    if (existingFollow) {
      // Unfollow
      const { error } = await supabase
        .from('followers')
        .delete()
        .eq('id', existingFollow.id);

      if (error) throw error;
      
      // Delete follow notification
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', followingUser.id)
        .eq('from_user_id', followerId)
        .eq('type', 'follow');
        
      return { success: true, following: false };
    } else {
      // Follow
      const { data, error } = await supabase
        .from('followers')
        .insert({
          follower_id: followerId,
          following_id: followingUser.id
        })
        .select()
        .single();

      if (error) throw error;
      
      // Create follow notification using the function
      await supabase.rpc('create_notification', {
        p_user_id: followingUser.id,
        p_type: 'follow',
        p_from_user_id: followerId
      });
      
      return { success: true, following: true, data };
    }
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
};

export const checkIfFollowing = async (followerId, followingUsername) => {
  try {
    const { data: followingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', followingUsername)
      .single();

    if (!followingUser) return false;

    const { data } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingUser.id)
      .single();

    return !!data;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
};

// Notification functions
export const getUserNotifications = async (userId, limit = 20, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        from_user:from_user_id (username)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
};

export const markAllNotificationsAsRead = async (userId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: error.message };
  }
};

export const createNotification = async (
  userId,
  type,
  fromUserId = null,
  amount = 0,
  videoId = null,
  videoCaption = null,
  commentText = null,
  message = null
) => {
  try {
    // Use the PostgreSQL function that deletes existing similar notifications first
    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: type,
      p_from_user_id: fromUserId,
      p_amount: amount,
      p_video_id: videoId,
      p_video_caption: videoCaption,
      p_comment_text: commentText,
      p_message: message
    });

    if (error) throw error;
    return { success: true, notificationId: data };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }
};

export const getUnreadNotificationCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
};

// Like functions
export const toggleLike = async (userId, videoId) => {
  try {
    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);

      if (error) throw error;
      return { success: true, liked: false };
    } else {
      // Like
      const { data, error } = await supabase
        .from('likes')
        .insert({
          user_id: userId,
          video_id: videoId
        })
        .select()
        .single();

      if (error) throw error;
      
      // Get video owner for notification
      const { data: video } = await supabase
        .from('videos')
        .select('user_id, caption')
        .eq('id', videoId)
        .single();

      if (video && video.user_id !== userId) {
        // Create like notification
        await createNotification(
          video.user_id,
          'like',
          userId,
          0,
          videoId,
          video.caption
        );
      }
      
      return { success: true, liked: true, data };
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
};

export const checkIfLiked = async (userId, videoId) => {
  try {
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .single();

    return !!data;
  } catch (error) {
    console.error('Error checking like status:', error);
    return false;
  }
};

export const getVideoLikesCount = async (videoId) => {
  try {
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting likes count:', error);
    return 0;
  }
};

// Comment functions
export const createComment = async (userId, videoId, text) => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: userId,
        video_id: videoId,
        text: text
      })
      .select(`
        *,
        user:users (username)
      `)
      .single();

    if (error) throw error;
    
    // Get video owner for notification
    const { data: video } = await supabase
      .from('videos')
      .select('user_id, caption')
      .eq('id', videoId)
      .single();

    if (video && video.user_id !== userId) {
      // Create comment notification
      await createNotification(
        video.user_id,
        'comment',
        userId,
        0,
        videoId,
        video.caption,
        text
      );
    }
    
    return { success: true, comment: data };
  } catch (error) {
    console.error('Error creating comment:', error);
    throw error;
  }
};

export const getVideoComments = async (videoId, limit = 20, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:users (username)
      `)
      .eq('video_id', videoId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting comments:', error);
    return [];
  }
};

export const deleteComment = async (commentId, userId) => {
  try {
    // Check if user owns the comment
    const { data: comment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (!comment || comment.user_id !== userId) {
      throw new Error('Not authorized to delete this comment');
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};