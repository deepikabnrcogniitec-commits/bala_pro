import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar, LogBox, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import RootNavigator from './src/navigation';
import LaunchVideo from './src/components/LaunchVideo';
import { useAppStore } from './src/store/appStore';
import { COLOR } from './src/theme';

// Web/server client ID — the audience the backend verifies Google ID tokens
// against (a "Web application" OAuth client). Guarded so the app still boots
// where the native module is unavailable.
try {
  // eslint-disable-next-line global-require
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    offlineAccess: false,
  });
} catch (e) {
  console.warn('GoogleSignin unavailable (needs a dev build):', e?.message);
}

LogBox.ignoreLogs(['Non-serializable values', 'Require cycle']);

SplashScreen.preventAutoHideAsync().catch(() => {});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const [ready, setReady] = useState(false);
  const introDone = useAppStore((s) => s.introDone);
  const setIntroDone = useAppStore((s) => s.setIntroDone);

  const [fontsLoaded, fontError] = useFonts({
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    (async () => {
      try {
        let deviceId = await AsyncStorage.getItem('ds_device_id');
        if (!deviceId) {
          deviceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await AsyncStorage.setItem('ds_device_id', deviceId);
        }
        await registerForPushNotifications();
      } catch (err) {
        console.warn('App init error:', err);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const bootDone = ready && (fontsLoaded || fontError);

  // The native splash stays up until the intro video's first frame is on screen,
  // so the hand-off from splash → video has no blank flash.
  const hideNativeSplash = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (!bootDone) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar barStyle="dark-content" backgroundColor={COLOR.bg} translucent={false} />
          <View style={{ flex: 1, backgroundColor: COLOR.bg }}>
            <RootNavigator />
          </View>
          <Toast />
          {!introDone ? (
            <LaunchVideo onFirstFrame={hideNativeSplash} onDone={() => setIntroDone(true)} />
          ) : null}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

async function registerForPushNotifications() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    const token = await Notifications.getExpoPushTokenAsync();
    await AsyncStorage.setItem('fcm_token', token.data);
  } catch (err) {
    console.warn('Push notification setup failed:', err);
  }
}
