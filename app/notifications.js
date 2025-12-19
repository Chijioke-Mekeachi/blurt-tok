

import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  getUnreadNotificationCount 
} from '../services/supabaseService';
import { theme } from './theme';
import { supabase } from '../services/supabaseClient';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await getUserNotifications(user.id);
      setNotifications(data);
      
      const count = await getUnreadNotificationCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // Subscribe to real-time notifications
      const subscription = supabase
        .channel('notifications_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Notification change:', payload);
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      
      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
      
      // Update unread count
      if (unreadCount > 0) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    
    try {
      await markAllNotificationsAsRead(user.id);
      
      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return { icon: 'heart', color: theme.colors.error };
      case 'reward':
      case 'tip':
        return { icon: 'flash', color: theme.colors.warning };
      case 'comment':
        return { icon: 'chatbubble', color: theme.colors.primary };
      case 'follow':
        return { icon: 'person-add', color: theme.colors.accent };
      case 'mention':
        return { icon: 'at', color: theme.colors.secondary };
      case 'system':
        return { icon: 'notifications', color: theme.colors.text };
      default:
        return { icon: 'notifications', color: theme.colors.text };
    }
  };

  const getNotificationMessage = (notification) => {
    const fromUser = notification.from_user?.username || 'Someone';
    
    switch (notification.type) {
      case 'like':
        return `@${fromUser} liked your video "${notification.video_caption || 'your content'}"`;
      case 'reward':
      case 'tip':
        return `@${fromUser} sent ${notification.amount || 'some'} BLURT for "${notification.video_caption || 'your content'}"`;
      case 'comment':
        return `@${fromUser} commented "${notification.comment_text || 'on your video'}"`;
      case 'follow':
        return `@${fromUser} started following you`;
      case 'mention':
        return `@${fromUser} mentioned you in "${notification.video_caption || 'a video'}"`;
      case 'system':
        return notification.message || 'System notification';
      default:
        return 'New notification';
    }
  };

  const formatNotificationTime = (createdAt) => {
    if (!createdAt) return 'Just now';
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return created.toLocaleDateString();
  };

  const filterNotifications = (type) => {
    if (type === 'all') return notifications;
    return notifications.filter(n => n.type === type);
  };

  const renderNotification = ({ item }) => {
    const { icon, color } = getNotificationIcon(item.type);
    const message = getNotificationMessage(item);
    const time = formatNotificationTime(item.created_at);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.read && styles.notificationUnread,
        ]}
        onPress={() => handleMarkAsRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.notificationIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        
        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>{message}</Text>
          <Text style={styles.notificationTime}>{time}</Text>
        </View>
        
        {!item.read && (
          <View style={styles.unreadDot} />
        )}
      </TouchableOpacity>
    );
  };

  const NotificationFilter = ({ type, label, icon }) => (
    <TouchableOpacity 
      style={styles.filterButton}
      onPress={() => setActiveFilter(type)}
    >
      <Ionicons 
        name={icon} 
        size={18} 
        color={activeFilter === type ? theme.colors.primary : theme.colors.textSecondary} 
      />
      <Text style={[
        styles.filterText,
        { color: activeFilter === type ? theme.colors.primary : theme.colors.textSecondary }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const [activeFilter, setActiveFilter] = useState('all');
  const filteredNotifications = filterNotifications(activeFilter);

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>NOTIFICATIONS</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{unreadCount}</Text>
            </View>
          )}
        </View>
        
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>MARK ALL READ</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <NotificationFilter type="all" label="All" icon="notifications" />
        <NotificationFilter type="reward" label="Rewards" icon="flash" />
        <NotificationFilter type="like" label="Likes" icon="heart" />
        <NotificationFilter type="comment" label="Comments" icon="chatbubble" />
        <NotificationFilter type="follow" label="Followers" icon="person-add" />
      </View>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.notificationsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-off-outline"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>
              {activeFilter === 'all' 
                ? 'Engage with the community to receive notifications'
                : `No ${activeFilter} notifications yet`}
            </Text>
          </View>
        }
      />

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{notifications.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{unreadCount}</Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {notifications.filter(n => n.type === 'reward' || n.type === 'tip').length}
          </Text>
          <Text style={styles.statLabel}>Rewards</Text>
        </View>
      </View>

      {/* Network Status */}
      <View style={styles.networkStatus}>
        <View style={styles.networkDot} />
        <Text style={styles.networkText}>
          Real-time notifications from Supabase
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 60,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    marginRight: theme.spacing.sm,
  },
  unreadBadge: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.round,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  unreadCount: {
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: '700',
  },
  markAllButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  markAllText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  filterButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  filterText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  notificationsList: {
    padding: theme.spacing.lg,
    paddingBottom: 120,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.glass,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  notificationUnread: {
    backgroundColor: theme.colors.primary + '10',
    borderColor: theme.colors.primary + '30',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: theme.spacing.xs,
  },
  notificationTime: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  statsBar: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassBorder,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.glassBorder,
  },
  networkStatus: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.glass,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassBorder,
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginRight: theme.spacing.sm,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  networkText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
});