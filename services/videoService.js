import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabaseClient';

const PLATFORM_FEE_PERCENT = 0.10;
const PLATFORM_ACCOUNT = 'trevorcodz';

// Initialize Blurt client
let blurtClient = null;

const initBlurtClient = async () => {
  if (!blurtClient) {
    try {
      const { Client } = await import('@blurt-js/lib');
      blurtClient = new Client('https://rpc.blurt.world');
    } catch (error) {
      console.error('Error loading Blurt client:', error);
    }
  }
  return blurtClient;
};

// Store credentials locally
export const storeCredentials = async (username, postingKey) => {
  try {
    await SecureStore.setItemAsync('blurt_username', username);
    await SecureStore.setItemAsync('blurt_posting_key', postingKey);
    return true;
  } catch (error) {
    console.error('Error storing credentials:', error);
    return false;
  }
};

// Get stored credentials
export const getCredentials = async () => {
  try {
    const username = await SecureStore.getItemAsync('blurt_username');
    const postingKey = await SecureStore.getItemAsync('blurt_posting_key');
    return { username, postingKey };
  } catch (error) {
    console.error('Error getting credentials:', error);
    return { username: null, postingKey: null };
  }
};

// Remove credentials (logout)
export const removeCredentials = async () => {
  try {
    await SecureStore.deleteItemAsync('blurt_username');
    await SecureStore.deleteItemAsync('blurt_posting_key');
    return true;
  } catch (error) {
    console.error('Error removing credentials:', error);
    return false;
  }
};

// Post video to Blurt blockchain
export const postVideo = async (caption, tags = [], videoUrl) => {
  try {
    const { username, postingKey } = await getCredentials();
    
    if (!username || !postingKey) {
      throw new Error('Not authenticated');
    }

    const client = await initBlurtClient();
    if (!client) throw new Error('Failed to initialize Blurt client');

    // Generate unique identifier for the post
    const permlink = `blurttok-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create tags including blurttok
    const allTags = ['blurttok', ...tags.filter(t => t && t.trim())].slice(0, 5);
    
    // Prepare post metadata
    const metadata = {
      video: videoUrl,
      app: 'blurttok/v1.0',
      format: 'markdown+video',
    };

    // Create the post operation
    const operations = [
      ['comment', {
        parent_author: '',
        parent_permlink: 'blurttok',
        author: username,
        permlink: permlink,
        title: caption.substring(0, 100),
        body: `${caption}\n\n![Video](${videoUrl})`,
        json_metadata: JSON.stringify({
          tags: allTags,
          app: 'blurttok',
          ...metadata
        })
      }]
    ];

    // Broadcast the transaction
    const result = await client.broadcast.sendAsync(
      { operations, extensions: [] },
      { posting: postingKey }
    );

    if (result?.id) {
      // Index in Supabase
      await supabase.indexVideo({
        username,
        blurt_tx: result.id,
        caption,
        tags: allTags,
      });

      return {
        success: true,
        transactionId: result.id,
        permlink,
        message: 'Video posted to blockchain!',
      };
    }

    throw new Error('Failed to post video');
  } catch (error) {
    console.error('Error posting video:', error);
    return {
      success: false,
      error: error.message || 'Failed to post video',
    };
  }
};

// Send reward to video
export const rewardVideo = async (author, permlink, amount) => {
  try {
    const { username, postingKey } = await getCredentials();
    
    if (!username || !postingKey) {
      throw new Error('Not authenticated');
    }

    const client = await initBlurtClient();
    if (!client) throw new Error('Failed to initialize Blurt client');

    // Calculate platform fee
    const fee = amount * PLATFORM_FEE_PERCENT;
    const creatorAmount = amount - fee;

    // First, send fee to platform account
    if (fee > 0) {
      const feeOperation = [
        'transfer',
        {
          from: username,
          to: PLATFORM_ACCOUNT,
          amount: `${fee.toFixed(3)} BLURT`,
          memo: `Platform fee for ${author}/${permlink}`
        }
      ];

      await client.broadcast.sendAsync(
        { operations: [feeOperation], extensions: [] },
        { posting: postingKey }
      );
    }

    // Then, send reward to creator
    const rewardOperation = [
      'transfer',
      {
        from: username,
        to: author,
        amount: `${creatorAmount.toFixed(3)} BLURT`,
        memo: `Reward for ${permlink}`
      }
    ];

    const result = await client.broadcast.sendAsync(
      { operations: [rewardOperation], extensions: [] },
      { posting: postingKey }
    );

    if (result?.id) {
      // Record reward in Supabase
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      const { data: videoData } = await supabase
        .from('videos')
        .select('id')
        .eq('blurt_tx', permlink)
        .single();

      if (userData?.id && videoData?.id) {
        await supabase
          .from('rewards')
          .insert({
            video_id: videoData.id,
            user_id: userData.id,
            amount: creatorAmount,
            fee: fee,
          });
      }

      return {
        success: true,
        transactionId: result.id,
        amount: creatorAmount,
        fee: fee,
        message: 'Reward sent!',
      };
    }

    throw new Error('Failed to send reward');
  } catch (error) {
    console.error('Error sending reward:', error);
    return {
      success: false,
      error: error.message || 'Failed to send reward',
    };
  }
};

// Post comment on video
export const postComment = async (parentAuthor, parentPermlink, content) => {
  try {
    const { username, postingKey } = await getCredentials();
    
    if (!username || !postingKey) {
      throw new Error('Not authenticated');
    }

    const client = await initBlurtClient();
    if (!client) throw new Error('Failed to initialize Blurt client');

    // Generate unique permlink for comment
    const permlink = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const operations = [
      ['comment', {
        parent_author: parentAuthor,
        parent_permlink: parentPermlink,
        author: username,
        permlink: permlink,
        title: '',
        body: content,
        json_metadata: JSON.stringify({
          app: 'blurttok',
          type: 'comment'
        })
      }]
    ];

    const result = await client.broadcast.sendAsync(
      { operations, extensions: [] },
      { posting: postingKey }
    );

    if (result?.id) {
      // Index comment in Supabase
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      const { data: videoData } = await supabase
        .from('videos')
        .select('id')
        .eq('blurt_tx', parentPermlink)
        .single();

      if (userData?.id && videoData?.id) {
        await supabase
          .from('comments')
          .insert({
            video_id: videoData.id,
            user_id: userData.id,
            content: content,
            blurt_tx: result.id,
          });
      }

      return {
        success: true,
        transactionId: result.id,
        permlink,
        message: 'Comment posted!',
      };
    }

    throw new Error('Failed to post comment');
  } catch (error) {
    console.error('Error posting comment:', error);
    return {
      success: false,
      error: error.message || 'Failed to post comment',
    };
  }
};

// Get user balance
export const getUserBalance = async (username) => {
  try {
    const client = await initBlurtClient();
    if (!client) throw new Error('Failed to initialize Blurt client');

    const accounts = await client.database.getAccounts([username]);
    if (accounts && accounts[0]) {
      const account = accounts[0];
      return {
        balance: parseFloat(account.balance),
        rewardBalance: parseFloat(account.reward_balance),
        available: parseFloat(account.available),
      };
    }
    
    return { balance: 0, rewardBalance: 0, available: 0 };
  } catch (error) {
    console.error('Error getting user balance:', error);
    return { balance: 0, rewardBalance: 0, available: 0 };
  }
};