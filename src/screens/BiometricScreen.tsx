import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
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

const BiometricScreen: React.FC<Props> = ({ navigation }) => {
  useEffect(() => {
    // Automatically trigger biometric authentication when screen loads
    handleBiometricAuth();
  }, []);

  const handleBiometricAuth = async () => {
    try {
      await TouchID.authenticate('Authenticate to access your account', {
        fallbackLabel: 'Use Password',
        cancelButtonText: 'Cancel',
      });

      // Authentication successful, navigate to home
      navigation.replace('Home');
    } catch (error) {
      // Authentication failed or cancelled
      console.log('Biometric authentication failed:', error);
    }
  };

  const handleUsePassword = () => {
    navigation.replace('Login');
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.removeItem('isLoggedIn');
      navigation.replace('Login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔒</Text>
        </View>

        <Text style={styles.title}>Biometric Authentication</Text>
        <Text style={styles.subtitle}>
          Please authenticate using your biometric credentials to access your
          account
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricAuth}
          >
            <Text style={styles.biometricButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.passwordButton}
            onPress={handleUsePassword}
          >
            <Text style={styles.passwordButtonText}>Use Password Instead</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 30,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 50,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
  },
  biometricButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  biometricButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  passwordButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  passwordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  skipButtonText: {
    color: '#FF3B30',
    fontSize: 16,
  },
});

export default BiometricScreen;
