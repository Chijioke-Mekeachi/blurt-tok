import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '../theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontFamily: 'System',
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            title: 'GET STARTED',
            headerStyle: {
              backgroundColor: 'transparent',
            },
          }}
        />
        <Stack.Screen
          name="auth"
          options={{
            title: 'AUTHENTICATE',
          }}
        />
        <Stack.Screen
          name="feed"
          options={{
            headerShown: false
            ,
          }}
        />
        <Stack.Screen
          name="upload"
          options={{
            title: 'CREATE',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="video/[id]"
          options={{
            title: 'VIDEO',
            headerStyle: {
              backgroundColor: 'transparent',
            },
          }}
        />
        <Stack.Screen
          name="comments/[id]"
          options={{
            title: 'COMMENTS',
          }}
        />
        <Stack.Screen
          name="profile/[user]"
          options={{
            title: 'PROFILE',
          }}
        />
        <Stack.Screen
          name="wallet"
          options={{
            title: 'WALLET',
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            title: 'NOTIFICATIONS',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: 'SETTINGS',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}