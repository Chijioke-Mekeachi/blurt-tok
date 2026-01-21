// hooks/useWallet.js
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Alert } from 'react-native';

// Function to generate random string for memos
const generateRandomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Function to validate Blurt private key format
const validateBlurtPrivateKey = (key) => {
  if (!key || typeof key !== 'string') return false;
  
  // Basic validation for Blurt private keys
  const prefix = key.substring(0, 2);
  const validPrefixes = ['5J', '5K', '5H', '5W', '5Q', '5R', '5S', '5T', '5U', '5V'];
  return validPrefixes.some(p => key.startsWith(p)) && key.length >= 51;
};

export const useWallet = (username) => {
  const [balance, setBalance] = useState({
    blurt: 0,
    rewards: 0,
    available: 0,
    accountId: '',
  });
  const [transactions, setTransactions] = useState([]);
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingTransfer, setSendingTransfer] = useState(false);

  // Real-time subscription for balance updates
  useEffect(() => {
    if (!username) return;

    let balanceSubscription;
    let transactionsSubscription;

    const setupRealtime = async () => {
      try {
        // Get user ID for subscription
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .single();

        if (!userData) return;

        // Subscribe to balance changes
        balanceSubscription = supabase
          .channel('balance_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'balances',
              filter: `user_id=eq.${userData.id}`,
            },
            (payload) => {
              console.log('Balance changed:', payload);
              loadWalletData(); // Refresh balance data
            }
          )
          .subscribe();

        // Subscribe to transaction changes
        transactionsSubscription = supabase
          .channel('transaction_changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'wallet_transactions',
              filter: `sender_id=eq.${userData.id}`,
            },
            () => loadWalletData()
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'wallet_transactions',
              filter: `receiver_id=eq.${userData.id}`,
            },
            () => loadWalletData()
          )
          .subscribe();

      } catch (error) {
        console.error('Error setting up realtime:', error);
      }
    };

    setupRealtime();

    return () => {
      if (balanceSubscription) {
        balanceSubscription.unsubscribe();
      }
      if (transactionsSubscription) {
        transactionsSubscription.unsubscribe();
      }
    };
  }, [username]);

  // Helper function to find user by username or display name
  const findUserByUsernameOrDisplayName = useCallback(async (usernameOrDisplayName) => {
    if (!usernameOrDisplayName) return null;

    try {
      // First, try to find by username in users table
      const { data: userByUsername, error: userError } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', usernameOrDisplayName)
        .single();

      if (!userError && userByUsername) {
        return userByUsername;
      }

      // If not found by username, try to find by display_name in profiles table
      const { data: profileByDisplayName, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name, users(username)')
        .eq('display_name', usernameOrDisplayName)
        .single();

      if (!profileError && profileByDisplayName) {
        return {
          id: profileByDisplayName.user_id,
          username: profileByDisplayName.users?.username || usernameOrDisplayName
        };
      }

      // Also search by partial match on display name
      const { data: profilesByPartialMatch, error: partialError } = await supabase
        .from('profiles')
        .select('user_id, display_name, users(username)')
        .ilike('display_name', `%${usernameOrDisplayName}%`)
        .limit(1)
        .single();

      if (!partialError && profilesByPartialMatch) {
        return {
          id: profilesByPartialMatch.user_id,
          username: profilesByPartialMatch.users?.username || usernameOrDisplayName
        };
      }

      // Finally, search by partial match on username
      const { data: userByPartialMatch, error: userPartialError } = await supabase
        .from('users')
        .select('id, username')
        .ilike('username', `%${usernameOrDisplayName}%`)
        .limit(1)
        .single();

      if (!userPartialError && userByPartialMatch) {
        return userByPartialMatch;
      }

      return null;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  }, []);

  const loadWalletData = useCallback(async () => {
    console.log('Loading wallet data for:', username);
    
    if (!username) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user data with balance
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          username,
          balances (
            account_id,
            available_balance,
            reward_balance,
            total_balance
          )
        `)
        .eq('username', username)
        .single();

      if (userError) throw userError;

      if (userData && userData.balances && userData.balances.length > 0) {
        const balanceData = userData.balances[0];
        setBalance({
          blurt: balanceData.total_balance || 0,
          rewards: balanceData.reward_balance || 0,
          available: balanceData.available_balance || 0,
          accountId: balanceData.account_id || '',
        });

        // Get transactions
        const { data: transactionsData, error: txError } = await supabase
          .from('wallet_transactions')
          .select(`
            *,
            sender:users!wallet_transactions_sender_id_fkey(username),
            receiver:users!wallet_transactions_receiver_id_fkey(username)
          `)
          .or(`sender_id.eq.${userData.id},receiver_id.eq.${userData.id}`)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!txError && transactionsData) {
          const formattedTransactions = transactionsData.map(tx => {
            const isSent = tx.sender_id === userData.id;
            const isReceived = tx.receiver_id === userData.id;
            const otherUser = isSent ? tx.receiver : tx.sender;
            
            return {
              id: tx.id,
              type: isSent ? 'sent' : 'received',
              amount: tx.amount,
              fee: tx.fee || 0,
              date: tx.created_at,
              description: getTransactionDescription(tx, isSent, otherUser),
              status: tx.status,
              memo: tx.memo,
            };
          });

          setTransactions(formattedTransactions);

          // Get pending deposits
          const { data: pendingData } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('sender_id', userData.id)
            .eq('type', 'deposit')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

          setPendingDeposits(pendingData || []);
        }
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [username]);

  const getTransactionDescription = (transaction, isSent, otherUser) => {
    switch (transaction.type) {
      case 'transfer':
        return isSent 
          ? `Transfer to @${otherUser?.username || 'unknown'}`
          : `Transfer from @${otherUser?.username || 'unknown'}`;
      case 'deposit':
        return 'Wallet deposit';
      case 'withdrawal':
        return 'Withdrawal request';
      case 'reward':
        return isSent
          ? `Reward sent to creator`
          : `Reward received from viewer`;
      default:
        return transaction.description || 'Transaction';
    }
  };

  useEffect(() => {
    if (username) {
      loadWalletData();
    }
  }, [username, loadWalletData]);

  // Fund wallet via Paystack
  const fundWalletWithPaystack = useCallback(async (amount, email) => {
    if (!username) {
      throw new Error('Not authenticated');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    try {
      setLoading(true);
      setError(null);

      // Get user ID
      const { data: userData } = await supabase
        .from('users')
        .select('id, email')
        .eq('username', username)
        .single();

      if (!userData) {
        throw new Error('User not found');
      }

      // Create pending transaction
      const { data: transactionData, error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          sender_id: userData.id,
          receiver_id: userData.id, // Self for deposit
          amount: amount,
          fee: 0,
          memo: `PAYSTACK_DEPOSIT_${generateRandomString(8)}`,
          type: 'deposit',
          status: 'pending',
          payment_method: 'paystack',
          description: `Paystack deposit of ${amount} BLURT`,
          metadata: {
            user_email: email || userData.email,
            payment_gateway: 'paystack'
          }
        })
        .select()
        .single();

      if (txError) throw txError;

      // For simulation, we'll return success and simulate payment confirmation
      // FIXED: Simplified return object to avoid syntax issues
      const response = {
        success: true,
        transactionId: transactionData.id,
        paymentLink: `https://paystack.com/pay/blurtok-${transactionData.id}`,
        amount: amount,
        message: 'Payment initialized successfully. Redirecting to Paystack...'
      };
      
      return response;
    } catch (err) {
      console.error('Error funding wallet via Paystack:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [username]);

  // Fund wallet via Blurt Wallet (using private key)
  const fundWalletWithBlurt = useCallback(async (amount, privateKey) => {
    if (!username) {
      throw new Error('Not authenticated');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Validate private key format
    if (!validateBlurtPrivateKey(privateKey)) {
      throw new Error('Invalid Blurt private key format');
    }

    try {
      setLoading(true);
      setError(null);

      // Get user ID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (!userData) {
        throw new Error('User not found');
      }

      // Get user's account ID from balance
      const { data: balanceData } = await supabase
        .from('balances')
        .select('account_id')
        .eq('user_id', userData.id)
        .single();

      // Generate unique memo for this transaction
      const memo = `BLURT_DEPOSIT_${generateRandomString(8)}_${Date.now()}`;

      // Create pending deposit transaction
      const { data: transactionData, error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          sender_id: userData.id,
          receiver_id: userData.id, // Self for deposit
          amount: amount,
          fee: 0,
          memo: memo,
          type: 'deposit',
          status: 'pending',
          payment_method: 'blurt_wallet',
          description: `Blurt wallet deposit of ${amount} BLURT`,
          metadata: {
            memo: memo,
            funding_account: 'user_provided',
            transaction_type: 'blurt_direct'
          }
        })
        .select()
        .single();

      if (txError) throw txError;

      return {
        success: true,
        fundingInstructions: {
          account: 'blurtok.treasury',
          accountId: balanceData?.account_id || 'N/A',
          memo: memo,
          amount: amount,
          transactionId: transactionData.id,
          timestamp: new Date().toISOString()
        },
        message: 'Deposit request created. Please send the specified amount with the memo.'
      };
    } catch (err) {
      console.error('Error funding wallet via Blurt:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [username]);

  const checkDepositStatus = useCallback(async (transactionId) => {
    try {
      setLoading(true);
      
      // Call the PostgreSQL function to confirm deposit
      const { data, error } = await supabase.rpc('confirm_pending_deposit', {
        transaction_id: transactionId,
        confirm_amount: 0 // Amount will be checked in the function
      });

      if (error) throw error;

      if (data && data.success) {
        // Refresh wallet data
        await loadWalletData();
        return {
          success: true,
          message: data.message || 'Deposit confirmed successfully',
          newBalance: data.new_balance
        };
      } else {
        return {
          success: false,
          error: data?.error || 'Failed to confirm deposit'
        };
      }
    } catch (error) {
      console.error('Error checking deposit:', error);
      return {
        success: false,
        error: error.message || 'Failed to check deposit status'
      };
    } finally {
      setLoading(false);
    }
  }, [loadWalletData]);

  // Internal transfer between platform users
  const transferToUser = useCallback(async (receiverUsernameOrDisplayName, amount, memo = '', description = '') => {
    if (!username) {
      throw new Error('Not authenticated');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (amount > balance.available) {
      throw new Error('Insufficient balance');
    }

    try {
      setSendingTransfer(true);
      setError(null);

      // Find receiver user by username or display name
      const receiverUser = await findUserByUsernameOrDisplayName(receiverUsernameOrDisplayName);
      
      if (!receiverUser) {
        throw new Error(`User "${receiverUsernameOrDisplayName}" not found in platform database`);
      }

      const receiverUsername = receiverUser.username;
      
      if (username === receiverUsername) {
        throw new Error('Cannot transfer to yourself');
      }

      // Check if receiver has a balance account
      const { data: receiverBalance, error: balanceError } = await supabase
        .from('balances')
        .select('user_id')
        .eq('user_id', receiverUser.id)
        .single();

      if (balanceError || !receiverBalance) {
        throw new Error(`User @${receiverUsername} does not have a wallet account`);
      }

      // Call the PostgreSQL function to transfer funds
      const { data, error } = await supabase.rpc('transfer_funds', {
        sender_username: username,
        receiver_username: receiverUsername,
        transfer_amount: amount,
        transfer_memo: memo || `TRANSFER_${generateRandomString(6)}`,
        transfer_description: description || `Transfer to @${receiverUsername}`
      });

      if (error) throw error;

      if (data && data.success) {
        // Refresh wallet data
        await loadWalletData();
        
        return {
          success: true,
          transactionId: data.transaction_id,
          amount: data.amount,
          fee: data.fee,
          netAmount: data.net_amount,
          receiverId: receiverUser.id,
          receiverUsername: receiverUsername,
          message: `Successfully transferred ${data.net_amount} BLURT to @${receiverUsername}`
        };
      } else {
        throw new Error(data?.error || 'Transfer failed');
      }
    } catch (error) {
      console.error('Error transferring funds:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setSendingTransfer(false);
    }
  }, [username, balance.available, loadWalletData, findUserByUsernameOrDisplayName]);

  // Direct Blurt blockchain transfer
  const transferToBlurtAccount = useCallback(async (blurtAccount, amount, privateKey, memo = '') => {
    if (!username) {
      throw new Error('Not authenticated');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (amount > balance.available) {
      throw new Error('Insufficient balance');
    }

    // Validate private key format
    if (!validateBlurtPrivateKey(privateKey)) {
      throw new Error('Invalid Blurt private key format');
    }

    try {
      setSendingTransfer(true);
      setError(null);

      // Get user ID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (!userData) {
        throw new Error('User not found');
      }

      // Create blockchain transfer transaction
      const { data: transactionData, error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          sender_id: userData.id,
          amount: amount,
          fee: 0,
          memo: memo || `BLOCKCHAIN_TRANSFER_${generateRandomString(6)}`,
          type: 'blockchain_transfer',
          status: 'pending',
          description: `Blockchain transfer to @${blurtAccount}`,
          metadata: {
            destination_account: blurtAccount,
            transaction_type: 'direct_blurt_transfer',
            memo: memo
          }
        })
        .select()
        .single();

      if (txError) throw txError;

      return {
        success: true,
        transactionId: transactionData.id,
        amount: amount,
        destination: blurtAccount,
        memo: memo,
        message: `Transfer of ${amount} BLURT to @${blurtAccount} initiated on blockchain`
      };
    } catch (error) {
      console.error('Error transferring to Blurt account:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setSendingTransfer(false);
    }
  }, [username, balance.available]);

  // Search users by username or display name
  const searchUsers = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      return [];
    }

    try {
      // Search in users table by username
      const { data: usersByUsername, error: usersError } = await supabase
        .from('users')
        .select('id, username')
        .ilike('username', `%${searchQuery}%`)
        .neq('username', username)
        .limit(5);

      // Search in profiles table by display_name
      const { data: profilesByDisplayName, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, users(username)')
        .ilike('display_name', `%${searchQuery}%`)
        .limit(5);

      // Combine and deduplicate results
      const userResults = usersByUsername || [];
      const profileResults = (profilesByDisplayName || []).map(profile => ({
        id: profile.user_id,
        username: profile.users?.username,
        display_name: profile.display_name
      }));

      // Merge results, preferring user results first
      const allResultsMap = new Map();
      
      // Add user results
      userResults.forEach(user => {
        allResultsMap.set(user.id, {
          id: user.id,
          username: user.username,
          displayName: user.username
        });
      });

      // Add profile results
      profileResults.forEach(profile => {
        if (allResultsMap.has(profile.id)) {
          const existing = allResultsMap.get(profile.id);
          existing.displayName = profile.display_name || existing.username;
        } else {
          allResultsMap.set(profile.id, {
            id: profile.id,
            username: profile.username || `user_${profile.id}`,
            displayName: profile.display_name || profile.username || `user_${profile.id}`
          });
        }
      });

      // Convert to array and limit
      const results = Array.from(allResultsMap.values()).slice(0, 10);

      // Get avatar URLs
      if (results.length > 0) {
        const userIds = results.map(user => user.id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, avatar_url')
          .in('user_id', userIds);

        if (profilesData) {
          const profileMap = {};
          profilesData.forEach(profile => {
            profileMap[profile.user_id] = profile;
          });

          results.forEach(user => {
            user.avatar = profileMap[user.id]?.avatar_url;
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }, [username]);

  // Get user details by ID
  const getUserDetails = useCallback(async (userId) => {
    try {
      // Get user basic info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        return null;
      }

      // Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', userId)
        .single();

      // Get user balance
      const { data: balanceData } = await supabase
        .from('balances')
        .select('available_balance, total_balance')
        .eq('user_id', userId)
        .single();

      return {
        id: userData.id,
        username: userData.username,
        displayName: profileData?.display_name || userData.username,
        avatar: profileData?.avatar_url,
        hasWallet: !!balanceData,
        balance: balanceData?.available_balance || 0,
        totalBalance: balanceData?.total_balance || 0
      };
    } catch (error) {
      console.error('Error getting user details:', error);
      return null;
    }
  }, []);

  const calculateFee = (amount) => {
    // Platform fee: 2.5% for internal transfers
    const fee = amount * 0.025;
    const netAmount = amount - fee;
    return { fee, netAmount };
  };

  const formatAmount = (amount) => {
    if (amount === undefined || amount === null) return '0.000 BLURT';
    return `${parseFloat(amount).toFixed(3)} BLURT`;
  };

  return {
    balance,
    transactions,
    pendingDeposits,
    loading,
    error,
    sendingTransfer,
    transferToUser,
    transferToBlurtAccount,
    fundWalletWithPaystack,
    fundWalletWithBlurt,
    checkDepositStatus,
    searchUsers,
    getUserDetails,
    findUserByUsernameOrDisplayName,
    calculateFee,
    formatAmount,
    refresh: loadWalletData,
  };
};