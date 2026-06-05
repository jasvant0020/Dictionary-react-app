import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { useDictionaryLoader } from './src/hooks/useDictionaryLoader';
import LoadingScreen from './src/screens/LoadingScreen';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import BookmarksScreen from './src/screens/BookmarksScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ReaderScreen from './src/screens/ReaderScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator({ totalEntries }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.border,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
        },
        tabBarActiveTintColor: c.tabBarActive,
        tabBarInactiveTintColor: c.tabBarInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            HomeTab: focused ? 'home' : 'home-outline',
            SearchTab: focused ? 'search' : 'search-outline',
            FavoritesTab: focused ? 'heart' : 'heart-outline',
            SettingsTab: focused ? 'settings' : 'settings-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" options={{ title: 'Home' }}>
        {(props) => <HomeScreen {...props} totalEntries={totalEntries} />}
      </Tab.Screen>
      <Tab.Screen name="SearchTab" component={SearchScreen} options={{ title: 'Search' }} />
      <Tab.Screen name="FavoritesTab" component={FavoritesScreen} options={{ title: 'Favorites' }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

function RootNavigator({ totalEntries }) {
  const { theme, isDark } = useTheme();
  const c = theme.colors;

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: c.background,
      card: c.headerBg,
      text: c.text,
      border: c.border,
      primary: c.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs">
          {(props) => <TabNavigator {...props} totalEntries={totalEntries} />}
        </Stack.Screen>
        <Stack.Screen
          name="Reader"
          component={ReaderScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="Favorites"
          component={FavoritesScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Bookmarks"
          component={BookmarksScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AppContent() {
  const { status, progress, totalEntries, error, retry } = useDictionaryLoader();
  const isReady = status === 'ready';

  if (!isReady) {
    return (
      <LoadingScreen
        status={status}
        progress={progress}
        error={error}
        retry={retry}
      />
    );
  }

  return <RootNavigator totalEntries={totalEntries} />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
