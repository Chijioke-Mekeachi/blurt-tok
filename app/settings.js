import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import NeonButton from '../components/NeonButton';
import { useAuth } from '../hooks/useAuth';
import { theme } from './theme';

export default function SettingsScreen() {
  const { user, logout, updatePostingKey } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [biometricAuth, setBiometricAuth] = useState(false);
  const [isChangingKey, setIsChangingKey] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'LOGOUT',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth');
          },
        },
      ]
    );
  };

  const handleChangePostingKey = () => {
    Alert.prompt(
      'Change Posting Key',
      'Enter your new Blurt posting key (starts with "5..."):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'UPDATE',
          style: 'destructive',
          onPress: async (newKey) => {
            if (!newKey || !newKey.startsWith('5')) {
              Alert.alert('Invalid Key', 'Posting key must start with "5"');
              return;
            }

            setIsChangingKey(true);
            const result = await updatePostingKey(newKey);
            setIsChangingKey(false);

            if (result.success) {
              Alert.alert('Success', 'Posting key updated successfully');
            } else {
              Alert.alert('Error', result.error);
            }
          },
        },
      ],
      'secure-text'
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached data from the app.\n\n' +
      'Your blockchain data is permanent, but this will clear local storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'CLEAR CACHE',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Cache Cleared', 'Local cache has been cleared');
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Feature coming soon!\n\n' +
      'This will allow you to export your video data and transaction history.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About BlurtTok',
      'BlurtTok v1.0\n\n' +
      'A decentralized TikTok-style platform on the Blurt blockchain.\n\n' +
      'All videos are stored permanently on-chain.\n' +
      '10% platform fee supports development.\n\n' +
      'Built with React Native & Expo\n' +
      'Blockchain: Blurt\n' +
      'Developer: @trevorcodz',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'BlurtTok Privacy Policy:\n\n' +
      '1. Your posting key is stored locally only\n' +
      '2. Videos are public on the Blurt blockchain\n' +
      '3. We index public blockchain data for performance\n' +
      '4. No personal data is collected or sold\n' +
      '5. All blockchain interactions are client-side\n\n' +
      'Your privacy is our priority.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const SettingItem = ({ icon, title, subtitle, onPress, rightComponent }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon} size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && (
            <Text style={styles.settingSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  const SwitchSetting = ({ icon, title, subtitle, value, onValueChange }) => (
    <SettingItem
      icon={icon}
      title={title}
      subtitle={subtitle}
      rightComponent={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: theme.colors.surfaceLight, true: theme.colors.primary }}
          thumbColor={theme.colors.text}
        />
      }
    />
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>SETTINGS</Text>
        <View style={styles.glowLine} />
      </View>

      {/* User Info */}
      <View style={styles.userSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.username}>@{user?.username || 'Not logged in'}</Text>
        <Text style={styles.userStatus}>
          {user ? 'Connected to Blurt blockchain' : 'Please login'}
        </Text>
      </View>

      {/* Account Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        
        <SettingItem
          icon="key"
          title="Change Posting Key"
          subtitle="Update your Blurt posting key"
          onPress={handleChangePostingKey}
        />
        
        <SettingItem
          icon="download"
          title="Export Data"
          subtitle="Download your content and history"
          onPress={handleExportData}
        />
        
        <SettingItem
          icon="trash"
          title="Clear Cache"
          subtitle="Remove locally stored data"
          onPress={handleClearCache}
        />
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>APP SETTINGS</Text>
        
        <SwitchSetting
          icon="moon"
          title="Dark Mode"
          subtitle="Futuristic cyberpunk theme"
          value={darkMode}
          onValueChange={setDarkMode}
        />
        
        <SwitchSetting
          icon="play"
          title="Auto-play Videos"
          subtitle="Play videos automatically in feed"
          value={autoPlay}
          onValueChange={setAutoPlay}
        />
        
        <SwitchSetting
          icon="cellular"
          title="Data Saver"
          subtitle="Reduce data usage"
          value={dataSaver}
          onValueChange={setDataSaver}
        />
        
        <SwitchSetting
          icon="notifications"
          title="Notifications"
          subtitle="Receive likes, comments, and rewards"
          value={notifications}
          onValueChange={setNotifications}
        />
        
        <SwitchSetting
          icon="finger-print"
          title="Biometric Auth"
          subtitle="Use fingerprint or face ID"
          value={biometricAuth}
          onValueChange={setBiometricAuth}
        />
      </View>

      {/* Blockchain Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BLOCKCHAIN</Text>
        
        <SettingItem
          icon="globe"
          title="Network Status"
          subtitle="Connected to Blurt mainnet"
          onPress={() => Alert.alert('Network Status', 'Connected to Blurt mainnet\nAll systems operational')}
        />
        
        <SettingItem
          icon="shield-checkmark"
          title="Security Info"
          subtitle="How your data is protected"
          onPress={handlePrivacyPolicy}
        />
        
        <SettingItem
          icon="help-circle"
          title="Blockchain Tips"
          subtitle="Learn about Blurt blockchain"
          onPress={() => Alert.alert(
            'Blockchain Tips',
            '• Your videos are permanent\n' +
            '• Transactions cannot be deleted\n' +
            '• 10% fee supports development\n' +
            '• Your posting key = your identity\n' +
            '• Never share your posting key'
          )}
        />
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ABOUT</Text>
        
        <SettingItem
          icon="information-circle"
          title="About BlurtTok"
          subtitle="Version 1.0"
          onPress={handleAbout}
        />
        
        <SettingItem
          icon="heart"
          title="Rate the App"
          subtitle="Share your feedback"
          onPress={() => Alert.alert('Rate BlurtTok', 'Feature coming soon!')}
        />
        
        <SettingItem
          icon="share-social"
          title="Share App"
          subtitle="Tell your friends about BlurtTok"
          onPress={() => Alert.alert('Share', 'Feature coming soon!')}
        />
      </View>

      {/* Logout Button */}
      {user && (
        <View style={styles.logoutSection}>
          <NeonButton
            title="LOGOUT"
            onPress={handleLogout}
            variant="error"
            size="large"
            style={styles.logoutButton}
          />
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          All data stored on Blurt blockchain
        </Text>
        <Text style={styles.footerSubtext}>
          Developer: @trevorcodz
        </Text>
        <View style={styles.scanline} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    color: theme.colors.primary,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: theme.spacing.sm,
  },
  glowLine: {
    width: 100,
    height: 2,
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  userSection: {
    alignItems: 'center',
    backgroundColor: theme.colors.glass,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  avatarText: {
    color: theme.colors.background,
    fontSize: 36,
    fontWeight: 'bold',
  },
  username: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  userStatus: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    backgroundColor: theme.colors.glass,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: theme.spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  logoutSection: {
    marginBottom: theme.spacing.xl,
  },
  logoutButton: {
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: theme.spacing.xxl,
  },
  footerText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: theme.spacing.xs,
    fontFamily: 'monospace',
  },
  footerSubtext: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginBottom: theme.spacing.lg,
  },
  scanline: {
    width: '80%',
    height: 1,
    backgroundColor: theme.colors.primary,
    opacity: 0.3,
  },
});