import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { PlaceholderScreen } from '@/screens/PlaceholderScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { PreferencesScreen } from '@/screens/PreferencesScreen';
import { colors, fonts } from '@/theme';
import type { ConfigStackParamList } from '@/navigation/types';

const Tab = createBottomTabNavigator();
const ConfigStackNav = createNativeStackNavigator<ConfigStackParamList>();

function ConfigStack() {
  return (
    <ConfigStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ConfigStackNav.Screen name="Configuracoes" component={SettingsScreen} />
      <ConfigStackNav.Screen name="Perfil" component={ProfileScreen} />
      <ConfigStackNav.Screen name="Preferencias" component={PreferencesScreen} />
    </ConfigStackNav.Navigator>
  );
}

type IconName = keyof typeof MaterialIcons.glyphMap;
const META: Record<string, { label: string; icon: IconName; badge?: number }> = {
  OS: { label: 'OS', icon: 'assignment' },
  Agenda: { label: 'Agenda', icon: 'calendar-today' },
  Notificacoes: { label: 'Notif.', icon: 'notifications', badge: 2 },
  Config: { label: 'Config.', icon: 'settings' },
};

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom || 12 }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = META[route.name];
        const color = focused ? colors.primary : colors.neutral400;
        return (
          <Pressable
            key={route.key}
            style={styles.item}
            onPress={() => {
              if (!focused) navigation.navigate(route.name);
            }}
          >
            {focused && <View style={styles.indicator} />}
            <View>
              <MaterialIcons name={meta.icon} size={22} color={color} />
              {meta.badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{meta.badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color, fontFamily: focused ? fonts.semibold : fonts.regular }]}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Navegação principal por abas (Bottom Nav Bar, node 30:541). */
export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen name="OS">{() => <PlaceholderScreen title="Ordens de Serviço" />}</Tab.Screen>
      <Tab.Screen name="Agenda">{() => <PlaceholderScreen title="Agenda" />}</Tab.Screen>
      <Tab.Screen name="Notificacoes" component={NotificationsScreen} />
      <Tab.Screen name="Config" component={ConfigStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 12,
    elevation: 8,
  },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  indicator: { position: 'absolute', top: -10, height: 3, width: 64, backgroundColor: colors.primary },
  label: { fontSize: 10 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 10, color: colors.white },
});
