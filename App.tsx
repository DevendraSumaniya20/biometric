import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');

      console.log(
        'Auth check - isLoggedIn:',
        isLoggedIn,
        'biometricEnabled:',
        biometricEnabled,
      );

      // If user is logged in and biometric is enabled, always show biometric screen first
      if (isLoggedIn === 'true' && biometricEnabled === 'true') {
        setInitialRoute('Biometric');
      } else if (isLoggedIn === 'true') {
        // If logged in but no biometric, go directly to home
        setInitialRoute('Home');
      } else {
        // Not logged in, show login screen
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
    return null; // Add your loading component here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute as keyof RootStackParamList}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Biometric" component={BiometricScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
