export const theme = {
  colors: {
    // Dark mode base
    background: '#0a0a0f',
    surface: '#121218',
    surfaceLight: '#1a1a24',
    
    // Orange-infused neon accents
    primary: '#FF6B35', // Vibrant Orange
    primaryGlow: 'rgba(255, 107, 53, 0.5)',
    secondary: '#00f3ff', // Kept cyan for contrast
    secondaryGlow: 'rgba(0, 243, 255, 0.4)',
    accent: '#FFD166', // Muted orange/gold
    accentGlow: 'rgba(255, 209, 102, 0.4)',
    warning: '#FF9A00', // Bright orange
    error: '#ff3366',
    
    // New orange variants
    orangeLight: '#FF9A76',
    orangeDark: '#E05525',
    orangeNeon: '#FF8C42',
    
    // Text
    text: '#ffffff',
    textSecondary: '#b0b0d0',
    textMuted: '#666680',
    
    // Glassmorphism
    glass: 'rgba(255, 255, 255, 0.07)',
    glassBorder: 'rgba(255, 255, 255, 0.12)',
  },
  
  typography: {
    h1: {
      fontSize: 28,
      fontFamily: 'System',
      fontWeight: '900',
      letterSpacing: 1,
    },
    h2: {
      fontSize: 22,
      fontFamily: 'System',
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    h3: {
      fontSize: 18,
      fontFamily: 'System',
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    body: {
      fontSize: 16,
      fontFamily: 'System',
      fontWeight: '400',
      lineHeight: 22,
    },
    caption: {
      fontSize: 14,
      fontFamily: 'System',
      fontWeight: '300',
      lineHeight: 18,
    },
    hud: {
      fontSize: 11,
      fontFamily: 'monospace',
      fontWeight: '500',
      letterSpacing: 0.5,
    },
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 32,
  },
  
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 24,
    round: 9999,
  },
  
  shadows: {
    glow: {
      shadowColor: '#FF6B35',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 15,
      elevation: 8,
    },
    glowSecondary: {
      shadowColor: '#00f3ff',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 15,
      elevation: 8,
    },
    deep: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
  },
  
  animations: {
    pulse: {
      keyframes: `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `,
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    },
    glow: {
      keyframes: `
        @keyframes glow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.5); }
        }
      `,
      animation: 'glow 2s ease-in-out infinite',
    },
  },
};

export default theme;