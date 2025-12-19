// app/auth.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import NeonButton from '../components/NeonButton';
import { theme } from './theme';
import { pickImage, takePhoto } from '../services/avatarService';

export default function AuthScreen() {
  const { signup, login, loading, error } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showProfileFields, setShowProfileFields] = useState(false);
  const [profileData, setProfileData] = useState({
    display_name: '',
    bio: '',
    location: '',
    website: '',
    twitter_username: '',
    instagram_username: '',
    tiktok_username: '',
  });
  const [avatarImage, setAvatarImage] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);

  const handleAuth = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (isLogin) {
      const result = await login(username, password);
      if (result.success) {
        Alert.alert('Success', 'Logged in successfully');
        router.replace('/feed');
      } else {
        Alert.alert('Error', result.error);
      }
    } else {
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }

      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }

      if (!showProfileFields) {
        setShowProfileFields(true);
        return;
      }

      const result = await signup(username, password, profileData, avatarImage);
      if (result.success) {
        Alert.alert('Success', 'Account created successfully!');
        router.replace('/');
      } else {
        Alert.alert('Error', result.error);
      }
    }
  };

  const handleSkipProfile = () => {
    setShowProfileFields(false);
    handleAuth();
  };

  const updateProfileField = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const pickAvatar = async () => {
    try {
      const image = await pickImage();
      if (image) {
        setAvatarImage(image);
        setAvatarPreview(image.uri);
      }
      setShowAvatarOptions(false);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const captureAvatar = async () => {
    try {
      const image = await takePhoto();
      if (image) {
        setAvatarImage(image);
        setAvatarPreview(image.uri);
      }
      setShowAvatarOptions(false);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to take photo');
    }
  };

  const removeAvatar = () => {
    setAvatarImage(null);
    setAvatarPreview(null);
  };

  if (showProfileFields) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowProfileFields(false)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>COMPLETE YOUR PROFILE</Text>
          </View>

          <View style={styles.profileCard}>
            <Text style={styles.profileText}>
              Add some details to personalize your profile (optional)
            </Text>

            {/* Avatar Upload Section */}
            <View style={styles.avatarSection}>
              <Text style={styles.avatarLabel}>Profile Photo (Optional)</Text>
              
              <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={() => setShowAvatarOptions(true)}
              >
                {avatarPreview ? (
                  <Image source={{ uri: avatarPreview }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="camera" size={32} color={theme.colors.textSecondary} />
                    <Text style={styles.avatarPlaceholderText}>Tap to upload</Text>
                  </View>
                )}
                <View style={styles.avatarOverlay}>
                  <Ionicons name="add-circle" size={24} color="#fff" />
                </View>
              </TouchableOpacity>
              
              {avatarPreview && (
                <TouchableOpacity 
                  style={styles.removeAvatarButton}
                  onPress={removeAvatar}
                >
                  <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                  <Text style={styles.removeAvatarText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Display Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  value={profileData.display_name}
                  onChangeText={(text) => updateProfileField('display_name', text)}
                  placeholder="What should we call you?"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bio</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <Ionicons name="text-outline" size={20} color={theme.colors.textSecondary} style={[styles.inputIcon, styles.textAreaIcon]} />
                <TextInput
                  style={[styles.inputWithIcon, styles.textArea]}
                  value={profileData.bio}
                  onChangeText={(text) => updateProfileField('bio', text)}
                  placeholder="Tell everyone about yourself..."
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  value={profileData.location}
                  onChangeText={(text) => updateProfileField('location', text)}
                  placeholder="City, Country"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Website</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="link-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  value={profileData.website}
                  onChangeText={(text) => updateProfileField('website', text)}
                  placeholder="https://yourwebsite.com"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="url"
                />
              </View>
            </View>

            <Text style={styles.socialTitle}>Social Media (Optional)</Text>
            
            <View style={styles.socialInputGroup}>
              <Ionicons name="logo-twitter" size={20} color="#1DA1F2" style={styles.socialIcon} />
              <TextInput
                style={styles.socialInput}
                value={profileData.twitter_username}
                onChangeText={(text) => updateProfileField('twitter_username', text)}
                placeholder="@username"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.socialInputGroup}>
              <Ionicons name="logo-instagram" size={20} color="#E1306C" style={styles.socialIcon} />
              <TextInput
                style={styles.socialInput}
                value={profileData.instagram_username}
                onChangeText={(text) => updateProfileField('instagram_username', text)}
                placeholder="@username"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.socialInputGroup}>
              <Ionicons name="logo-tiktok" size={20} color="#000" style={styles.socialIcon} />
              <TextInput
                style={styles.socialInput}
                value={profileData.tiktok_username}
                onChangeText={(text) => updateProfileField('tiktok_username', text)}
                placeholder="@username"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.profileActions}>
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={handleSkipProfile}
              >
                <Text style={styles.skipText}>Skip for now</Text>
              </TouchableOpacity>
              
              <NeonButton
                title="COMPLETE SIGNUP"
                onPress={handleAuth}
                variant="primary"
                size="large"
                loading={loading}
                style={styles.submitButton}
              />
            </View>
          </View>
        </ScrollView>

        {/* Avatar Options Modal */}
        {showAvatarOptions && (
          <View style={styles.avatarModalOverlay}>
            <View style={styles.avatarModalContainer}>
              <Text style={styles.avatarModalTitle}>Choose Profile Photo</Text>
              
              <TouchableOpacity 
                style={styles.avatarOptionButton}
                onPress={pickAvatar}
              >
                <Ionicons name="images" size={24} color={theme.colors.primary} />
                <Text style={styles.avatarOptionText}>Choose from Gallery</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.avatarOptionButton}
                onPress={captureAvatar}
              >
                <Ionicons name="camera" size={24} color={theme.colors.primary} />
                <Text style={styles.avatarOptionText}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.avatarOptionButton}
                onPress={() => setShowAvatarOptions(false)}
              >
                <Text style={styles.avatarCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="rocket" size={60} color={theme.colors.primary} />
          </View>
          <Text style={styles.logoText}>BLURTTOK</Text>
          <Text style={styles.tagline}>The Social Blockchain Video Platform</Text>
        </View>

        <View style={styles.authCard}>
          <Text style={styles.authTitle}>
            {isLogin ? 'WELCOME BACK' : 'JOIN BLURTTOK'}
          </Text>
          
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={20} color={theme.colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="at" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={22} 
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {!isLogin && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.textSecondary}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                    size={22} 
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <NeonButton
            title={isLogin ? 'LOGIN' : 'CONTINUE'}
            onPress={handleAuth}
            variant="primary"
            size="large"
            loading={loading}
            style={styles.authButton}
          />

          <TouchableOpacity
            style={styles.switchMode}
            onPress={() => {
              setIsLogin(!isLogin);
              setUsername('');
              setPassword('');
              setConfirmPassword('');
              setShowPassword(false);
              setShowConfirmPassword(false);
            }}
          >
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.switchHighlight}>
                {isLogin ? 'Sign up' : 'Log in'}
              </Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.infoText}>
            By {isLogin ? 'logging in' : 'signing up'}, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by Supabase & Blurt Blockchain</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: theme.spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: theme.spacing.xl,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  logoText: {
    color: theme.colors.primary,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: theme.spacing.sm,
  },
  tagline: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  authCard: {
    backgroundColor: theme.colors.glass,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  authTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
    letterSpacing: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error + '20',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  formGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  inputIcon: {
    marginLeft: theme.spacing.md,
    marginRight: theme.spacing.sm,
  },
  inputWithIcon: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  eyeIcon: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.xs,
  },
  authButton: {
    width: '100%',
    marginTop: theme.spacing.md,
  },
  switchMode: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  switchText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  switchHighlight: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.glassBorder,
  },
  dividerText: {
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.md,
    fontSize: 12,
  },
  infoText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  footerText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  // Profile fields styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    flex: 1,
  },
  profileCard: {
    backgroundColor: theme.colors.glass,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  profileText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  // Avatar Styles
  avatarSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  avatarLabel: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.glassBorder,
    position: 'relative',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  removeAvatarText: {
    color: theme.colors.error,
    fontSize: 14,
    marginLeft: theme.spacing.xs,
  },
  // Avatar Modal Styles
  avatarModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarModalContainer: {
    backgroundColor: theme.colors.glass,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  avatarModalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  avatarOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  avatarOptionText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  avatarCancelText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
  },
  textAreaIcon: {
    marginTop: theme.spacing.md,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  socialTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  socialInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    marginBottom: theme.spacing.md,
  },
  socialIcon: {
    marginLeft: theme.spacing.md,
    marginRight: theme.spacing.sm,
  },
  socialInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderWidth: 0,
  },
  profileActions: {
    marginTop: theme.spacing.xl,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  skipText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    width: '100%',
  },
});