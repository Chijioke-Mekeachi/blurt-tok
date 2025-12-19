// hooks/useAuth.js
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';
import { uploadAvatar, deleteOldAvatar, getDefaultAvatarUrl } from '../services/avatarService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkStoredUser();
  }, []);

  const checkStoredUser = async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        // Verify the user still exists in database
        const { data: verifiedUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', parsedUser.id)
          .single();
        
        if (verifiedUser) {
          // Fetch fresh profile data
          const freshUser = await fetchUserWithProfile(parsedUser.username);
          if (freshUser) {
            setUser(freshUser);
            await AsyncStorage.setItem('user', JSON.stringify(freshUser));
          } else {
            setUser(parsedUser);
          }
        } else {
          // Clear invalid user
          await AsyncStorage.removeItem('user');
        }
      }
    } catch (error) {
      console.error('Error checking stored user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserWithProfile = async (username) => {
    try {
      console.log('Fetching user with profile for:', username);
      
      // First, get the user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (userError) {
        console.error('Error fetching user:', userError);
        return null;
      }

      if (!userData) {
        console.log('User not found:', username);
        return null;
      }

      console.log('Found user:', userData.id);

      // Then get the profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userData.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        // Profile doesn't exist yet, create one
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            user_id: userData.id,
            avatar_url: getDefaultAvatarUrl(username),
            display_name: userData.username
          })
          .select()
          .single();

        if (newProfile) {
          console.log('Created new profile:', newProfile.id);
          return {
            ...userData,
            profile: newProfile
          };
        }
        return userData;
      }

      console.log('Found profile:', profileData.id);
      
      return {
        ...userData,
        profile: profileData
      };
    } catch (error) {
      console.error('Error in fetchUserWithProfile:', error);
      return null;
    }
  };

  const signup = async (username, password, profileData = {}, avatarImage = null) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Starting signup for:', username);

      if (!username.trim() || !password.trim()) {
        throw new Error('Username and password are required');
      }

      if (username.trim().length < 3) {
        throw new Error('Username must be at least 3 characters');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const cleanUsername = username.trim().toLowerCase();

      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('username')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (existingUser) {
        throw new Error('Username already taken');
      }

      // Create auth record
      console.log('Creating auth record...');
      const { data: authData, error: authError } = await supabase
        .from('auth')
        .insert({
          username: cleanUsername,
          password_hash: password
        })
        .select()
        .single();

      if (authError) {
        console.error('Auth creation error:', authError);
        throw authError;
      }

      console.log('Auth record created:', authData.id);

      // Create user in users table
      console.log('Creating user...');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          username: cleanUsername,
          auth_id: authData.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) {
        console.error('User creation error:', userError);
        throw userError;
      }

      console.log('User created with ID:', userData.id);

      // Handle avatar upload if provided
      let avatarUrl = getDefaultAvatarUrl(cleanUsername);
      if (avatarImage && avatarImage.base64) {
        try {
          avatarUrl = await uploadAvatar(userData.id, avatarImage.base64);
          console.log('Avatar uploaded:', avatarUrl);
        } catch (avatarError) {
          console.warn('Failed to upload avatar, using default:', avatarError);
        }
      }

      // Create profile with provided data
      console.log('Creating profile...');
      const profilePayload = {
        user_id: userData.id,
        display_name: profileData.display_name || cleanUsername,
        avatar_url: avatarUrl,
        bio: profileData.bio || '',
        location: profileData.location || '',
        website: profileData.website || '',
        twitter_username: profileData.twitter_username || '',
        instagram_username: profileData.instagram_username || '',
        tiktok_username: profileData.tiktok_username || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: profileDataResult, error: profileError } = await supabase
        .from('profiles')
        .insert(profilePayload)
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Try simpler profile creation
        const simpleProfile = {
          user_id: userData.id,
          avatar_url: avatarUrl,
          display_name: cleanUsername
        };
        
        const { data: simpleProfileResult } = await supabase
          .from('profiles')
          .insert(simpleProfile)
          .select()
          .single();

        if (simpleProfileResult) {
          profileDataResult = simpleProfileResult;
        } else {
          throw new Error('Failed to create profile');
        }
      }

      // Create combined user object
      const completeUser = {
        ...userData,
        profile: profileDataResult
      };

      console.log('Complete user created:', completeUser.id);

      // Store in AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(completeUser));
      
      setUser(completeUser);
      console.log('Signup successful for user:', cleanUsername);
      return { success: true, data: completeUser };
    } catch (error) {
      console.error('Signup error:', error.message);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Login attempt for:', username);

      if (!username.trim() || !password.trim()) {
        throw new Error('Username and password are required');
      }

      const cleanUsername = username.trim().toLowerCase();

      // Verify credentials
      const { data: authData, error: authError } = await supabase
        .from('auth')
        .select('*')
        .eq('username', cleanUsername)
        .single();

      if (authError || !authData) {
        console.log('Auth not found or error:', authError);
        throw new Error('Invalid username or password');
      }

      if (authData.password_hash !== password) {
        console.log('Password mismatch');
        throw new Error('Invalid username or password');
      }

      // Get user with profile using our improved function
      console.log('Fetching user profile...');
      const userData = await fetchUserWithProfile(cleanUsername);

      if (!userData) {
        throw new Error('Failed to load user profile');
      }

      console.log('User data loaded:', userData.username);

      // Store in AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      console.log('Login successful for:', cleanUsername);
      return { success: true, data: userData };
    } catch (error) {
      console.error('Login error:', error.message);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Updating profile for user:', user?.id);

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Update profile
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update profile error:', updateError);
        throw updateError;
      }

      // Update local user object
      const updatedUser = {
        ...user,
        profile: data
      };

      // Update storage
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      console.log('Profile updated successfully');
      return { success: true, data: updatedUser };
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateAvatar = async (avatarImage) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      if (!avatarImage || !avatarImage.base64) {
        throw new Error('No image provided');
      }

      // Get current avatar URL for deletion
      const oldAvatarUrl = user?.profile?.avatar_url;

      // Upload new avatar
      const newAvatarUrl = await uploadAvatar(user.id, avatarImage.base64);
      
      // Delete old avatar
      await deleteOldAvatar(oldAvatarUrl);

      // Update profile with new avatar URL
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Update local user object
      const updatedUser = {
        ...user,
        profile: data
      };

      // Update storage
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      console.log('Avatar updated successfully');
      return { success: true, data: updatedUser };
    } catch (error) {
      console.error('Error updating avatar:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user:', user?.username);
      await AsyncStorage.removeItem('user');
      setUser(null);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Get user by username (for profile viewing)
  const getUserByUsername = async (username) => {
  try {
    const userData = await fetchUserWithProfile(username);
    return userData;
  } catch (error) {
    console.error('Error getting user by username:', error);
    return null;
  }
};

  return {
    user,
    loading,
    error,
    signup,
    login,
    logout,
    updateProfile,
    updateAvatar,
    getUserByUsername,
    isAuthenticated: !!user,
  };
};