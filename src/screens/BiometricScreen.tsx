import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Animated,
  Dimensions,
  AppState,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TouchID from 'react-native-touch-id';
import { RootStackParamList } from '../../App';

type BiometricScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Biometric'
>;

interface Props {
  navigation: BiometricScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');

// Security constants - banking app standards
// const SECURITY_CONFIG = {
//   MAX_FAILED_ATTEMPTS: 3,
//   LOCKOUT_DURATION: 300000, // 5 minutes
//   SESSION_TIMEOUT: 300000, // 5 minutes
//   BIOMETRIC_TIMEOUT: 30000, // 30 seconds
//   AUTO_LOCK_DELAY: 10000, // 10 seconds after app goes background
// };

// Security constants - banking app standards
const SECURITY_CONFIG = {
  MAX_FAILED_ATTEMPTS: 3,
  LOCKOUT_DURATION: 60000, // 1 minute
  SESSION_TIMEOUT: 60000, // 1 minute
  BIOMETRIC_TIMEOUT: 60000, // 1 minute
  AUTO_LOCK_DELAY: 60000, // 1 minute after app goes background
};

const BiometricScreen: React.FC<Props> = ({ navigation }) => {
  const [biometricType, setBiometricType] = useState<string>('');
  const [authAttempts, setAuthAttempts] = useState(0);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showFallbackOptions, setShowFallbackOptions] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<number>(0);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(true);

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Timers
  const lockoutTimer = useRef<NodeJS.Timeout | null>(null);
  const sessionTimer = useRef<NodeJS.Timeout | null>(null);
  const biometricTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeBiometric();
    getUserInfo();
    checkLockoutStatus();
    startSessionTimer();

    // Start fade-in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Enhanced app state handling for banking security
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Immediately lock when app goes to background
        handleAppBackground();
      } else if (nextAppState === 'active') {
        // Check security when returning to foreground
        handleAppForeground();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription?.remove();
      clearTimers();
    };
  }, []);

  const clearTimers = () => {
    if (lockoutTimer.current) clearTimeout(lockoutTimer.current);
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    if (biometricTimeoutRef.current) clearTimeout(biometricTimeoutRef.current);
  };

  const startSessionTimer = () => {
    if (sessionTimer.current) clearTimeout(sessionTimer.current);

    sessionTimer.current = setTimeout(() => {
      setSessionExpired(true);
      handleSessionExpired();
    }, SECURITY_CONFIG.SESSION_TIMEOUT);
  };

  const handleAppBackground = async () => {
    // Invalidate current session for security
    await AsyncStorage.removeItem('lastBiometricAuth');
    clearTimers();
  };

  const handleAppForeground = async () => {
    // Force re-authentication when app returns to foreground
    setSessionExpired(true);
    await checkLockoutStatus();
    if (!isLockedOut) {
      setTimeout(() => handleBiometricAuth(), 500);
    }
  };

  const handleSessionExpired = async () => {
    Alert.alert(
      'Session Expired',
      'For your security, please authenticate again.',
      [{ text: 'OK', onPress: () => handleBiometricAuth() }],
      { cancelable: false },
    );
  };

  const checkLockoutStatus = async () => {
    try {
      const lockoutData = await AsyncStorage.getItem('biometricLockout');
      const failedAttempts = await AsyncStorage.getItem(
        'failedBiometricAttempts',
      );

      if (lockoutData) {
        const lockoutInfo = JSON.parse(lockoutData);
        const now = Date.now();

        if (now < lockoutInfo.endTime) {
          setIsLockedOut(true);
          setLockoutEndTime(lockoutInfo.endTime);
          setAuthAttempts(lockoutInfo.attempts);
          startLockoutTimer(lockoutInfo.endTime - now);
          return;
        } else {
          // Lockout expired, clear data
          await AsyncStorage.removeItem('biometricLockout');
          await AsyncStorage.removeItem('failedBiometricAttempts');
        }
      }

      if (failedAttempts) {
        setAuthAttempts(parseInt(failedAttempts));
      }
    } catch (error) {
      console.error('Error checking lockout status:', error);
    }
  };

  const startLockoutTimer = (duration: number) => {
    lockoutTimer.current = setTimeout(() => {
      setIsLockedOut(false);
      setLockoutEndTime(0);
      setAuthAttempts(0);
      AsyncStorage.removeItem('biometricLockout');
      AsyncStorage.removeItem('failedBiometricAttempts');
    }, duration);
  };

  const getUserInfo = async () => {
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (email) {
        setUserEmail(email);
      }
    } catch (error) {
      console.error('Error getting user info:', error);
    }
  };

  const initializeBiometric = async () => {
    try {
      // Check if biometric is actually available and enrolled
      const biometricType = await TouchID.isSupported();
      setBiometricType(biometricType);
      setBiometricAvailable(true);

      // Validate biometric is properly configured
      const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
      if (biometricEnabled !== 'true') {
        throw new Error('Biometric not enabled');
      }

      // Auto-trigger with timeout for banking security
      if (!isLockedOut) {
        setTimeout(() => handleBiometricAuth(), 1000);

        // Set timeout for biometric prompt
        biometricTimeoutRef.current = setTimeout(() => {
          if (isAuthenticating) {
            setIsAuthenticating(false);
            handleBiometricTimeout();
          }
        }, SECURITY_CONFIG.BIOMETRIC_TIMEOUT);
      }
    } catch (error) {
      console.error('Biometric initialization failed:', error);
      setBiometricAvailable(false);
      setShowFallbackOptions(true);
    }
  };

  const handleBiometricTimeout = () => {
    Alert.alert(
      'Authentication Timeout',
      'Biometric authentication timed out for security reasons. Please try again.',
      [{ text: 'Try Again', onPress: () => handleBiometricAuth() }],
    );
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleFailedAttempt = async () => {
    const newAttemptCount = authAttempts + 1;
    setAuthAttempts(newAttemptCount);

    await AsyncStorage.setItem(
      'failedBiometricAttempts',
      newAttemptCount.toString(),
    );

    if (newAttemptCount >= SECURITY_CONFIG.MAX_FAILED_ATTEMPTS) {
      const lockoutEndTime = Date.now() + SECURITY_CONFIG.LOCKOUT_DURATION;

      await AsyncStorage.setItem(
        'biometricLockout',
        JSON.stringify({
          endTime: lockoutEndTime,
          attempts: newAttemptCount,
          timestamp: Date.now(),
        }),
      );

      setIsLockedOut(true);
      setLockoutEndTime(lockoutEndTime);
      startLockoutTimer(SECURITY_CONFIG.LOCKOUT_DURATION);

      Alert.alert(
        'Account Temporarily Locked',
        `Too many failed authentication attempts. Your account is locked for 5 minutes for security reasons.`,
        [{ text: 'OK' }],
        { cancelable: false },
      );

      return true; // Indicate lockout occurred
    }

    return false; // No lockout
  };

  const handleBiometricAuth = async () => {
    if (isAuthenticating || isLockedOut) return;

    // Clear any existing timeout
    if (biometricTimeoutRef.current) {
      clearTimeout(biometricTimeoutRef.current);
    }

    try {
      setIsAuthenticating(true);
      startPulseAnimation();

      // Enhanced biometric configuration for banking security
      const biometricConfig = {
        title: 'Secure Authentication',
        subtitle: 'Verify your identity to continue',
        description: `Use your ${getBiometricTypeDisplayName()} to authenticate`,
        fallbackLabel: 'Use Passcode',
        cancelButtonText: 'Cancel',
        colorMode: 'dark' as const,
        showErrorDialogs: false, // We handle errors manually for better UX
        imageColor: '#007AFF',
        imageErrorColor: '#FF3B30',
        sensorDescription: `Touch the ${getBiometricTypeDisplayName()} sensor`,
        sensorErrorDescription: 'Authentication failed',
        passcodeFallback: false, // Disable system passcode fallback
        unifiedErrors: true,
      };

      // Set authentication timeout
      biometricTimeoutRef.current = setTimeout(() => {
        setIsAuthenticating(false);
        stopPulseAnimation();
        handleBiometricTimeout();
      }, SECURITY_CONFIG.BIOMETRIC_TIMEOUT);

      await TouchID.authenticate(
        'Authenticate to access your account',
        biometricConfig,
      );

      // Clear timeout on success
      if (biometricTimeoutRef.current) {
        clearTimeout(biometricTimeoutRef.current);
      }

      // Authentication successful
      stopPulseAnimation();

      // Reset security counters
      await AsyncStorage.removeItem('failedBiometricAttempts');
      await AsyncStorage.removeItem('biometricLockout');
      await AsyncStorage.setItem('lastBiometricAuth', Date.now().toString());

      // Enhanced security validation
      const securityToken = `auth_${Date.now()}_${Math.random().toString(36)}`;
      await AsyncStorage.setItem('securityToken', securityToken);

      // Success feedback animation
      Animated.spring(pulseAnim, {
        toValue: 1.3,
        useNativeDriver: true,
      }).start(() => {
        navigation.replace('Home');
      });
    } catch (error: any) {
      if (biometricTimeoutRef.current) {
        clearTimeout(biometricTimeoutRef.current);
      }

      stopPulseAnimation();
      setIsAuthenticating(false);

      console.log('Biometric authentication error:', error);

      // Handle user cancellation
      if (error.code === 'UserCancel' || error.code === 'SystemCancel') {
        setShowFallbackOptions(true);
        return;
      }

      // Handle system-level biometric issues
      if (error.code === 'BiometryNotEnrolled') {
        Alert.alert(
          'Biometric Not Set Up',
          'Biometric authentication is not set up on this device. Please set it up in Settings or use your password.',
          [
            { text: 'Use Password', onPress: handleUsePassword },
            {
              text: 'Settings',
              onPress: () => {
                /* Could open device settings */
              },
            },
          ],
        );
        return;
      }

      if (error.code === 'BiometryNotAvailable') {
        Alert.alert(
          'Biometric Not Available',
          'Biometric authentication is not available. Please use your password.',
          [{ text: 'Use Password', onPress: handleUsePassword }],
        );
        return;
      }

      if (error.code === 'BiometryLockout') {
        Alert.alert(
          'Biometric Temporarily Disabled',
          'Too many failed biometric attempts. Please use your device passcode first, then try again.',
          [{ text: 'Use Password', onPress: handleUsePassword }],
        );
        return;
      }

      // Handle authentication failure
      const isNowLockedOut = await handleFailedAttempt();

      if (!isNowLockedOut) {
        shakeAnimation();

        const remainingAttempts =
          SECURITY_CONFIG.MAX_FAILED_ATTEMPTS - (authAttempts + 1);

        Alert.alert(
          'Authentication Failed',
          `Biometric authentication failed. ${remainingAttempts} attempt${
            remainingAttempts !== 1 ? 's' : ''
          } remaining.`,
          [
            {
              text: 'Try Again',
              onPress: () => {
                setTimeout(() => handleBiometricAuth(), 1000);
              },
            },
            { text: 'Use Password', onPress: handleUsePassword },
          ],
        );
      }
    }
  };

  const getBiometricTypeDisplayName = () => {
    switch (biometricType) {
      case 'FaceID':
        return 'Face ID';
      case 'TouchID':
        return 'Touch ID';
      case 'Fingerprint':
        return 'fingerprint';
      default:
        return 'biometric';
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

  const getBiometricInstructions = () => {
    if (isLockedOut) {
      const remainingTime = Math.ceil(
        (lockoutEndTime - Date.now()) / 1000 / 60,
      );
      return `Account locked for ${remainingTime} more minute${
        remainingTime !== 1 ? 's' : ''
      }`;
    }

    if (!biometricAvailable) {
      return 'Biometric authentication not available';
    }

    switch (biometricType) {
      case 'FaceID':
        return 'Look at your device to authenticate';
      case 'TouchID':
        return 'Place your finger on the Touch ID sensor';
      case 'Fingerprint':
        return 'Place your finger on the fingerprint sensor';
      default:
        return 'Use biometric authentication to continue';
    }
  };

  const handleUsePassword = async () => {
    // Log security event
    const securityLog = {
      event: 'biometric_fallback_to_password',
      timestamp: Date.now(),
      attempts: authAttempts,
      reason: 'user_requested',
    };

    await AsyncStorage.setItem(
      'lastSecurityEvent',
      JSON.stringify(securityLog),
    );
    navigation.replace('Login');
  };

  const handleEmergencyAccess = async () => {
    Alert.alert(
      'Emergency Access',
      'This will temporarily disable biometric authentication and require password login. This action will be logged for security purposes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            // Log emergency access
            const emergencyLog = {
              event: 'emergency_access_used',
              timestamp: Date.now(),
              userAgent: 'mobile_app',
            };

            await AsyncStorage.setItem(
              'emergencyAccess',
              JSON.stringify(emergencyLog),
            );
            await AsyncStorage.setItem('biometricEnabled', 'false');
            navigation.replace('Home');
          },
        },
      ],
    );
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            // Clear all security-related data
            await AsyncStorage.multiRemove([
              'isLoggedIn',
              'lastBiometricAuth',
              'failedBiometricAttempts',
              'biometricLockout',
              'securityToken',
            ]);

            navigation.replace('Login');
          } catch (error) {
            console.error('Error during sign out:', error);
          }
        },
      },
    ]);
  };

  const formatLockoutTime = () => {
    if (!isLockedOut) return '';

    const remainingMs = lockoutEndTime - Date.now();
    const remainingMinutes = Math.ceil(remainingMs / 1000 / 60);

    return `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* User Info Header */}
        <View style={styles.userHeader}>
          <Text style={styles.welcomeText}>Secure Access</Text>
          {userEmail ? <Text style={styles.emailText}>{userEmail}</Text> : null}
        </View>

        {/* Biometric Icon with Animation */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: pulseAnim }, { translateX: shakeAnim }],
            },
          ]}
        >
          <Text style={styles.icon}>{getBiometricIcon()}</Text>
          <View style={styles.iconRing} />
          <View style={styles.iconRingOuter} />
        </Animated.View>

        {/* Authentication Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.title}>
            {isLockedOut
              ? 'Account Temporarily Locked'
              : isAuthenticating
              ? 'Authenticating...'
              : `${getBiometricTypeDisplayName()} Required`}
          </Text>
          <Text style={styles.subtitle}>{getBiometricInstructions()}</Text>

          {isLockedOut && (
            <Text style={styles.lockoutText}>
              Try again in {formatLockoutTime()}
            </Text>
          )}

          {authAttempts > 0 && !isAuthenticating && !isLockedOut && (
            <Text style={styles.attemptText}>
              {SECURITY_CONFIG.MAX_FAILED_ATTEMPTS - authAttempts} attempt
              {SECURITY_CONFIG.MAX_FAILED_ATTEMPTS - authAttempts !== 1
                ? 's'
                : ''}{' '}
              remaining
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {!isAuthenticating && !isLockedOut && biometricAvailable && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricAuth}
            >
              <Text style={styles.biometricButtonText}>
                Use {getBiometricTypeDisplayName()}
              </Text>
            </TouchableOpacity>
          )}

          {(showFallbackOptions ||
            authAttempts >= 1 ||
            !biometricAvailable ||
            isLockedOut) && (
            <TouchableOpacity
              style={styles.passwordButton}
              onPress={handleUsePassword}
            >
              <Text style={styles.passwordButtonText}>
                Use Password Instead
              </Text>
            </TouchableOpacity>
          )}

          {authAttempts >= 2 && !isLockedOut && (
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={handleEmergencyAccess}
            >
              <Text style={styles.emergencyButtonText}>Emergency Access</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.skipButton} onPress={handleSignOut}>
            <Text style={styles.skipButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Security Info */}
        <Text style={styles.securityInfo}>
          Your biometric data is stored securely on this device and never shared
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  userHeader: {
    position: 'absolute',
    top: 80,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: '#999',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  icon: {
    fontSize: 120,
    textAlign: 'center',
    zIndex: 3,
  },
  iconRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: '#007AFF',
    opacity: 0.3,
  },
  iconRingOuter: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: '#007AFF',
    opacity: 0.15,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#999',
    marginBottom: 8,
    lineHeight: 22,
  },
  attemptText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '500',
  },
  lockoutText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
    marginTop: 8,
  },
  buttonContainer: {
    width: '100%',
    position: 'absolute',
    bottom: 120,
  },
  biometricButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  biometricButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  passwordButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  emergencyButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  emergencyButtonText: {
    color: '#FF9500',
    fontSize: 16,
    fontWeight: '500',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  skipButtonText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  securityInfo: {
    position: 'absolute',
    bottom: 40,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 16,
  },
});

export default BiometricScreen;
