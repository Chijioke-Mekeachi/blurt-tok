import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  Dimensions,
  Animated,
  Easing,
  StatusBar,
  Switch,
  Platform,
  Linking,
} from 'react-native';
import NeonButton from '../components/NeonButton';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { formatTimeAgo } from '../utils/format';
import { theme } from './theme';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = height * 0.3;

export default function WalletScreen() {
  const { user, loading: authLoading } = useAuth();
  const {
    balance,
    transactions,
    pendingDeposits,
    loading,
    formatAmount,
    refresh,
    fundWalletWithPaystack,
    fundWalletWithBlurt,
    transferToUser,
    transferToBlurtAccount,
    checkDepositStatus,
    searchUsers,
    calculateFee,
    sendingTransfer,
  } = useWallet(user?.username);

  const [refreshing, setRefreshing] = useState(false);
  const [fundModalVisible, setFundModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [blockchainTransferModalVisible, setBlockchainTransferModalVisible] = useState(false);
  const [depositStatusModalVisible, setDepositStatusModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [blockchainTransferAmount, setBlockchainTransferAmount] = useState('');
  const [receiverUsername, setReceiverUsername] = useState('');
  const [blurtAccount, setBlurtAccount] = useState('');
  const [transferMemo, setTransferMemo] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('paystack'); // 'paystack' or 'blurt'
  const [blurtPrivateKey, setBlurtPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [email, setEmail] = useState('');
  const [isInternalTransfer, setIsInternalTransfer] = useState(true); // true for internal, false for blockchain
  const [activeTab, setActiveTab] = useState('overview');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Balance pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleFundWallet = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const amountNum = parseFloat(amount);
      
      if (paymentMethod === 'paystack') {
        if (!email) {
          Alert.alert('Error', 'Please enter your email for Paystack payment');
          return;
        }

        const result = await fundWalletWithPaystack(amountNum, email);
        
        if (result.success) {
          Alert.alert(
            'Payment Initialized',
            `Paystack payment of ${amount} BLURT initialized.\n\n${result.message}`,
            [
              { 
                text: 'Open Paystack', 
                onPress: () => {
                  // In production, open the Paystack payment link
                  if (Platform.OS === 'web') {
                    window.open(result.paymentLink, '_blank');
                  } else {
                    Linking.openURL(result.paymentLink);
                  }
                  setSelectedDeposit({ transactionId: result.transactionId, amount: amountNum });
                  setDepositStatusModalVisible(true);
                }
              },
              { 
                text: 'Later', 
                style: 'cancel',
                onPress: () => {
                  setFundModalVisible(false);
                  setAmount('');
                  setEmail('');
                }
              }
            ]
          );
        } else {
          Alert.alert('Error', result.error || 'Failed to initialize Paystack payment');
        }
      } else {
        // Blurt wallet method
        if (!blurtPrivateKey) {
          Alert.alert('Error', 'Please enter your Blurt private key');
          return;
        }

        const result = await fundWalletWithBlurt(amountNum, blurtPrivateKey);
        
        if (result.success) {
          Alert.alert(
            'Deposit Instructions',
            `To deposit ${amount} BLURT:\n\n` +
            `1. Send ${amount} BLURT to:\n   Account: ${result.fundingInstructions.account}\n\n` +
            `2. INCLUDE THIS MEMO:\n   ${result.fundingInstructions.memo}\n\n` +
            `3. After sending, click "I Have Paid" to confirm.`,
            [
              { 
                text: 'Copy Memo', 
                onPress: () => {
                  Alert.alert('Copied', 'Memo copied to clipboard');
                  setSelectedDeposit(result.fundingInstructions);
                  setDepositStatusModalVisible(true);
                }
              },
              { 
                text: 'I Have Paid', 
                onPress: () => {
                  setSelectedDeposit(result.fundingInstructions);
                  setDepositStatusModalVisible(true);
                }
              },
              { 
                text: 'Later', 
                style: 'cancel',
                onPress: () => {
                  setFundModalVisible(false);
                  setAmount('');
                  setBlurtPrivateKey('');
                }
              }
            ]
          );
        } else {
          Alert.alert('Error', result.error || 'Failed to process deposit request');
        }
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Something went wrong');
    }
  };

  const handleCheckDeposit = async () => {
    if (!selectedDeposit) return;

    Alert.alert(
      'Confirm Deposit',
      `Are you sure you have sent ${selectedDeposit.amount} BLURT with memo:\n\n${selectedDeposit.memo}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Check Now', 
          onPress: async () => {
            const result = await checkDepositStatus(selectedDeposit.transactionId);
            if (result.success) {
              Alert.alert('Success', `Deposit confirmed! New balance: ${formatAmount(result.newBalance)}`, [
                { 
                  text: 'OK', 
                  onPress: () => {
                    setDepositStatusModalVisible(false);
                    setSelectedDeposit(null);
                    setBlurtPrivateKey('');
                    refresh();
                  }
                }
              ]);
            } else {
              Alert.alert('Not Confirmed', result.error || 'Deposit not found. Please make sure you:\n1. Sent the correct amount\n2. Included the exact memo\n3. Wait a few minutes for blockchain confirmation.');
            }
          }
        }
      ]
    );
  };

  const handleInternalTransfer = async () => {
    if (!receiverUsername || !transferAmount) {
      Alert.alert('Error', 'Please enter receiver and amount');
      return;
    }

    if (parseFloat(transferAmount) <= 0) {
      Alert.alert('Error', 'Amount must be greater than 0');
      return;
    }

    if (parseFloat(transferAmount) > balance.available) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    if (receiverUsername === user?.username) {
      Alert.alert('Error', 'Cannot transfer to yourself');
      return;
    }

    const { fee, netAmount } = calculateFee(parseFloat(transferAmount));

    Alert.alert(
      'Confirm Transfer',
      `Send ${transferAmount} BLURT to @${receiverUsername}?\n\n` +
      `• Platform Fee: ${formatAmount(fee)}\n` +
      `• Receiver Gets: ${formatAmount(netAmount)}\n` +
      `• Total Deducted: ${formatAmount(parseFloat(transferAmount))}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm Transfer', 
          onPress: async () => {
            try {
              const result = await transferToUser(
                receiverUsername,
                parseFloat(transferAmount),
                transferMemo || `TRANSFER_${Date.now()}`,
                `Transfer to @${receiverUsername}`
              );
              
              if (result.success) {
                Alert.alert('Success', result.message, [
                  { 
                    text: 'OK', 
                    onPress: () => {
                      setTransferModalVisible(false);
                      setReceiverUsername('');
                      setTransferAmount('');
                      setTransferMemo('');
                      refresh();
                    }
                  }
                ]);
              } else {
                Alert.alert('Error', result.error || 'Transfer failed');
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Transfer failed');
            }
          }
        }
      ]
    );
  };

  const handleBlockchainTransfer = async () => {
    if (!blurtAccount || !blockchainTransferAmount || !blurtPrivateKey) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (parseFloat(blockchainTransferAmount) <= 0) {
      Alert.alert('Error', 'Amount must be greater than 0');
      return;
    }

    if (parseFloat(blockchainTransferAmount) > balance.available) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    if (blurtAccount === user?.username) {
      Alert.alert('Error', 'Cannot transfer to yourself');
      return;
    }

    Alert.alert(
      'Confirm Blockchain Transfer',
      `Send ${blockchainTransferAmount} BLURT to Blurt account @${blurtAccount}?\n\n` +
      `• This will be sent directly on the Blurt blockchain\n` +
      `• Transaction cannot be reversed\n` +
      `• Make sure the account exists on Blurt blockchain`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm Transfer', 
          onPress: async () => {
            try {
              const result = await transferToBlurtAccount(
                blurtAccount,
                parseFloat(blockchainTransferAmount),
                blurtPrivateKey,
                transferMemo || `SENT_FROM_BLURTOK_${Date.now()}`
              );
              
              if (result.success) {
                Alert.alert('Success', result.message, [
                  { 
                    text: 'OK', 
                    onPress: () => {
                      setBlockchainTransferModalVisible(false);
                      setBlurtAccount('');
                      setBlockchainTransferAmount('');
                      setBlurtPrivateKey('');
                      setTransferMemo('');
                      refresh();
                    }
                  }
                ]);
              } else {
                Alert.alert('Error', result.error || 'Blockchain transfer failed');
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Transfer failed');
            }
          }
        }
      ]
    );
  };

  const handleSearchUsers = async (query) => {
    setReceiverUsername(query);
    if (query.length >= 2) {
      setSearchLoading(true);
      const results = await searchUsers(query);
      setSearchResults(results);
      setSearchLoading(false);
    } else {
      setSearchResults([]);
    }
  };

  const selectUser = (username) => {
    setReceiverUsername(username);
    setSearchResults([]);
  };

  const handleQuickAmount = (quickAmount) => {
    setAmount(quickAmount.toString());
  };

  const handleTransferQuickAmount = (quickAmount) => {
    if (isInternalTransfer) {
      setTransferAmount(quickAmount.toString());
    } else {
      setBlockchainTransferAmount(quickAmount.toString());
    }
  };

  const openTransferModal = () => {
    if (isInternalTransfer) {
      setTransferModalVisible(true);
    } else {
      setBlockchainTransferModalVisible(true);
    }
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[theme.colors.background, '#0f172a']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingCard}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons name="wallet" size={80} color={theme.colors.primary} />
          </Animated.View>
          <Text style={styles.loadingTitle}>Loading Wallet</Text>
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loadingSpinner} />
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.authContainer}>
        <LinearGradient
          colors={[theme.colors.background, '#0f172a']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.authCard}>
          <Animated.View 
            style={[
              styles.authIconCircle,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <Ionicons name="wallet-outline" size={80} color={theme.colors.primary} />
          </Animated.View>
          <Text style={styles.authTitle}>WALLET LOCKED</Text>
          <Text style={styles.authSubtitle}>Login to access your digital wallet</Text>
          <NeonButton
            title="GO TO LOGIN"
            onPress={() => router.push('/auth')}
            variant="primary"
            size="large"
            style={styles.authButton}
          />
        </View>
      </View>
    );
  }

  const totalBalance = balance.available + balance.rewards;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Animated Background */}
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#334155']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Floating Particles */}
      <View style={styles.particles}>
        {[...Array(10)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.6 + 0.4,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            title="Updating..."
            titleColor={theme.colors.primary}
          />
        }
      >
        {/* Animated Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.3)', 'rgba(99, 102, 241, 0.2)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
          
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Your Digital Wallet</Text>
              <View style={styles.usernameContainer}>
                <Ionicons name="person-circle" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.username}>@{user.username}</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={refresh}
            >
              <LinearGradient
                colors={[theme.colors.primary, '#8b5cf6']}
                style={styles.refreshButtonGradient}
              >
                <Ionicons name="refresh" size={22} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Total Balance Card */}
          <Animated.View 
            style={[
              styles.totalBalanceCard,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <LinearGradient
              colors={['rgba(30, 41, 59, 0.8)', 'rgba(15, 23, 42, 0.9)']}
              style={styles.balanceGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
              <View style={styles.balanceBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.balanceBadgeText}>LIVE</Text>
              </View>
            </View>
            
            <Text style={styles.totalBalance}>{formatAmount(totalBalance)}</Text>
            <Text style={styles.balanceSubtitle}>BLURT</Text>
            
            <View style={styles.balanceBreakdown}>
              <View style={styles.balanceItem}>
                <LinearGradient
                  colors={['#10b981', '#34d399']}
                  style={styles.balanceDot}
                />
                <View style={styles.balanceTextContainer}>
                  <Text style={styles.balanceItemLabel}>Available</Text>
                  <Text style={styles.balanceItemValue}>{formatAmount(balance.available)}</Text>
                </View>
              </View>
              
              <View style={styles.separator} />
              
              <View style={styles.balanceItem}>
                <LinearGradient
                  colors={['#f59e0b', '#fbbf24']}
                  style={styles.balanceDot}
                />
                <View style={styles.balanceTextContainer}>
                  <Text style={styles.balanceItemLabel}>Rewards</Text>
                  <Text style={styles.balanceItemValue}>{formatAmount(balance.rewards)}</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Transfer Type Toggle */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>TRANSFER TYPE</Text>
          <View style={styles.transferTypeToggle}>
            <View style={styles.toggleContainer}>
              <TouchableOpacity 
                style={[styles.toggleOption, isInternalTransfer && styles.toggleOptionActive]}
                onPress={() => setIsInternalTransfer(true)}
              >
                <Ionicons 
                  name="people" 
                  size={20} 
                  color={isInternalTransfer ? '#fff' : theme.colors.textSecondary} 
                />
                <Text style={[styles.toggleText, isInternalTransfer && styles.toggleTextActive]}>
                  Internal Transfer
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.toggleOption, !isInternalTransfer && styles.toggleOptionActive]}
                onPress={() => setIsInternalTransfer(false)}
              >
                <Ionicons 
                  name="globe" 
                  size={20} 
                  color={!isInternalTransfer ? '#fff' : theme.colors.textSecondary} 
                />
                <Text style={[styles.toggleText, !isInternalTransfer && styles.toggleTextActive]}>
                  Blockchain Transfer
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.toggleDescription}>
              {isInternalTransfer 
                ? 'Send to users on BlurtTok platform' 
                : 'Send directly to any Blurt blockchain account'}
            </Text>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: 'add-circle', label: 'Deposit', color: '#10b981', onPress: () => setFundModalVisible(true) },
              { icon: 'send', label: 'Send', color: '#3b82f6', onPress: openTransferModal },
              { icon: 'trending-up', label: 'Earn', color: '#8b5cf6', onPress: () => router.push('/feed') },
              { icon: 'receipt', label: 'History', color: '#f59e0b', onPress: () => router.push('/transactions') },
            ].map((action, index) => (
              <Animated.View
                key={action.label}
                style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
              >
                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={action.onPress}
                >
                  <LinearGradient
                    colors={[`${action.color}20`, `${action.color}10`]}
                    style={styles.actionIcon}
                  >
                    <Ionicons name={action.icon} size={28} color={action.color} />
                  </LinearGradient>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Recent Transactions */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECENT TRANSACTIONS</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/transactions')}
            >
              <Text style={styles.viewAll}>View All</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingTransactions}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : transactions.length > 0 ? (
            <View style={styles.transactionsList}>
              {transactions.slice(0, 5).map((transaction, index) => (
                <Animated.View
                  key={transaction.id}
                  style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  }}
                >
                  <TouchableOpacity
                    style={styles.transactionCard}
                    onPress={() => Alert.alert(
                      'Transaction Details',
                      `Type: ${transaction.type.toUpperCase()}\n` +
                      `Amount: ${formatAmount(transaction.amount)}\n` +
                      `Fee: ${formatAmount(transaction.fee)}\n` +
                      `Status: ${transaction.status}\n` +
                      `Date: ${new Date(transaction.date).toLocaleString()}\n` +
                      `Description: ${transaction.description}`
                    )}
                  >
                    <View style={styles.transactionLeft}>
                      <LinearGradient
                        colors={transaction.type === 'sent' 
                          ? ['#ef4444', '#dc2626'] 
                          : ['#10b981', '#059669']
                        }
                        style={styles.transactionIcon}
                      >
                        <Ionicons
                          name={transaction.type === 'sent' ? 'arrow-up' : 'arrow-down'}
                          size={18}
                          color="#fff"
                        />
                      </LinearGradient>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionTitle} numberOfLines={1}>
                          {transaction.description}
                        </Text>
                        <Text style={styles.transactionTime}>
                          {formatTimeAgo(transaction.date)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.transactionRight}>
                      <Text style={[
                        styles.transactionAmount,
                        { color: transaction.type === 'sent' ? '#ef4444' : '#10b981' }
                      ]}>
                        {transaction.type === 'sent' ? '-' : '+'}{formatAmount(transaction.amount)}
                      </Text>
                      {transaction.fee > 0 && (
                        <Text style={styles.transactionFee}>Fee: {formatAmount(transaction.fee)}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyText}>
                Make your first deposit or transfer to get started
              </Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => setFundModalVisible(true)}
              >
                <LinearGradient
                  colors={[theme.colors.primary, '#8b5cf6']}
                  style={styles.emptyButtonGradient}
                >
                  <Text style={styles.emptyButtonText}>Deposit Funds</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Enhanced Deposit Modal with Payment Methods */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={fundModalVisible}
        onRequestClose={() => setFundModalVisible(false)}
        statusBarTranslucent
      >
        <BlurView intensity={90} style={StyleSheet.absoluteFill}>
          <View style={styles.modalOverlay}>
            <Animated.View 
              style={[
                styles.modalContainer,
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
              ]}
            >
              <LinearGradient
                colors={['rgba(30, 41, 59, 0.95)', 'rgba(15, 23, 42, 0.98)']}
                style={styles.modalContent}
              >
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <Ionicons name="wallet" size={24} color={theme.colors.primary} />
                    <Text style={styles.modalTitle}>Deposit Funds</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={() => {
                      setFundModalVisible(false);
                      setPaymentMethod('paystack');
                      setBlurtPrivateKey('');
                    }}
                  >
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
                
                {/* Payment Method Tabs */}
                <View style={styles.paymentMethodTabs}>
                  <TouchableOpacity 
                    style={[styles.paymentMethodTab, paymentMethod === 'paystack' && styles.activePaymentMethodTab]}
                    onPress={() => setPaymentMethod('paystack')}
                  >
                    <Ionicons 
                      name="card" 
                      size={20} 
                      color={paymentMethod === 'paystack' ? theme.colors.primary : theme.colors.textSecondary} 
                    />
                    <Text style={[styles.paymentMethodText, paymentMethod === 'paystack' && styles.activePaymentMethodText]}>
                      Paystack
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.paymentMethodTab, paymentMethod === 'blurt' && styles.activePaymentMethodTab]}
                    onPress={() => setPaymentMethod('blurt')}
                  >
                    <Ionicons 
                      name="key" 
                      size={20} 
                      color={paymentMethod === 'blurt' ? theme.colors.primary : theme.colors.textSecondary} 
                    />
                    <Text style={[styles.paymentMethodText, paymentMethod === 'blurt' && styles.activePaymentMethodText]}>
                      Blurt Wallet
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                  {/* Amount Input */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Amount (BLURT)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="Enter amount"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                    
                    {/* Quick Amount Buttons */}
                    <View style={styles.quickAmounts}>
                      {[10, 50, 100, 500, 1000].map((quickAmount) => (
                        <TouchableOpacity
                          key={quickAmount}
                          style={styles.quickAmountButton}
                          onPress={() => handleQuickAmount(quickAmount)}
                        >
                          <Text style={styles.quickAmountText}>{quickAmount}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                  {/* Payment Method Specific Fields */}
                  {paymentMethod === 'paystack' ? (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Paystack Details</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Email for payment receipt"
                        placeholderTextColor={theme.colors.textSecondary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      <Text style={styles.infoText}>
                        You will be redirected to Paystack to complete the payment. We support all major cards and bank transfers.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Blurt Wallet Details</Text>
                      
                      <View style={styles.passwordContainer}>
                        <TextInput
                          style={[styles.modalInput, styles.passwordInput]}
                          value={blurtPrivateKey}
                          onChangeText={setBlurtPrivateKey}
                          placeholder="Enter your Blurt active private key"
                          placeholderTextColor={theme.colors.textSecondary}
                          secureTextEntry={!showPrivateKey}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <TouchableOpacity 
                          style={styles.showPasswordButton}
                          onPress={() => setShowPrivateKey(!showPrivateKey)}
                        >
                          <Ionicons 
                            name={showPrivateKey ? 'eye-off' : 'eye'} 
                            size={20} 
                            color={theme.colors.textSecondary} 
                          />
                        </TouchableOpacity>
                      </View>
                      
                      <Text style={styles.warningText}>
                        ⚠️ Your private key is never stored on our servers. Only your active private key (starts with '5') is required to sign transactions.
                      </Text>
                      
                      <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                        <Text style={styles.infoBoxText}>
                          After entering your key, you'll receive deposit instructions with a unique memo.
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {/* Deposit Button */}
                  <TouchableOpacity 
                    style={styles.depositButton}
                    onPress={handleFundWallet}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={[theme.colors.primary, '#8b5cf6']}
                      style={styles.depositButtonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name={paymentMethod === 'paystack' ? 'card' : 'key'} size={20} color="#fff" />
                          <Text style={styles.depositButtonText}>
                            {paymentMethod === 'paystack' ? 'Pay with Paystack' : 'Continue with Blurt Wallet'}
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              </LinearGradient>
            </Animated.View>
          </View>
        </BlurView>
      </Modal>
      
      {/* Internal Transfer Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={transferModalVisible}
        onRequestClose={() => setTransferModalVisible(false)}
        statusBarTranslucent
      >
        <BlurView intensity={90} style={StyleSheet.absoluteFill}>
          <View style={styles.modalOverlay}>
            <Animated.View 
              style={[
                styles.modalContainer,
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
              ]}
            >
              <LinearGradient
                colors={['rgba(30, 41, 59, 0.95)', 'rgba(15, 23, 42, 0.98)']}
                style={styles.modalContent}
              >
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <Ionicons name="send" size={24} color={theme.colors.primary} />
                    <Text style={styles.modalTitle}>Send to User</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={() => {
                      setTransferModalVisible(false);
                      setReceiverUsername('');
                      setTransferAmount('');
                      setTransferMemo('');
                      setSearchResults([]);
                    }}
                  >
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                  {/* Receiver Search */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Send to @</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={receiverUsername}
                      onChangeText={handleSearchUsers}
                      placeholder="Search users on BlurtTok"
                      placeholderTextColor={theme.colors.textSecondary}
                      autoCapitalize="none"
                    />
                    
                    {/* Search Results */}
                    {searchLoading ? (
                      <View style={styles.searchLoading}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                        <Text style={styles.searchLoadingText}>Searching...</Text>
                      </View>
                    ) : searchResults.length > 0 ? (
                      <View style={styles.searchResults}>
                        {searchResults.map((user) => (
                          <TouchableOpacity
                            key={user.id}
                            style={styles.searchResultItem}
                            onPress={() => selectUser(user.username)}
                          >
                            <View style={styles.searchResultAvatar}>
                              {user.avatar ? (
                                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                              ) : (
                                <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
                              )}
                            </View>
                            <View style={styles.searchResultInfo}>
                              <Text style={styles.searchResultUsername}>@{user.username}</Text>
                              {user.displayName && (
                                <Text style={styles.searchResultName}>{user.displayName}</Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : receiverUsername.length >= 2 ? (
                      <Text style={styles.noResultsText}>No users found</Text>
                    ) : null}
                  </View>
                  
                  {/* Amount Input */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Amount (BLURT)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={transferAmount}
                      onChangeText={setTransferAmount}
                      placeholder="Enter amount"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                    
                    {/* Quick Amount Buttons */}
                    <View style={styles.quickAmounts}>
                      {[1, 5, 10, 50, 100].map((quickAmount) => (
                        <TouchableOpacity
                          key={quickAmount}
                          style={styles.quickAmountButton}
                          onPress={() => handleTransferQuickAmount(quickAmount)}
                        >
                          <Text style={styles.quickAmountText}>{quickAmount}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                  {/* Memo (Optional) */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Memo (Optional)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={transferMemo}
                      onChangeText={setTransferMemo}
                      placeholder="Add a message or note"
                      placeholderTextColor={theme.colors.textSecondary}
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                  
                  {/* Fee Calculation */}
                  {transferAmount && parseFloat(transferAmount) > 0 && (
                    <View style={styles.feeCalculation}>
                      <Text style={styles.feeTitle}>Transfer Details</Text>
                      <View style={styles.feeRow}>
                        <Text style={styles.feeLabel}>Amount</Text>
                        <Text style={styles.feeValue}>{formatAmount(parseFloat(transferAmount) || 0)}</Text>
                      </View>
                      <View style={styles.feeRow}>
                        <Text style={styles.feeLabel}>Platform Fee (2.5%)</Text>
                        <Text style={styles.feeValue}>{formatAmount(calculateFee(parseFloat(transferAmount) || 0).fee)}</Text>
                      </View>
                      <View style={styles.feeDivider} />
                      <View style={styles.feeRow}>
                        <Text style={styles.feeLabel}>Receiver Gets</Text>
                        <Text style={[styles.feeValue, styles.netAmount]}>
                          {formatAmount(calculateFee(parseFloat(transferAmount) || 0).netAmount)}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {/* Send Button */}
                  <TouchableOpacity 
                    style={styles.sendButton}
                    onPress={handleInternalTransfer}
                    disabled={!receiverUsername || !transferAmount || sendingTransfer}
                  >
                    <LinearGradient
                      colors={[theme.colors.primary, '#8b5cf6']}
                      style={styles.sendButtonGradient}
                    >
                      {sendingTransfer ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="send" size={20} color="#fff" />
                          <Text style={styles.sendButtonText}>Send Transfer</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              </LinearGradient>
            </Animated.View>
          </View>
        </BlurView>
      </Modal>
      
      {/* Blockchain Transfer Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={blockchainTransferModalVisible}
        onRequestClose={() => setBlockchainTransferModalVisible(false)}
        statusBarTranslucent
      >
        <BlurView intensity={90} style={StyleSheet.absoluteFill}>
          <View style={styles.modalOverlay}>
            <Animated.View 
              style={[
                styles.modalContainer,
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
              ]}
            >
              <LinearGradient
                colors={['rgba(30, 41, 59, 0.95)', 'rgba(15, 23, 42, 0.98)']}
                style={styles.modalContent}
              >
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <Ionicons name="globe" size={24} color={theme.colors.primary} />
                    <Text style={styles.modalTitle}>Send to Blurt Account</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={() => {
                      setBlockchainTransferModalVisible(false);
                      setBlurtAccount('');
                      setBlockchainTransferAmount('');
                      setBlurtPrivateKey('');
                      setTransferMemo('');
                    }}
                  >
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                  {/* Blurt Account Input */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Blurt Account</Text>
                    <View style={styles.accountInputContainer}>
                      <Text style={styles.accountPrefix}>@</Text>
                      <TextInput
                        style={[styles.modalInput, styles.accountInput]}
                        value={blurtAccount}
                        onChangeText={setBlurtAccount}
                        placeholder="username"
                        placeholderTextColor={theme.colors.textSecondary}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  
                  {/* Amount Input */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Amount (BLURT)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={blockchainTransferAmount}
                      onChangeText={setBlockchainTransferAmount}
                      placeholder="Enter amount"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                    
                    {/* Quick Amount Buttons */}
                    <View style={styles.quickAmounts}>
                      {[1, 5, 10, 50, 100].map((quickAmount) => (
                        <TouchableOpacity
                          key={quickAmount}
                          style={styles.quickAmountButton}
                          onPress={() => handleTransferQuickAmount(quickAmount)}
                        >
                          <Text style={styles.quickAmountText}>{quickAmount}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                  {/* Private Key Input */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Your Blurt Active Key</Text>
                    
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={[styles.modalInput, styles.passwordInput]}
                        value={blurtPrivateKey}
                        onChangeText={setBlurtPrivateKey}
                        placeholder="Enter your active private key"
                        placeholderTextColor={theme.colors.textSecondary}
                        secureTextEntry={!showPrivateKey}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity 
                        style={styles.showPasswordButton}
                        onPress={() => setShowPrivateKey(!showPrivateKey)}
                      >
                        <Ionicons 
                          name={showPrivateKey ? 'eye-off' : 'eye'} 
                          size={20} 
                          color={theme.colors.textSecondary} 
                        />
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.warningText}>
                      ⚠️ Your private key is only used to sign this transaction and is never stored.
                    </Text>
                  </View>
                  
                  {/* Memo (Optional) */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Memo (Optional)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={transferMemo}
                      onChangeText={setTransferMemo}
                      placeholder="Add a message"
                      placeholderTextColor={theme.colors.textSecondary}
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                  
                  {/* Important Notice */}
                  <View style={styles.noticeBox}>
                    <Ionicons name="warning" size={24} color="#f59e0b" />
                    <Text style={styles.noticeText}>
                      This transaction will be broadcast directly to the Blurt blockchain and cannot be reversed. Make sure the recipient account exists.
                    </Text>
                  </View>
                  
                  {/* Send Button */}
                  <TouchableOpacity 
                    style={styles.sendButton}
                    onPress={handleBlockchainTransfer}
                    disabled={!blurtAccount || !blockchainTransferAmount || !blurtPrivateKey || sendingTransfer}
                  >
                    <LinearGradient
                      colors={[theme.colors.primary, '#8b5cf6']}
                      style={styles.sendButtonGradient}
                    >
                      {sendingTransfer ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="globe" size={20} color="#fff" />
                          <Text style={styles.sendButtonText}>Send to Blockchain</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              </LinearGradient>
            </Animated.View>
          </View>
        </BlurView>
      </Modal>
      
      {/* Deposit Status Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={depositStatusModalVisible}
        onRequestClose={() => setDepositStatusModalVisible(false)}
        statusBarTranslucent
      >
        <BlurView intensity={90} style={StyleSheet.absoluteFill}>
          <View style={styles.modalOverlay}>
            <Animated.View 
              style={[
                styles.modalContainer,
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
              ]}
            >
              <LinearGradient
                colors={['rgba(30, 41, 59, 0.95)', 'rgba(15, 23, 42, 0.98)']}
                style={styles.modalContent}
              >
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <Ionicons name="time" size={24} color={theme.colors.primary} />
                    <Text style={styles.modalTitle}>Check Deposit Status</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={() => setDepositStatusModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.depositStatusContent}>
                  {selectedDeposit && (
                    <>
                      <View style={styles.depositInfo}>
                        <View style={styles.depositInfoRow}>
                          <Text style={styles.depositInfoLabel}>Amount:</Text>
                          <Text style={styles.depositInfoValue}>{formatAmount(selectedDeposit.amount)}</Text>
                        </View>
                        <View style={styles.depositInfoRow}>
                          <Text style={styles.depositInfoLabel}>Memo:</Text>
                          <Text style={styles.depositInfoValue} selectable>{selectedDeposit.memo}</Text>
                        </View>
                        <View style={styles.depositInfoRow}>
                          <Text style={styles.depositInfoLabel}>To Account:</Text>
                          <Text style={styles.depositInfoValue}>{selectedDeposit.account}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.statusInstructions}>
                        <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
                        <Text style={styles.instructionsText}>
                          Click the button below to check if your deposit has been confirmed on the blockchain.
                        </Text>
                      </View>
                      
                      <TouchableOpacity 
                        style={styles.checkStatusButton}
                        onPress={handleCheckDeposit}
                      >
                        <LinearGradient
                          colors={[theme.colors.primary, '#8b5cf6']}
                          style={styles.checkStatusButtonGradient}
                        >
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.checkStatusButtonText}>Check Deposit Status</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </LinearGradient>
            </Animated.View>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  particles: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  particle: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: theme.colors.primary,
    borderRadius: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 24,
    padding: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 24,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  authCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 32,
    padding: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
    width: '100%',
    maxWidth: 400,
  },
  authIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  authTitle: {
    color: theme.colors.primary,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
    textShadowColor: 'rgba(59, 130, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  authSubtitle: {
    color: '#cbd5e1',
    fontSize: 16,
    marginBottom: 32,
  },
  authButton: {
    width: '100%',
    marginTop: 16,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    minHeight: HEADER_HEIGHT,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    zIndex: 1,
  },
  greeting: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  username: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginLeft: 8,
  },
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  refreshButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalBalanceCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'hidden',
  },
  balanceGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  balanceBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  totalBalance: {
    color: '#fff',
    fontSize: 52,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginBottom: 4,
    textShadowColor: 'rgba(59, 130, 246, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  balanceSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 24,
  },
  balanceBreakdown: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  balanceDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  balanceTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceItemLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '500',
  },
  balanceItemValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    marginVertical: 8,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  transferTypeToggle: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  toggleOptionActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  toggleText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  toggleTextActive: {
    color: '#fff',
  },
  toggleDescription: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAll: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 48 - 24) / 4,
    alignItems: 'center',
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingTransactions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    marginLeft: 12,
  },
  transactionsList: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.05)',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionTime: {
    color: '#94a3b8',
    fontSize: 12,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  transactionFee: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  emptyState: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalContent: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.1)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 12,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    maxHeight: 500,
    paddingHorizontal: 24,
  },
  paymentMethodTabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.1)',
  },
  paymentMethodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activePaymentMethodTab: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  paymentMethodText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  activePaymentMethodText: {
    color: theme.colors.primary,
  },
  modalSection: {
    marginTop: 24,
  },
  modalSectionTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    color: theme.colors.text,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  showPasswordButton: {
    position: 'absolute',
    right: 16,
    top: 14,
    height: 20,
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  accountPrefix: {
    color: theme.colors.text,
    fontSize: 16,
    paddingLeft: 16,
    paddingRight: 8,
  },
  accountInput: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 0,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  quickAmountButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  quickAmountText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  warningText: {
    color: '#f59e0b',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  infoBoxText: {
    color: '#cbd5e1',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  noticeText: {
    color: '#f59e0b',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  depositButton: {
    marginTop: 32,
    marginBottom: 32,
    borderRadius: 12,
    overflow: 'hidden',
  },
  depositButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  depositButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sendButton: {
    marginTop: 24,
    marginBottom: 32,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  searchLoadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginLeft: 8,
  },
  searchResults: {
    marginTop: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.1)',
  },
  searchResultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  searchResultInfo: {
    marginLeft: 12,
    flex: 1,
  },
  searchResultUsername: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchResultName: {
    color: '#94a3b8',
    fontSize: 12,
  },
  noResultsText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  feeCalculation: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  feeTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feeLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  feeValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  feeDivider: {
    height: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    marginVertical: 8,
  },
  netAmount: {
    color: '#10b981',
    fontSize: 16,
  },
  depositStatusContent: {
    padding: 24,
  },
  depositInfo: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  depositInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  depositInfoLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  depositInfoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  statusInstructions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  instructionsText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
  checkStatusButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkStatusButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  checkStatusButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});