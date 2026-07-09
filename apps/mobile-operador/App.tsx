import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/screens/auth/ResetPasswordScreen';
import { EmailSentScreen } from '@/screens/auth/EmailSentScreen';
import { MainTabs } from '@/navigation/MainTabs';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { hasMobileAccess } from '@/lib/supabase';
import { colors } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

const RootStack = createNativeStackNavigator<RootStackParamList>();

/** Alterna entre pilha de auth e app principal conforme a sessão. */
function RootNavigator() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.white} size="large" />
      </View>
    );
  }

  const authed = !!session && !!profile && profile.ativo && hasMobileAccess(profile.role);

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {authed ? (
        <RootStack.Screen name="Main" component={MainTabs} />
      ) : (
        <>
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <RootStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <RootStack.Screen name="EmailSent" component={EmailSentScreen} />
        </>
      )}
    </RootStack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.heroGreen },
});
