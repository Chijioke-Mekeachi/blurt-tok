import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { fetchBlurtPosts, fetchReels } from './blurtApiService';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://xlenimgxgdxqlnmwcvdg.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsZW5pbWd4Z2R4cWxubXdjdmRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MTcxMDcsImV4cCI6MjA4MTI5MzEwN30.i6R3fNlPl6QzSRtx2hP045a3OCG-EKN6jEmBzIeHddo";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Using local storage only.');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;




// Get hybrid feed (Blurt API + Supabase cache)
export const getFeed = async (page = 0, limit = 10) => {
  try {
    let supabaseData = [];
    if (supabase) {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          user:users(username)
        `)
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (!error) {
        supabaseData = data || [];
      }
    }

    // Fetch from Blurt API
    const blurtData = await fetchBlurtPosts('blurttok', limit);
    
    // Combine and deduplicate
    const allData = [...blurtData, ...supabaseData];
    const uniqueData = Array.from(
      new Map(allData.map(item => [item.blurt_tx, item])).values()
    );
    
    // Sort by date
    return uniqueData
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
    
  } catch (error) {
    console.error('Error fetching feed:', error);
    return await fetchBlurtPosts('blurttok', limit); // Fallback to Blurt API only
  }
};

// Get feed by specific hashtag
export const getFeedByHashtag = async (hashtag, page = 0, limit = 10) => {
  try {
    let supabaseData = [];
    if (supabase) {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          user:users(username)
        `)
        .contains('tags', [hashtag])
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (!error) {
        supabaseData = data || [];
      }
    }

    // Fetch from Blurt API
    const blurtData = hashtag === 'reels' 
      ? await fetchReels(limit)
      : await fetchBlurtPosts(hashtag, limit);
    
    // Combine and deduplicate
    const allData = [...blurtData, ...supabaseData];
    const uniqueData = Array.from(
      new Map(allData.map(item => [item.blurt_tx, item])).values()
    );
    
    // Sort by date
    return uniqueData
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
    
  } catch (error) {
    console.error(`Error fetching feed for hashtag ${hashtag}:`, error);
    return hashtag === 'reels' 
      ? await fetchReels(limit)
      : await fetchBlurtPosts(hashtag, limit);
  }
};

// Get popular hashtags
export const getPopularHashtags = async (limit = 10) => {
  try {
    // For now, return curated list - could be enhanced with analytics
    const popularHashtags = [
      { tag: 'reels', count: 1247 },
      { tag: 'blurttok', count: 892 },
      { tag: 'blockchain', count: 756 },
      { tag: 'crypto', count: 689 },
      { tag: 'web3', count: 567 },
      { tag: 'nft', count: 534 },
      { tag: 'gaming', count: 489 },
      { tag: 'music', count: 432 },
      { tag: 'art', count: 398 },
      { tag: 'comedy', count: 356 },
    ];
    
    return popularHashtags.slice(0, limit);
  } catch (error) {
    console.error('Error fetching popular hashtags:', error);
    return [];
  }
};

export const indexVideo = async (videoData) => {
  try {
    if (!supabase) {
      console.warn('Supabase not configured. Video indexing skipped.');
      return videoData;
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('username', videoData.username)
      .single();

    let userId = userData?.id;

    if (!userData) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ username: videoData.username })
        .select()
        .single();
      userId = newUser.id;
    }

    const { data, error } = await supabase
      .from('videos')
      .insert({
        user_id: userId,
        blurt_tx: videoData.blurt_tx,
        caption: videoData.caption,
        tags: videoData.tags || [],
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error indexing video:', error);
    return videoData;
  }
};

export const getComments = async (videoId) => {
  try {
    if (!supabase) {
      console.warn('Supabase not configured. Returning empty comments.');
      return [];
    }

    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:users(username)
      `)
      .eq('video_id', videoId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
};

export const getUserProfile = async (username) => {
  try {
    if (!supabase) {
      // Return mock profile if Supabase not configured
      return {
        id: `mock_${username}`,
        username,
        created_at: new Date().toISOString(),
        videos: [],
        totalEarnings: 0,
        videoCount: 0,
      };
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (userError) throw userError;

    const { data: videos } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false });

    const { data: rewards } = await supabase
      .from('rewards')
      .select('amount')
      .eq('user_id', userData.id);

    const totalEarnings = rewards?.reduce((sum, r) => sum + parseFloat(r.amount), 0) || 0;

    return {
      ...userData,
      videos: videos || [],
      totalEarnings,
      videoCount: videos?.length || 0,
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

export const recordAnalytics = async (userId, action, metadata = {}) => {
  try {
    if (!supabase) {
      console.log('Analytics (mock):', { userId, action, metadata });
      return;
    }

    const { error } = await supabase
      .from('analytics')
      .insert({
        user_id: userId,
        action,
        metadata,
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error recording analytics:', error);
  }
};

// Add methods to supabase object for convenience
if (supabase) {
  supabase.getFeed = getFeed;
  supabase.getFeedByHashtag = getFeedByHashtag;
  supabase.getPopularHashtags = getPopularHashtags;
  supabase.indexVideo = indexVideo;
  supabase.getComments = getComments;
  supabase.getUserProfile = getUserProfile;
  supabase.recordAnalytics = recordAnalytics;
}

export default {
  supabase,
  getFeed,
  getFeedByHashtag,
  getPopularHashtags,
  indexVideo,
  getComments,
  getUserProfile,
  recordAnalytics,
};