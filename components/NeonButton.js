import { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../app/theme';
import { createGlowAnimation } from '../utils/animations';

const NeonButton = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  ...props
}) => {
  const glowAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!disabled) {
      const animation = createGlowAnimation(glowAnim);
      animation.start();
      return () => animation.stop();
    }
  }, [disabled]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.colors.primary + '20',
          borderColor: theme.colors.primary,
          shadowColor: theme.colors.primary,
        };
      case 'secondary':
        return {
          backgroundColor: theme.colors.secondary + '20',
          borderColor: theme.colors.secondary,
          shadowColor: theme.colors.secondary,
        };
      case 'accent':
        return {
          backgroundColor: theme.colors.accent + '20',
          borderColor: theme.colors.accent,
          shadowColor: theme.colors.accent,
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning + '20',
          borderColor: theme.colors.warning,
          shadowColor: theme.colors.warning,
        };
      default:
        return {
          backgroundColor: theme.colors.primary + '20',
          borderColor: theme.colors.primary,
          shadowColor: theme.colors.primary,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.borderRadius.sm,
        };
      case 'large':
        return {
          paddingHorizontal: theme.spacing.xl,
          paddingVertical: theme.spacing.lg,
          borderRadius: theme.borderRadius.lg,
        };
      default:
        return {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        variantStyles,
        sizeStyles,
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      <Animated.View
        style={[
          styles.glowOverlay,
          {
            opacity: glowAnim.interpolate({
              inputRange: [1, 1.5],
              outputRange: [0.3, 0.7],
            }),
            backgroundColor: variantStyles.shadowColor,
          },
        ]}
      />
      
      <View style={styles.content}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <Text
          style={[
            styles.text,
            { color: variantStyles.borderColor },
            textStyle,
          ]}
        >
          {loading ? '...' : title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  glowOverlay: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'System',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default NeonButton;