// services/avatarService.js
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabaseClient';
import { decode } from 'base64-arraybuffer';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export const pickImage = async (options = {}) => {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Gallery permissions are required');
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
      ...options,
    });

    if (result.canceled) {
      return null;
    }

    // Compress and optimize the image
    const manipulatedImage = await manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 512, height: 512 } }],
      { compress: 0.8, format: SaveFormat.JPEG, base64: true }
    );

    return {
      uri: manipulatedImage.uri,
      base64: manipulatedImage.base64,
      width: manipulatedImage.width,
      height: manipulatedImage.height,
    };
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
};

export const takePhoto = async (options = {}) => {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Camera permissions are required');
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
      ...options,
    });

    if (result.canceled) {
      return null;
    }

    // Compress and optimize the image
    const manipulatedImage = await manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 512, height: 512 } }],
      { compress: 0.8, format: SaveFormat.JPEG, base64: true }
    );

    return {
      uri: manipulatedImage.uri,
      base64: manipulatedImage.base64,
      width: manipulatedImage.width,
      height: manipulatedImage.height,
    };
  } catch (error) {
    console.error('Error taking photo:', error);
    throw error;
  }
};

export const uploadAvatar = async (userId, base64Image) => {
  try {
    if (!base64Image) {
      throw new Error('No image provided');
    }

    const fileName = `avatar_${userId}_${Date.now()}.jpg`;
    const filePath = `avatars/${fileName}`;

    // Convert base64 to ArrayBuffer
    const arrayBuffer = decode(base64Image);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
};

export const deleteOldAvatar = async (avatarUrl) => {
  try {
    if (!avatarUrl) return;

    // Skip if it's a DiceBear default avatar
    if (avatarUrl.includes('dicebear.com')) {
      return;
    }

    // Extract filename from URL
    const fileName = avatarUrl.split('/').pop();
    const filePath = `avatars/${fileName}`;

    // Delete from storage
    const { error } = await supabase.storage
      .from('avatars')
      .remove([filePath]);

    if (error) {
      console.warn('Could not delete old avatar:', error.message);
    }
  } catch (error) {
    console.warn('Error deleting old avatar:', error);
  }
};

export const getDefaultAvatarUrl = (username) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}&backgroundType=gradientLinear&accessoriesProbability=30&backgroundColor=b6e3f4,c0aede,d1d4f9`;
};

export const getAvatarFromStorage = async (userId) => {
  try {
    const { data, error } = await supabase.storage
      .from('avatars')
      .list(`avatars/`, {
        search: `avatar_${userId}_`,
        limit: 1,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error || !data || data.length === 0) {
      return null;
    }

    const fileName = data[0].name;
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(`avatars/${fileName}`);

    return publicUrl;
  } catch (error) {
    console.error('Error getting avatar from storage:', error);
    return null;
  }
};

export const compressImage = async (uri, maxSize = 1024) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    // If file is already small, return as is
    if (fileInfo.size <= maxSize * 1024) {
      return await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    // Calculate compression ratio
    const compressionRatio = (maxSize * 1024) / fileInfo.size;
    const quality = Math.max(0.1, Math.min(1, compressionRatio));

    // Compress image
    const manipulatedImage = await manipulateAsync(
      uri,
      [],
      { compress: quality, format: SaveFormat.JPEG, base64: true }
    );

    return manipulatedImage.base64;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
};