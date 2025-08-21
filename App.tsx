import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TouchID from 'react-native-touch-id';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import BiometricScreen from './src/screens/BiometricScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Biometric: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const [initialRoute, setInitialRoute] = useState<string>('Login');
  const [isLoading, setIsLoading] = useState(true);
  const [currentRoute, setCurrentRoute] = useState<string>('Login');
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );

  useEffect(() => {
    checkAuthStatus();

    // Listen to app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        handleAppForeground();
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [appState]);

  const handleAppForeground = async () => {
    try {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
      const lastAuthTime = await AsyncStorage.getItem('lastBiometricAuth');

      if (isLoggedIn === 'true' && biometricEnabled === 'true') {
        const now = Date.now();
        const lastAuth = lastAuthTime ? parseInt(lastAuthTime) : 0;
        const timeDiff = now - lastAuth;

        // If more than 30 seconds have passed since last auth, require re-authentication
        if (timeDiff > 30000 && currentRoute === 'Home') {
          // Navigate to biometric screen when app becomes active
          setCurrentRoute('Biometric');
        }
      }
    } catch (error) {
      console.error('Error handling app foreground:', error);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
      const lastAuthTime = await AsyncStorage.getItem('lastBiometricAuth');

      console.log(
        'Auth check - isLoggedIn:',
        isLoggedIn,
        'biometricEnabled:',
        biometricEnabled,
      );

      if (isLoggedIn === 'true') {
        if (biometricEnabled === 'true') {
          // Check if biometric authentication is actually available
          try {
            await TouchID.isSupported();

            // Check if enough time has passed to require re-authentication
            const now = Date.now();
            const lastAuth = lastAuthTime ? parseInt(lastAuthTime) : 0;
            const timeDiff = now - lastAuth;

            // Require biometric auth if more than 5 minutes have passed or no previous auth
            if (timeDiff > 300000 || !lastAuthTime) {
              setInitialRoute('Biometric');
            } else {
              setInitialRoute('Home');
            }
          } catch (biometricError) {
            // Biometric not available, disable it and go to home
            console.log('Biometric not available, disabling:', biometricError);
            await AsyncStorage.setItem('biometricEnabled', 'false');
            setInitialRoute('Home');
          }
        } else {
          setInitialRoute('Home');
        }
      } else {
        setInitialRoute('Login');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setInitialRoute('Login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null; // You can add a splash screen component here
  }

  return (
    <NavigationContainer
      onStateChange={state => {
        // Track current route for app state handling
        const route = state?.routes[state.index]?.name;
        if (route) {
          setCurrentRoute(route);
        }
      }}
    >
      <Stack.Navigator
        initialRouteName={initialRoute as keyof RootStackParamList}
        screenOptions={{
          headerShown: false,
          gestureEnabled: false, // Disable swipe back on biometric screen
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ gestureEnabled: true }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ gestureEnabled: true }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ gestureEnabled: true }}
        />
        <Stack.Screen
          name="Biometric"
          component={BiometricScreen}
          options={{
            gestureEnabled: false,
            animationEnabled: true,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
