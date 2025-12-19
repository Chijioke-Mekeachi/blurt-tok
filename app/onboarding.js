import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import NeonButton from '../components/NeonButton';
import { theme } from './theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const slides = [
  {
    id: 1,
    title: 'WELCOME TO BLURTTOK',
    description: 'Experience the future of social video on the blockchain',
    icon: 'rocket',
    color: theme.colors.primary,
  },
  {
    id: 2,
    title: 'YOUR CONTENT, YOUR RULES',
    description: 'Videos live permanently on the Blurt blockchain',
    icon: 'lock-closed',
    color: theme.colors.secondary,
  },
  {
    id: 3,
    title: 'EARN REAL REWARDS',
    description: 'Get paid directly in BLURT for your content',
    icon: 'cash',
    color: theme.colors.accent,
  },
  {
    id: 4,
    title: 'TRANSPARENT FEES',
    description: 'Only 10% platform fee supports development',
    icon: 'shield-checkmark',
    color: theme.colors.warning,
  },
];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      const nextSlide = currentSlide + 1;
      scrollViewRef.current?.scrollTo({
        x: width * nextSlide,
        animated: true,
      });
      setCurrentSlide(nextSlide);
    } else {
      router.push('/auth');
    }
  };

  const handleSkip = () => {
    router.push('/auth');
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumScrollEnd = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slideIndex);
  };

  const renderSlide = (slide, index) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    const titleScale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });
    
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.5, 1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <View key={slide.id} style={styles.slide}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: titleScale }],
              opacity,
              borderColor: slide.color,
            },
          ]}
        >
          <Ionicons name={slide.icon} size={80} color={slide.color} />
        </Animated.View>
        
        <Animated.View
          style={{
            opacity,
            transform: [{ scale: titleScale }],
          }}
        >
          <Text style={[styles.title, { color: slide.color }]}>
            {slide.title}
          </Text>
          <Text style={styles.description}>
            {slide.description}
          </Text>
          
          {slide.id === 4 && (
            <View style={styles.feeInfo}>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Creator Reward:</Text>
                <Text style={styles.feeValue}>90%</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Platform Fee:</Text>
                <Text style={[styles.feeValue, { color: theme.colors.warning }]}>
                  10% → trevorcodz
                </Text>
              </View>
              <View style={styles.feeNote}>
                <Ionicons
                  name="information-circle"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.feeNoteText}>
                  Fees support platform development and maintenance
                </Text>
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.pagination}>
        {slides.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });
          
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.skipButton}>
        <NeonButton
          title="SKIP"
          onPress={handleSkip}
          variant="secondary"
          size="small"
        />
      </View>
      
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {slides.map((slide, index) => renderSlide(slide, index))}
      </Animated.ScrollView>
      
      {renderPagination()}
      
      <View style={styles.buttonContainer}>
        <NeonButton
          title={currentSlide === slides.length - 1 ? 'GET STARTED' : 'NEXT'}
          onPress={handleNext}
          variant="primary"
          size="large"
          style={styles.button}
        />
      </View>
      
      <View style={styles.scanline} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: theme.spacing.lg,
    zIndex: 10,
  },
  slide: {
    width: width,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xxl,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: theme.spacing.xl,
  },
  feeInfo: {
    backgroundColor: theme.colors.glass,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    marginTop: theme.spacing.xl,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  feeLabel: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  feeValue: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  feeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  feeNoteText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginHorizontal: 4,
  },
  buttonContainer: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  button: {
    width: '100%',
  },
  scanline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.colors.primary,
    opacity: 0.3,
  },
});