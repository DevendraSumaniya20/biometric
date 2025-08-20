import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../App';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [userEmail, setUserEmail] = React.useState<string>('');
  const [biometricEnabled, setBiometricEnabled] =
    React.useState<boolean>(false);

  React.useEffect(() => {
    getUserInfo();
    getBiometricStatus();
  }, []);

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
    } catch (error) {
      console.error('Error getting biometric status:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            // Only remove isLoggedIn, keep other user data
            await AsyncStorage.removeItem('isLoggedIn');
            navigation.replace('Login');
          } catch (error) {
            console.error('Error during logout:', error);
          }
        },
      },
    ]);
  };

  const toggleBiometric = async () => {
    try {
      const currentStatus = await AsyncStorage.getItem('biometricEnabled');
      const newStatus = currentStatus === 'true' ? 'false' : 'true';

      if (newStatus === 'true') {
        // Enable biometric
        const TouchID = require('react-native-touch-id');
        try {
          await TouchID.authenticate('Enable biometric authentication', {
            fallbackLabel: 'Cancel',
            cancelButtonText: 'Cancel',
          });
          await AsyncStorage.setItem('biometricEnabled', 'true');
          setBiometricEnabled(true);
          Alert.alert('Success', 'Biometric authentication enabled');
        } catch (error) {
          Alert.alert('Error', 'Failed to enable biometric authentication');
        }
      } else {
        // Disable biometric
        await AsyncStorage.setItem('biometricEnabled', 'false');
        setBiometricEnabled(false);
        Alert.alert('Success', 'Biometric authentication disabled');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle biometric setting');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome!</Text>
          <Text style={styles.emailText}>{userEmail}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Account</Text>
          <Text style={styles.cardDescription}>
            You have successfully logged in. Biometric authentication is{' '}
            {biometricEnabled ? 'enabled' : 'disabled'}.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.biometricButton,
              { backgroundColor: biometricEnabled ? '#FF9500' : '#34C759' },
            ]}
            onPress={toggleBiometric}
          >
            <Text style={styles.biometricButtonText}>
              {biometricEnabled ? 'Disable' : 'Enable'} Biometric Authentication
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
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
    paddingHorizontal: 30,
    paddingTop: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emailText: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  cardDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 50,
  },
  biometricButton: {
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
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
