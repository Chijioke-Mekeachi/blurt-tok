import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabaseClient';
import { Client } from '@beblurt/dblurt';

const PLATFORM_FEE_PERCENT = 0.10;

const PLATFORM_ACCOUNT = 'acomunity';

const PLATFORM_POSTING_KEY = 'ACOMUNITY_POSTING_KEY_HERE';

const client = new Client(['https://rpc.blurt.world']);

/* =====================================================
   APP AUTH (NO BLURT KEYS STORED)
===================================================== */

export const storeCredentials = async (username) => {
  try {
    await SecureStore.setItemAsync('app_username', username);
    return true;
  } catch (err) {
    console.error('Error storing credentials:', err);
    return false;
  }
};

export const getCredentials = async () => {
  try {
    const username = await SecureStore.getItemAsync('app_username');
    return { username };
  } catch (err) {
    console.error('Error getting credentials:', err);
    return { username: null };
  }
};

export const removeCredentials = async () => {
  try {
    await SecureStore.deleteItemAsync('app_username');
    return true;
  } catch (err) {
    console.error('Error removing credentials:', err);
    return false;
  }
};

/* =====================================================
   POST VIDEO (CORE)
===================================================== */

export const postVideo = async (caption, tags = [], videoUrl) => {
  try {
    const { username } = await getCredentials();
    if (!username) throw new Error('User not authenticated');
    if (!videoUrl) throw new Error('Missing video URL');

    const permlink = `blurttok-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;

    const finalTags = [
      'blurttok',
      'blurt-tokreel',
      ...tags.filter(Boolean),
    ].slice(0, 5);

    const body = `
🎬 **Posted by @${username}**

${caption}

![video](${videoUrl})
`.trim();

    const jsonMetadata = {
      tags: finalTags,
      app: 'blurttok',
      type: 'video',
      posted_by: username,
      platform_account: PLATFORM_ACCOUNT,
      video: {
        url: videoUrl,
      },
    };

    // 🔥 POST TO BLURT (acomunity signs)
    await client.broadcast.comment(
      {
        parent_author: '',
        parent_permlink: 'blurttok',
        author: PLATFORM_ACCOUNT,
        permlink,
        title: caption.slice(0, 100),
        body,
        json_metadata: JSON.stringify(jsonMetadata),
      },
      PLATFORM_POSTING_KEY
    );

    // 🔥 SAVE TO SUPABASE
    const { error } = await supabase.from('videos').insert({
      blurt_author: PLATFORM_ACCOUNT,
      posted_by: username,
      permlink,
      caption,
      video_url: videoUrl,
      tags: finalTags,
    });

    if (error) throw error;

    return {
      success: true,
      permlink,
      posted_by: username,
      author: PLATFORM_ACCOUNT,
    };
  } catch (err) {
    console.error('Error posting video:', err);
    return {
      success: false,
      error: err.message || 'Failed to post video',
    };
  }
};

/* =====================================================
   REWARD VIDEO
===================================================== */

export const rewardVideo = async (author, permlink, amount) => {
  try {
    if (!author || !permlink || !amount) {
      throw new Error('Invalid reward parameters');
    }

    const fee = amount * PLATFORM_FEE_PERCENT;
    const creatorAmount = amount - fee;

    // Platform fee (optional bookkeeping)
    if (fee > 0) {
      await client.broadcast.transfer(
        {
          from: PLATFORM_ACCOUNT,
          to: PLATFORM_ACCOUNT,
          amount: `${fee.toFixed(3)} BLURT`,
          memo: `Platform fee for ${permlink}`,
        },
        PLATFORM_POSTING_KEY
      );
    }

    // Reward creator
    const result = await client.broadcast.transfer(
      {
        from: PLATFORM_ACCOUNT,
        to: author,
        amount: `${creatorAmount.toFixed(3)} BLURT`,
        memo: `Reward for ${permlink}`,
      },
      PLATFORM_POSTING_KEY
    );

    // Save reward in Supabase
    const { data: video } = await supabase
      .from('videos')
      .select('id')
      .eq('permlink', permlink)
      .single();

    if (video?.id) {
      await supabase.from('rewards').insert({
        video_id: video.id,
        amount: creatorAmount,
        fee,
      });
    }

    return {
      success: true,
      transactionId: result.id,
      amount: creatorAmount,
      fee,
    };
  } catch (err) {
    console.error('Error rewarding video:', err);
    return {
      success: false,
      error: err.message || 'Failed to send reward',
    };
  }
};

/* =====================================================
   POST COMMENT
===================================================== */

export const postComment = async (parentAuthor, parentPermlink, content) => {
  try {
    const { username } = await getCredentials();
    if (!username) throw new Error('User not authenticated');
    if (!content) throw new Error('Empty comment');

    const permlink = `comment-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;

    await client.broadcast.comment(
      {
        parent_author: parentAuthor,
        parent_permlink: parentPermlink,
        author: PLATFORM_ACCOUNT,
        permlink,
        title: '',
        body: `💬 @${username}\n\n${content}`,
        json_metadata: JSON.stringify({
          app: 'blurttok',
          type: 'comment',
          posted_by: username,
        }),
      },
      PLATFORM_POSTING_KEY
    );

    return {
      success: true,
      permlink,
    };
  } catch (err) {
    console.error('Error posting comment:', err);
    return {
      success: false,
      error: err.message || 'Failed to post comment',
    };
  }
};

/* =====================================================
   GET PLATFORM BALANCE
===================================================== */

export const getPlatformBalance = async () => {
  try {
    const accounts = await client.database.getAccounts([PLATFORM_ACCOUNT]);
    if (!accounts || !accounts[0]) return null;

    const acc = accounts[0];
    return {
      balance: parseFloat(acc.balance),
      rewardBalance: parseFloat(acc.reward_balance),
    };
  } catch (err) {
    console.error('Error getting platform balance:', err);
    return null;
  }
};
