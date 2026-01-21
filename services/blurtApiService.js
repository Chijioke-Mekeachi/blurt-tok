// Service to fetch content from the Blurt blockchain API
const BLURT_API_ENDPOINT = 'https://rpc.blurt.blog';

// ------------------- Fetch Posts -------------------

export const fetchBlurtPosts = async (tag = 'blurttok', limit = 20) => {
  try {
    console.log(`Fetching Blurt posts with tag: ${tag}, limit: ${limit}`);

    const response = await fetch(BLURT_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'condenser_api.get_discussions_by_created',
        params: [{ tag, limit }],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.result && Array.isArray(data.result)) {
      console.log(`Successfully fetched ${data.result.length} posts from Blurt`);

      const transformedPosts = data.result.map(post => {
        const videoUrl = extractVideoUrl(post);

        return {
          id: `blurt_${post.author}_${post.permlink}`,
          blurt_tx: post.id || post.permlink,
          caption: post.title || (post.body ? post.body.substring(0, 100) + '...' : 'No caption'),
          video_url: videoUrl || getPlaceholderVideoUrl(post.author),
          thumbnail: `https://images.hive.blog/u/${post.author}/avatar`,
          user: {
            username: post.author,
            avatar: `https://images.hive.blog/u/${post.author}/avatar`,
          },
          tags: (post.json_metadata && post.json_metadata.tags) || [tag],
          created_at: post.created || new Date().toISOString(),
          likes_count: post.net_votes || Math.floor(Math.random() * 1000),
          comments_count: post.children || Math.floor(Math.random() * 100),
          rewards_total: parseFloat(post.pending_payout_value || 0) + Math.random() * 10,
          duration: Math.floor(Math.random() * 60) + 15, // 15-75 seconds
        };
      });

      return transformedPosts;
    }

    console.log('No results found in Blurt API response');
    return getFallbackVideos(tag);

  } catch (error) {
    console.error('Error fetching from Blurt API:', error);
    return getFallbackVideos(tag);
  }
};

// ------------------- Extract Video URL -------------------

const extractVideoUrl = (post) => {
  try {
    const body = post.body || '';
    const metadata = post.json_metadata || {};

    if (metadata.video) return metadata.video;

    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urls = body.match(urlRegex) || [];
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    const videoHosts = ['youtube.com', 'youtu.be', 'vimeo.com', 'd.tube', '3speak.tv'];

    for (const url of urls) {
      if (videoExtensions.some(ext => url.toLowerCase().includes(ext))) return url;
      if (videoHosts.some(host => url.includes(host))) return url;
    }

    return null;
  } catch (err) {
    console.error('Error extracting video URL:', err);
    return null;
  }
};

// ------------------- Placeholder Videos -------------------

const getPlaceholderVideoUrl = (author) => {
  const placeholderVideos = [
    // Google sample videos
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',

    // W3Schools
    'https://www.w3schools.com/html/mov_bbb.mp4',

    // Sample-videos (CDN-backed)
    'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
    'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_5mb.mp4',
  ];

  const index =
    author.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    placeholderVideos.length;

  return placeholderVideos[index];
};


// ------------------- Fallback Videos -------------------

const getFallbackVideos = (tag) => {
  const fallbackVideos = [
    {
      id: 'fallback_1',
      blurt_tx: 'tx_fallback_1',
      caption: `Welcome to BlurtTok! First ${tag} video on the blockchain! 🚀`,
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumbnail: 'https://images.hive.blog/u/blurttok/avatar',
      user: { username: 'blurttok_official' },
      tags: [tag, 'blurttok', 'blockchain'],
      created_at: new Date().toISOString(),
      likes_count: 1247,
      comments_count: 89,
      rewards_total: 45.67,
      duration: 60,
    },
    {
      id: 'fallback_2',
      blurt_tx: 'tx_fallback_2',
      caption: 'Creating amazing content on the Blurt blockchain #web3',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      thumbnail: 'https://images.hive.blog/u/crypto_artist/avatar',
      user: { username: 'crypto_artist' },
      tags: [tag, 'art', 'nft'],
      created_at: new Date(Date.now() - 86400000).toISOString(),
      likes_count: 856,
      comments_count: 42,
      rewards_total: 23.45,
      duration: 45,
    },
    {
      id: 'fallback_3',
      blurt_tx: 'tx_fallback_3',
      caption: 'Epic gaming moments live on blockchain #gaming',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnail: 'https://images.hive.blog/u/gaming_king/avatar',
      user: { username: 'gaming_king' },
      tags: [tag, 'gaming', 'esports'],
      created_at: new Date(Date.now() - 172800000).toISOString(),
      likes_count: 2103,
      comments_count: 156,
      rewards_total: 67.89,
      duration: 30,
    },
    {
      id: 'fallback_4',
      blurt_tx: 'tx_fallback_4',
      caption: 'Music production on the decentralized web #music',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumbnail: 'https://images.hive.blog/u/music_producer/avatar',
      user: { username: 'music_producer' },
      tags: [tag, 'music', 'beats'],
      created_at: new Date(Date.now() - 259200000).toISOString(),
      likes_count: 934,
      comments_count: 67,
      rewards_total: 34.56,
      duration: 75,
    },
    {
  id: 'fallback_5',
  blurt_tx: 'tx_fallback_5',
  caption: 'Web3 dev life on Blurt 🚀',
  video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  thumbnail: 'https://images.hive.blog/u/web3dev/avatar',
  user: { username: 'web3dev' },
  tags: [tag, 'web3', 'dev'],
  created_at: new Date(Date.now() - 360000000).toISOString(),
  likes_count: 1543,
  comments_count: 132,
  rewards_total: 51.12,
  duration: 52,
},
{
  id: 'fallback_6',
  blurt_tx: 'tx_fallback_6',
  caption: 'Short cinematic clip 🎬 #reels',
  video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  thumbnail: 'https://images.hive.blog/u/filmmaker/avatar',
  user: { username: 'filmmaker' },
  tags: [tag, 'cinematic', 'reels'],
  created_at: new Date(Date.now() - 432000000).toISOString(),
  likes_count: 2789,
  comments_count: 201,
  rewards_total: 88.41,
  duration: 70,
},
{
  id: 'fallback_7',
  blurt_tx: 'tx_fallback_7',
  caption: 'Daily coding motivation 💻',
  video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
  thumbnail: 'https://images.hive.blog/u/coderlife/avatar',
  user: { username: 'coderlife' },
  tags: [tag, 'coding', 'motivation'],
  created_at: new Date(Date.now() - 518400000).toISOString(),
  likes_count: 987,
  comments_count: 54,
  rewards_total: 19.73,
  duration: 35,
}

  ];

  return fallbackVideos.filter(video => video.tags.includes(tag));
};

// ------------------- Fetch Reels -------------------

export const fetchReels = async (limit = 20) => {
  return fetchBlurtPosts('reels', limit);
};

// ------------------- Fetch Multiple Tags -------------------

export const fetchPostsByTags = async (tags = [], limit = 10) => {
  try {
    const allPosts = [];
    for (const tag of tags.slice(0, 3)) {
      const posts = await fetchBlurtPosts(tag, Math.ceil(limit / tags.length));
      allPosts.push(...posts);
    }
    const shuffled = allPosts.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, limit);
  } catch (err) {
    console.error('Error fetching posts by tags:', err);
    return getFallbackVideos(tags[0] || 'blurttok');
  }
};

// ------------------- Search Posts -------------------

export const searchBlurtPosts = async (query, limit = 20) => {
  try {
    const allPosts = await fetchBlurtPosts('blurttok', 50);
    const filtered = allPosts.filter(post =>
      post.caption.toLowerCase().includes(query.toLowerCase()) ||
      post.user.username.toLowerCase().includes(query.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
    return filtered.slice(0, limit);
  } catch (err) {
    console.error('Error searching Blurt posts:', err);
    return [];
  }
};
