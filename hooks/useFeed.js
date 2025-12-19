import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { fetchBlurtPosts, fetchReels, fetchPostsByTags } from '../services/blurtApiService';

export const useFeed = (initialHashtag = null) => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [currentHashtag, setCurrentHashtag] = useState(initialHashtag);
  const [popularHashtags, setPopularHashtags] = useState([]);

  const loadFeed = useCallback(async (refresh = false, hashtag = currentHashtag) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setPage(0);
        setHasMore(true);
        setError(null);
      } else {
        if (!hasMore || loading) return;
        setLoading(true);
      }

      const currentPage = refresh ? 0 : page;
      let data = [];

      if (hashtag === 'reels') {
        // Fetch reels specifically
        data = await fetchReels(10);
      } else if (hashtag) {
        // Fetch by specific hashtag
        data = await fetchBlurtPosts(hashtag, 10);
      } else {
        // Fetch mixed content for "For You"
        const trendingTags = ['blurttok', 'blockchain', 'crypto', 'gaming', 'music'];
        data = await fetchPostsByTags(trendingTags, 10);
      }

      if (data.length === 0) {
        setHasMore(false);
      } else {
        if (refresh) {
          setFeed(data);
        } else {
          setFeed(prev => [...prev, ...data]);
        }
        setPage(currentPage + 1);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, hasMore, loading, currentHashtag]);

  useEffect(() => {
    loadFeed();
  }, [currentHashtag]);

  const refreshFeed = () => {
    loadFeed(true);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadFeed();
    }
  };

  const loadHashtagFeed = (hashtag) => {
    setCurrentHashtag(hashtag);
    setFeed([]);
    setPage(0);
    setHasMore(true);
    setLoading(true);
  };

  const clearHashtag = () => {
    setCurrentHashtag(null);
    setFeed([]);
    setPage(0);
    setHasMore(true);
    setLoading(true);
  };

  const loadPopularHashtags = useCallback(async () => {
    try {
      const hashtags = await supabase?.getPopularHashtags?.(10) || [
        { tag: 'reels', count: 1000 },
        { tag: 'blurttok', count: 850 },
        { tag: 'blockchain', count: 720 },
        { tag: 'crypto', count: 650 },
        { tag: 'web3', count: 580 },
        { tag: 'nft', count: 520 },
        { tag: 'gaming', count: 480 },
        { tag: 'music', count: 420 },
        { tag: 'art', count: 380 },
        { tag: 'comedy', count: 340 },
      ];
      setPopularHashtags(hashtags);
    } catch (error) {
      console.error('Error loading popular hashtags:', error);
    }
  }, []);

  useEffect(() => {
    loadPopularHashtags();
  }, [loadPopularHashtags]);

  const addVideo = (video) => {
    setFeed(prev => [video, ...prev]);
  };

  const updateVideo = (videoId, updates) => {
    setFeed(prev =>
      prev.map(video =>
        video.id === videoId ? { ...video, ...updates } : video
      )
    );
  };

  return {
    feed,
    loading,
    refreshing,
    error,
    hasMore,
    currentHashtag,
    popularHashtags,
    refreshFeed,
    loadMore,
    loadHashtagFeed,
    clearHashtag,
    addVideo,
    updateVideo,
    reloadPopularHashtags: loadPopularHashtags,
  };
};