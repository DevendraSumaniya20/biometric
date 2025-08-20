import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Switch,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TouchID from 'react-native-touch-id';
import { RootStackParamList } from '../../App';

type RegisterScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Register'
>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Store user credentials
      await AsyncStorage.setItem('userEmail', email);
      await AsyncStorage.setItem('userPassword', password);
      await AsyncStorage.setItem('isLoggedIn', 'true');

      if (enableBiometric) {
        await setupBiometric();
      } else {
        await AsyncStorage.setItem('biometricEnabled', 'false');
        navigation.replace('Home');
      }
    } catch (error) {
      Alert.alert('Error', 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const setupBiometric = async () => {
    try {
      const biometricType = await TouchID.isSupported();

      await TouchID.authenticate('Set up biometric authentication', {
        fallbackLabel: 'Skip',
        cancelButtonText: 'Cancel',
      });

      await AsyncStorage.setItem('biometricEnabled', 'true');
      Alert.alert(
        'Success',
        'Biometric authentication has been set up successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.replace('Home'),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Biometric Setup Failed',
        'You can set up biometric authentication later in settings.',
        [
          {
            text: 'OK',
            onPress: () => {
              AsyncStorage.setItem('biometricEnabled', 'false');
              navigation.replace('Home');
            },
          },
        ],
      );
    }
  };

  const checkBiometricSupport = async () => {
    try {
      const biometricType = await TouchID.isSupported();
      return true;
    } catch (error) {
      return false;
    }
  };

  React.useEffect(() => {
    checkBiometricSupport().then(supported => {
      if (!supported) {
        setEnableBiometric(false);
      }
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up to get started</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <View style={styles.biometricOption}>
            <Text style={styles.biometricLabel}>
              Enable Biometric Authentication
            </Text>
            <Switch
              value={enableBiometric}
              onValueChange={setEnableBiometric}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={enableBiometric ? '#007AFF' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerButtonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>Already have an account? Sign In</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 40,
  },
  form: {
    marginBottom: 30,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  biometricOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  biometricLabel: {
    fontSize: 16,
    color: '#333',
  },
  registerButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginLink: {
    textAlign: 'center',
    color: '#007AFF',
    fontSize: 16,
  },
});

export default RegisterScreen;
