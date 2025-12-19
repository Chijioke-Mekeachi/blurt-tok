import { Animated, Easing } from 'react-native';

export const createPulseAnimation = (value, min = 0.8, max = 1) => {
  const animation = Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: max,
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: min,
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ])
  );
  
  return animation;
};

export const createGlowAnimation = (value, min = 1, max = 1.5) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: max,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: min,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ])
  );
};

export const createSlideAnimation = (value, from = -100, to = 0) => {
  return Animated.timing(value, {
    toValue: to,
    duration: 300,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  });
};

export const createTypingAnimation = (value, duration = 2000) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: 1,
        duration: duration / 2,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: 0,
        duration: duration / 2,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ])
  );
};

export const hexToRgba = (hex, alpha = 1) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};