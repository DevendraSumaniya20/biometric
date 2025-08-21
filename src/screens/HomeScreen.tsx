import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  Switch,
  Animated,
  AppState,
  AppStateStatus,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TouchID from 'react-native-touch-id';
import { RootStackParamList } from '../../App';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [userEmail, setUserEmail] = useState<string>('');
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [lastAuthTime, setLastAuthTime] = useState<string>('');
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );

  // Animation refs
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  useEffect(() => {
    initializeScreen();

    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        checkBiometricRequirement();
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [appState]);

  const initializeScreen = async () => {
    await getUserInfo();
    await getBiometricStatus();
    await getLastAuthTime();

    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const checkBiometricRequirement = async () => {
    try {
      const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
      const lastAuth = await AsyncStorage.getItem('lastBiometricAuth');

      if (biometricEnabled === 'true' && lastAuth) {
        const now = Date.now();
        const lastAuthTime = parseInt(lastAuth);
        const timeDiff = now - lastAuthTime;

        // Require re-authentication after 30 seconds of being away
        if (timeDiff > 30000) {
          navigation.replace('Biometric');
        }
      }
    } catch (error) {
      console.error('Error checking biometric requirement:', error);
    }
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

  const getBiometricStatus = async () => {
    try {
      const status = await AsyncStorage.getItem('biometricEnabled');
      setBiometricEnabled(status === 'true');

      // Get biometric type
      try {
        const type = await TouchID.isSupported();
        setBiometricType(type);
      } catch (error) {
        console.log('Biometric not supported');
      }
    } catch (error) {
      console.error('Error getting biometric status:', error);
    }
  };

  const getLastAuthTime = async () => {
    try {
      const lastAuth = await AsyncStorage.getItem('lastBiometricAuth');
      if (lastAuth) {
        const date = new Date(parseInt(lastAuth));
        setLastAuthTime(date.toLocaleString());
      }
    } catch (error) {
      console.error('Error getting last auth time:', error);
    }
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

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            // Fade out animation
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start();

            await AsyncStorage.removeItem('isLoggedIn');
            await AsyncStorage.removeItem('lastBiometricAuth');
            navigation.replace('Login');
          } catch (error) {
            console.error('Error during logout:', error);
          }
        },
      },
    ]);
  };

  const toggleBiometric = async (value: boolean) => {
    try {
      if (value) {
        // Enable biometric
        try {
          const biometricConfig = {
            title: 'Enable Biometric Authentication',
            subtitle: 'Secure your account',
            description: `Use ${getBiometricTypeDisplayName()} to unlock your account`,
            fallbackLabel: 'Cancel',
            cancelButtonText: 'Cancel',
            colorMode: 'light' as const,
            showErrorDialogs: true,
          };

          await TouchID.authenticate(
            'Enable biometric authentication',
            biometricConfig,
          );

          await AsyncStorage.setItem('biometricEnabled', 'true');
          await AsyncStorage.setItem(
            'lastBiometricAuth',
            Date.now().toString(),
          );
          setBiometricEnabled(true);
          await getLastAuthTime();

          Alert.alert(
            'Success',
            `${getBiometricTypeDisplayName()} authentication has been enabled successfully!`,
            [{ text: 'OK' }],
          );
        } catch (error: any) {
          console.log('Biometric enable error:', error);

          if (error.code === 'UserCancel' || error.code === 'SystemCancel') {
            return;
          }

          if (error.code === 'BiometryNotEnrolled') {
            Alert.alert(
              'Biometric Not Available',
              `Please set up ${getBiometricTypeDisplayName()} in your device settings first.`,
              [{ text: 'OK' }],
            );
            return;
          }

          Alert.alert(
            'Error',
            `Failed to enable ${getBiometricTypeDisplayName()} authentication`,
          );
        }
      } else {
        // Disable biometric
        Alert.alert(
          'Disable Biometric Authentication',
          `Are you sure you want to disable ${getBiometricTypeDisplayName()} authentication?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                await AsyncStorage.setItem('biometricEnabled', 'false');
                await AsyncStorage.removeItem('lastBiometricAuth');
                setBiometricEnabled(false);
                setLastAuthTime('');
                Alert.alert(
                  'Success',
                  `${getBiometricTypeDisplayName()} authentication disabled`,
                );
              },
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle biometric setting');
    }
  };

  const testBiometric = async () => {
    if (!biometricEnabled) {
      Alert.alert('Error', 'Biometric authentication is not enabled');
      return;
    }

    try {
      const biometricConfig = {
        title: 'Test Biometric Authentication',
        subtitle: 'Verify your identity',
        description: `Place your ${getBiometricTypeDisplayName().toLowerCase()} to test authentication`,
        fallbackLabel: 'Cancel',
        cancelButtonText: 'Cancel',
        colorMode: 'light' as const,
      };

      await TouchID.authenticate(
        'Test biometric authentication',
        biometricConfig,
      );

      await AsyncStorage.setItem('lastBiometricAuth', Date.now().toString());
      await getLastAuthTime();

      Alert.alert('Success', 'Biometric authentication test successful!');
    } catch (error: any) {
      if (error.code !== 'UserCancel' && error.code !== 'SystemCancel') {
        Alert.alert('Test Failed', 'Biometric authentication test failed');
      }
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
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.emailText}>{userEmail}</Text>
          </View>

          {/* Account Status Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account Security</Text>
            <Text style={styles.cardDescription}>
              Your account is protected with{' '}
              {biometricEnabled
                ? 'biometric authentication'
                : 'password authentication'}
              .
            </Text>

            {biometricEnabled && lastAuthTime && (
              <Text style={styles.lastAuthText}>
                Last biometric authentication: {lastAuthTime}
              </Text>
            )}
          </View>

          {/* Biometric Settings Card */}
          {biometricType && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.biometricIcon}>{getBiometricIcon()}</Text>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>
                    {getBiometricTypeDisplayName()} Authentication
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {biometricEnabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={toggleBiometric}
                  trackColor={{ false: '#767577', true: '#34C759' }}
                  thumbColor={biometricEnabled ? '#ffffff' : '#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                />
              </View>

              <Text style={styles.cardDescription}>
                Use {getBiometricTypeDisplayName().toLowerCase()} to quickly and
                securely access your account
              </Text>

              {biometricEnabled && (
                <TouchableOpacity
                  style={styles.testButton}
                  onPress={testBiometric}
                >
                  <Text style={styles.testButtonText}>Test Authentication</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Security Tips Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Security Tips</Text>
            <View style={styles.tipsList}>
              <Text style={styles.tipItem}>
                • Keep your biometric data updated in device settings
              </Text>
              <Text style={styles.tipItem}>
                • Always use a strong password as backup
              </Text>
              <Text style={styles.tipItem}>
                • Sign out when using shared devices
              </Text>
              <Text style={styles.tipItem}>
                • Enable automatic app lock for enhanced security
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Sign Out</Text>
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
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  cardDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  biometricIcon: {
    fontSize: 32,
  },
  lastAuthText: {
    fontSize: 13,
    color: '#34C759',
    marginTop: 8,
    fontWeight: '500',
  },
  testButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  tipsList: {
    marginTop: 8,
  },
  tipItem: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  bottomContainer: {
    paddingVertical: 20,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;
