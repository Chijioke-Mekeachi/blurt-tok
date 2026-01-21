// components/Toast.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../app/theme';

const { width } = Dimensions.get('window');

const ToastContext = React.createContext();

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const [animation] = useState(new Animated.Value(0));

  const showToast = (message, type = 'info', duration = 3000) => {
    setToast({ message, type });
    
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(duration),
      Animated.timing(animation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  };

  const hideToast = () => {
    Animated.timing(animation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setToast(null);
    });
  };

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, StatusBar.currentHeight || 40],
  });

  const getToastConfig = () => {
    switch (toast?.type) {
      case 'success':
        return {
          backgroundColor: '#10b981',
          icon: 'checkmark-circle',
          iconColor: '#fff',
        };
      case 'error':
        return {
          backgroundColor: '#ef4444',
          icon: 'alert-circle',
          iconColor: '#fff',
        };
      case 'warning':
        return {
          backgroundColor: '#f59e0b',
          icon: 'warning',
          iconColor: '#fff',
        };
      default:
        return {
          backgroundColor: theme.colors.primary,
          icon: 'information-circle',
          iconColor: '#fff',
        };
    }
  };

  const toastConfig = getToastConfig();

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              backgroundColor: toastConfig.backgroundColor,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.toastContent}>
            <Ionicons
              name={toastConfig.icon}
              size={24}
              color={toastConfig.iconColor}
              style={styles.toastIcon}
            />
            <Text style={styles.toastMessage}>{toast.message}</Text>
            <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toastIcon: {
    marginRight: 12,
  },
  toastMessage: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
});