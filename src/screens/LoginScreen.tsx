import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Animated,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TouchID from 'react-native-touch-id';
import { RootStackParamList } from '../../App';

type LoginScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Login'
>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const { width } = Dimensions.get('window');

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [showBiometricOption, setShowBiometricOption] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  // Animation
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    // Check for existing user and biometric setup
    await checkBiometricSetup();

    // Load saved email if available
    const savedEmail = await AsyncStorage.getItem('userEmail');
    if (savedEmail) {
      setEmail(savedEmail);
    }

    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const checkBiometricSetup = async () => {
    try {
      const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
      const userExists = await AsyncStorage.getItem('userEmail');

      if (biometricEnabled === 'true' && userExists) {
        const biometricType = await TouchID.isSupported();
        setBiometricType(biometricType);
        setShowBiometricOption(true);

        // Auto-show biometric option for returning users
        setTimeout(() => {
          showQuickBiometricPrompt();
        }, 1500);
      }
    } catch (error) {
      console.log('Biometric not supported or not set up');
    }
  };

  const showQuickBiometricPrompt = () => {
    Alert.alert(
      'Quick Login',
      `Use ${getBiometricTypeDisplayName()} for faster login?`,
      [
        { text: 'Use Password', style: 'cancel' },
        { text: 'Use Biometric', onPress: handleBiometricLogin },
      ],
      { cancelable: true },
    );
  };

  const getBiometricTypeDisplayName = () => {
    switch (biometricType) {
      case 'FaceID':
        return 'Face ID';
      case 'TouchID':
        return 'Touch ID';
      case 'Fingerprint':
        return 'Fingerprint';
      default:
        return 'Biometric';
    }
  };

  const getBiometricIcon = () => {
    switch (biometricType) {
      case 'FaceID':
        return '👤';
      case 'TouchID':
        return '👆';
      case 'Fingerprint':
        return '👆';
      default:
        return '🔒';
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Simulate network delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      const storedEmail = await AsyncStorage.getItem('userEmail');
      const storedPassword = await AsyncStorage.getItem('userPassword');

      if (email === storedEmail && password === storedPassword) {
        await AsyncStorage.setItem('isLoggedIn', 'true');
        await AsyncStorage.setItem('lastBiometricAuth', Date.now().toString());

        // Success animation before navigation
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          navigation.replace('Home');
        });
      } else {
        // Shake animation for wrong credentials
        Animated.sequence([
          Animated.timing(slideAnim, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();

        Alert.alert('Error', 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');

      if (biometricEnabled !== 'true') {
        Alert.alert('Error', 'Biometric authentication not set up');
        return;
      }

      const biometricConfig = {
        title: 'Biometric Login',
        subtitle: 'Sign in with your biometric',
        description: `Place your ${getBiometricTypeDisplayName().toLowerCase()} to continue`,
        fallbackLabel: 'Use Password',
        cancelButtonText: 'Cancel',
        colorMode: 'light' as const,
        showErrorDialogs: true,
        passcodeFallback: false,
        unifiedErrors: false,
      };

      await TouchID.authenticate('Sign in with biometric', biometricConfig);

      // Success
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('lastBiometricAuth', Date.now().toString());

      // Success animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        navigation.replace('Home');
      });
    } catch (error: any) {
      console.log('Biometric login error:', error);

      if (error.code === 'UserCancel' || error.code === 'SystemCancel') {
        // User cancelled - no alert needed
        return;
      }

      if (error.code === 'BiometryNotEnrolled') {
        Alert.alert(
          'Biometric Not Set Up',
          'Please set up biometric authentication in device settings or use password to login.',
          [{ text: 'OK' }],
        );
        return;
      }

      if (error.code === 'BiometryLockout') {
        Alert.alert(
          'Biometric Locked',
          'Too many failed attempts. Please use your password to login.',
          [{ text: 'OK' }],
        );
        return;
      }

      Alert.alert(
        'Authentication Failed',
        'Biometric authentication failed. Please try again or use your password.',
        [
          { text: 'Try Again', onPress: handleBiometricLogin },
          { text: 'Use Password' },
        ],
      );
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
          />

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          {showBiometricOption && (
            <TouchableOpacity
              style={[
                styles.biometricButton,
                biometricLoading && styles.buttonDisabled,
              ]}
              onPress={handleBiometricLogin}
              disabled={biometricLoading}
            >
              <View style={styles.biometricButtonContent}>
                <Text style={styles.biometricIcon}>{getBiometricIcon()}</Text>
                <Text style={styles.biometricButtonText}>
                  {biometricLoading
                    ? 'Authenticating...'
                    : `Sign in with ${getBiometricTypeDisplayName()}`}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>
              Don't have an account? Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  form: {
    marginBottom: 32,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#34C759',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  biometricButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  biometricIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  biometricButtonText: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footer: {
    alignItems: 'center',
  },
  registerLink: {
    textAlign: 'center',
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LoginScreen;
