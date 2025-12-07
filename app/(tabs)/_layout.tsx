import { Feather, Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter, useSegments } from "expo-router";
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { getCurrentUser } from '../../lib/firebaseHelpers';
import { getUserConversations } from '../../lib/firebaseHelpers/conversation';
import { getUserNotifications } from '../../lib/firebaseHelpers/notification';
import { fetchLogoUrl } from '../services/brandingService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallDevice = SCREEN_WIDTH < 375;
const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
const isLargeDevice = SCREEN_WIDTH >= 414;
const ICON_SIZE = isSmallDevice ? 18 : (isLargeDevice ? 22 : 20);
const CHEVRON_SIZE = isSmallDevice ? 18 : 20;


// Create a context for tab events
const TabEventContext = createContext<{ emitHomeTabPress: () => void; subscribeHomeTabPress: (cb: () => void) => () => void } | undefined>(undefined);

export function useTabEvent() {
  return useContext(TabEventContext);
}

export default function TabsLayout() {
  // Simple subscription system for home tab press
  const homeTabPressListeners = useRef<(() => void)[]>([]);
  const emitHomeTabPress = () => {
    homeTabPressListeners.current.forEach(cb => cb());
  };
  const subscribeHomeTabPress = (cb: () => void) => {
    homeTabPressListeners.current.push(cb);
    return () => {
      homeTabPressListeners.current = homeTabPressListeners.current.filter(fn => fn !== cb);
    };
  };
  const router = useRouter();
  // const segments = useSegments();
  // const isProfileScreen = segments[segments.length - 1] === 'profile';
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      <TopMenu />
      <TabEventContext.Provider value={{ emitHomeTabPress, subscribeHomeTabPress }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#f39c12',
          tabBarInactiveTintColor: '#777',
          tabBarShowLabel: true,
          tabBarStyle: {
            height: 64,
            paddingBottom: 10,
            paddingTop: 6,
            backgroundColor: '#fff',
            borderTopWidth: 0.5,
            borderTopColor: '#eee',
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Feather name="home" size={size} color={color} />
            ),
            tabBarButton: (props) => {
              const router = useRouter();
              const tabEvent = useTabEvent();
              return (
                <TouchableOpacity
                  onPress={() => {
                    tabEvent?.emitHomeTabPress();
                    router.push('/(tabs)/home');
                  }}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                  activeOpacity={0.7}
                  disabled={typeof props.disabled === 'boolean' ? props.disabled : undefined}
                  onBlur={typeof props.onBlur === 'function' ? props.onBlur : undefined}
                  onFocus={typeof props.onFocus === 'function' ? props.onFocus : undefined}
                  onLongPress={typeof props.onLongPress === 'function' ? props.onLongPress : undefined}
                  onPressIn={typeof props.onPressIn === 'function' ? props.onPressIn : undefined}
                  onPressOut={typeof props.onPressOut === 'function' ? props.onPressOut : undefined}
                  accessibilityState={props.accessibilityState}
                  accessibilityLabel={props.accessibilityLabel}
                  testID={props.testID}
                >
                  <Ionicons name={props.accessibilityState?.selected ? "home" : "home-outline"} size={24} color={props.accessibilityState?.selected ? '#f39c12' : '#777'} />
                  <Text style={{ fontSize: 10, color: props.accessibilityState?.selected ? '#f39c12' : '#777', marginTop: 2 }}>Home</Text>
                </TouchableOpacity>
              );
            },
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
            tabBarIcon: ({ color, size }) => (
              <Feather name="search" size={size} color={color} />
            ),
            tabBarButton: (props) => {
              const router = useRouter();
              return (
                <TouchableOpacity
                  onPress={() => router.push('/search-modal')}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                  disabled={typeof props.disabled === 'boolean' ? props.disabled : undefined}
                  onBlur={typeof props.onBlur === 'function' ? props.onBlur : undefined}
                  onFocus={typeof props.onFocus === 'function' ? props.onFocus : undefined}
                  onLongPress={typeof props.onLongPress === 'function' ? props.onLongPress : undefined}
                  onPressIn={typeof props.onPressIn === 'function' ? props.onPressIn : undefined}
                  onPressOut={typeof props.onPressOut === 'function' ? props.onPressOut : undefined}
                >
                  <Ionicons name="search-outline" size={24} color={props.accessibilityState?.selected ? '#f39c12' : '#777'} />
                  <Text style={{ fontSize: 10, color: '#777', marginTop: 2 }}>Search</Text>
                </TouchableOpacity>
              );
            },
          }}
        />
        <Tabs.Screen
          name="post"
          options={{
            title: "Post",
            tabBarLabel: '',
            tabBarIcon: ({ color, size }) => (
              <View style={{
            // Fix: Ensure delayLongPress is only number or undefined, not null
                width: 40,
                height: 30,
                borderRadius: 6,
                backgroundColor: '#f39c12',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 6,
                shadowColor: '#000',
                shadowOpacity: 0.12,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 4,
              }}>
                <Feather name="plus" size={18} color="#fff" />
              </View>
            ),
            tabBarButton: (props) => {
              // Only pass valid TouchableOpacityProps
              return (
                <TouchableOpacity
                  onPress={() => router.push('/create-post')}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={28} color="#777" />
                  <Text style={{ fontSize: 10, color: '#777', marginTop: 2 }}>Post</Text>
                </TouchableOpacity>
              );
            },
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: "Map",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "map" : "map-outline"} size={24} color={color} />
            ),
            tabBarLabel: ({ focused }) => (
              <Text style={{ fontSize: 10, color: focused ? '#f39c12' : '#777', marginTop: 2 }}>Map</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
            ),
            tabBarLabel: ({ focused }) => (
              <Text style={{ fontSize: 10, color: focused ? '#f39c12' : '#777', marginTop: 2 }}>Profile</Text>
            ),
            tabBarButton: (props) => <ProfileTabButton {...props} />,
          }}
        />
      </Tabs>
      </TabEventContext.Provider>
    </SafeAreaView>
  );
}

function ProfileTabButton(props: any) {
  const router = useRouter();
  const { children, accessibilityState } = props;
  const isSelected = accessibilityState && accessibilityState.selected;
  return (
    <TouchableOpacity
      {...props}
      onPress={() => {
        // Always navigate to the base profile route (clears any ?user= param)
        router.push('/(tabs)/profile');
      }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      {children}
    </TouchableOpacity>
  );
}

function TopMenu() {
  const router = useRouter();
  const [unreadNotif, setUnreadNotif] = React.useState(0);
  const [unreadMsg, setUnreadMsg] = React.useState(0);
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);
  const segments = useSegments();
  const isProfileScreen = segments[segments.length - 1] === 'profile';

  useEffect(() => {
    let isMounted = true;
    fetchLogoUrl().then(url => {
      if (isMounted) {
        setLogoUrl(url);
        setLogoLoading(false);
      }
    }).catch(() => setLogoLoading(false));
    return () => { isMounted = false; };
  }, []);

  React.useEffect(() => {
    async function fetchCounts() {
      const user = getCurrentUser() as { uid: string } | null;
      if (!user || !user.uid) return;
      // Notifications
        const notifRes = await getUserNotifications(user.uid);
        if (Array.isArray(notifRes)) {
          const unread = notifRes.filter((n: any) => n && typeof n.read === 'boolean' ? n.read === false : false);
          setUnreadNotif(unread.length);
        }
      // Messages
        const msgRes = await getUserConversations(user.uid);
        if (Array.isArray(msgRes)) {
          const unreadMsgs = msgRes.reduce((sum: number, convo: any) => sum + (convo.unread || 0), 0);
          setUnreadMsg(unreadMsgs);
        }
    }
    fetchCounts();
  }, []);

  return (
    <View style={[styles.topMenu, { justifyContent: 'flex-start' }]}> 
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {logoLoading ? (
          <ActivityIndicator size="small" color="#f39c12" style={{ marginVertical: 2, marginLeft: 0, marginRight: 0, height: 54, width: 130 }} />
        ) : (
          <Image
            source={{ uri: logoUrl || 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/logo%2Flogo.png?alt=media&token=e1db7a0b-4fb0-464a-82bc-44255729d46e' }}
            style={[styles.logoImg, { marginLeft: 0, marginRight: 16, alignSelf: 'flex-start' }]}
            resizeMode="contain"
            accessibilityLabel="App Logo"
          />
        )}
      </View>
      {isProfileScreen ? (
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.topBtn} onPress={() => router.push('/notifications' as any)}>
            <Feather name="bell" size={ICON_SIZE} color="#333" />
            {unreadNotif > 0 && (
              <View style={{
                position: 'absolute',
                top: isSmallDevice ? -4 : -6,
                right: isSmallDevice ? -4 : -6,
                backgroundColor: '#ff3b30',
                borderRadius: isSmallDevice ? 7 : 8,
                minWidth: unreadNotif > 99 ? (isSmallDevice ? 16 : 18) : (isSmallDevice ? 14 : 16),
                height: unreadNotif > 99 ? (isSmallDevice ? 14 : 16) : (isSmallDevice ? 12 : 14),
                paddingHorizontal: unreadNotif > 99 ? 1 : (isSmallDevice ? 2 : 3),
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                borderWidth: 1,
                borderColor: '#fff',
              }}>
                <Text style={{ 
                  color: '#fff', 
                  fontWeight: 'bold', 
                  fontSize: unreadNotif > 99 ? (isSmallDevice ? 6 : 7) : unreadNotif > 9 ? (isSmallDevice ? 7 : 8) : (isSmallDevice ? 9 : 10), 
                  lineHeight: unreadNotif > 99 ? (isSmallDevice ? 9 : 10) : (isSmallDevice ? 11 : 12) 
                }}>{unreadNotif}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.topBtn, { zIndex: 101 }]} onPress={() => setMenuVisible(true)}>
            <Feather name="more-vertical" size={ICON_SIZE} color="#333" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.topBtn} onPress={() => router.push('/inbox' as any)}>
            <Feather name="message-square" size={18} color="#333" />
            {unreadMsg > 0 && (
              <View style={{
                position: 'absolute',
                top: -4,
                right: -4,
                backgroundColor: '#f39c12',
                borderRadius: 10,
                minWidth: 16,
                paddingHorizontal: 4,
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 10 }}>{unreadMsg}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.topBtn} onPress={() => router.push('/notifications' as any)}>
            <Feather name="bell" size={18} color="#333" />
            {unreadNotif > 0 && (
              <View style={{
                position: 'absolute',
                top: -4,
                right: -4,
                backgroundColor: '#ff3b30',
                borderRadius: 10,
                minWidth: 16,
                paddingHorizontal: unreadNotif > 99 ? 2 : 4,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100
              }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: unreadNotif > 99 ? 8 : 10 }}>{unreadNotif}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
      {/* Modern clean bottom sheet for settings/activity */}
      {menuVisible && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity 
            style={{ flex: 1, width: '100%' }} 
            activeOpacity={1} 
            onPress={() => setMenuVisible(false)} 
          />
          <SafeAreaView style={{ width: '100%' }} edges={["bottom"]}>
            <View style={styles.igSheet}> 
              {/* Handle */}
              <View style={styles.handleContainer}>
                <View style={styles.igHandle} />
              </View>
              
              {/* Menu Items Container */}
              <View style={styles.menuItemsContainer}>
                {/* Settings Group */}
                <View style={styles.menuGroup}>
                  <TouchableOpacity 
                    style={styles.igItem} 
                    activeOpacity={0.7} 
                    onPress={() => { setMenuVisible(false); router.push('/settings'); }}
                  >
                    <View style={styles.iconContainer}>
                      <Feather name="settings" size={ICON_SIZE} color="#667eea" />
                    </View>
                    <Text style={styles.igText}>Settings</Text>
                    <Feather name="chevron-right" size={CHEVRON_SIZE} color="#ccc" style={styles.chevron} />
                  </TouchableOpacity>

                  <View style={styles.separator} />

                  <TouchableOpacity 
                    style={styles.igItem} 
                    activeOpacity={0.7} 
                    onPress={() => { setMenuVisible(false); router.push('/friends'); }}
                  >
                    <View style={styles.iconContainer}>
                      <Feather name="users" size={ICON_SIZE} color="#667eea" />
                    </View>
                    <Text style={styles.igText}>Friends</Text>
                    <Feather name="chevron-right" size={CHEVRON_SIZE} color="#ccc" style={styles.chevron} />
                  </TouchableOpacity>
                </View>

                {/* Content Group */}
                <View style={styles.menuGroup}>
                  <TouchableOpacity 
                    style={styles.igItem} 
                    activeOpacity={0.7} 
                    onPress={() => { setMenuVisible(false); router.push('/saved'); }}
                  >
                    <View style={styles.iconContainer}>
                      <Feather name="bookmark" size={ICON_SIZE} color="#667eea" />
                    </View>
                    <Text style={styles.igText}>Saved Posts</Text>
                    <Feather name="chevron-right" size={CHEVRON_SIZE} color="#ccc" style={styles.chevron} />
                  </TouchableOpacity>

                  <View style={styles.separator} />

                  <TouchableOpacity 
                    style={styles.igItem} 
                    activeOpacity={0.7} 
                    onPress={() => { setMenuVisible(false); router.push('/archive'); }}
                  >
                    <View style={styles.iconContainer}>
                      <Feather name="archive" size={ICON_SIZE} color="#667eea" />
                    </View>
                    <Text style={styles.igText}>Archive</Text>
                    <Feather name="chevron-right" size={CHEVRON_SIZE} color="#ccc" style={styles.chevron} />
                  </TouchableOpacity>

                  <View style={styles.separator} />

                  <TouchableOpacity 
                    style={styles.igItem} 
                    activeOpacity={0.7} 
                    onPress={() => { setMenuVisible(false); router.push('/highlight/1'); }}
                  >
                    <View style={styles.iconContainer}>
                      <Feather name="star" size={ICON_SIZE} color="#667eea" />
                    </View>
                    <Text style={styles.igText}>Highlights</Text>
                    <Feather name="chevron-right" size={CHEVRON_SIZE} color="#ccc" style={styles.chevron} />
                  </TouchableOpacity>
                </View>

                {/* Logout Button */}
                <TouchableOpacity 
                  style={styles.igItemLogout} 
                  activeOpacity={0.7} 
                  onPress={async () => { 
                    setMenuVisible(false);
                    try {
                      const { signOut } = await import('firebase/auth');
                      const { auth } = await import('../../config/firebase');
                      await signOut(auth);
                      console.log('Logged out successfully');
                      router.replace('/auth/welcome');
                    } catch (error) {
                      console.error('Logout error:', error);
                      Alert.alert('Error', 'Failed to log out. Please try again.');
                    }
                  }}
                >
                  <View style={[styles.iconContainer, { backgroundColor: '#fee' }]}>
                    <Feather name="log-out" size={ICON_SIZE} color="#e74c3c" />
                  </View>
                  <Text style={styles.igTextLogout}>Log Out</Text>
                </TouchableOpacity>

                {/* Cancel Button */}
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  activeOpacity={0.7} 
                  onPress={() => setMenuVisible(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topMenu: {
    height: isSmallDevice ? 50 : 56,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isSmallDevice ? 12 : 14,
  },
  logo: { 
    fontSize: isSmallDevice ? 14 : (isLargeDevice ? 17 : 16), 
    fontWeight: '700' 
  },
  logoImg: {
    height: isSmallDevice ? 40 : 54,
    width: isSmallDevice ? 130 : 170,
    marginVertical: 2,
    marginLeft: 2,
    marginRight: 2,
  },
  topBtn: { 
    marginLeft: isSmallDevice ? 8 : 12, 
    padding: isSmallDevice ? 4 : 6 
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 999,
  },
  igSheet: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: isSmallDevice ? 18 : 24,
    borderTopRightRadius: isSmallDevice ? 18 : 24,
    paddingTop: 8,
    paddingBottom: isSmallDevice ? 16 : 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  igHandle: {
    width: isSmallDevice ? 32 : 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
  },
  menuItemsContainer: {
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingTop: isSmallDevice ? 8 : 12,
  },
  menuGroup: {
    backgroundColor: '#fff',
    borderRadius: isSmallDevice ? 10 : 12,
    marginBottom: isSmallDevice ? 10 : 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  igItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isSmallDevice ? 12 : 14,
    paddingHorizontal: isSmallDevice ? 14 : 16,
    backgroundColor: '#fff',
  },
  iconContainer: {
    width: isSmallDevice ? 32 : (isLargeDevice ? 40 : 36),
    height: isSmallDevice ? 32 : (isLargeDevice ? 40 : 36),
    borderRadius: isSmallDevice ? 16 : (isLargeDevice ? 20 : 18),
    backgroundColor: '#f0f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: isSmallDevice ? 10 : 12,
  },
  igText: {
    flex: 1,
    color: '#1f2937',
    fontSize: isSmallDevice ? 14 : (isLargeDevice ? 17 : 16),
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 'auto',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#e5e7eb',
    marginLeft: isSmallDevice ? 54 : (isLargeDevice ? 68 : 64),
  },
  igItemLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isSmallDevice ? 12 : 14,
    paddingHorizontal: isSmallDevice ? 14 : 16,
    backgroundColor: '#fff',
    borderRadius: isSmallDevice ? 10 : 12,
    marginBottom: isSmallDevice ? 10 : 12,
    shadowColor: '#e74c3c',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  igTextLogout: {
    flex: 1,
    color: '#e74c3c',
    fontSize: isSmallDevice ? 14 : (isLargeDevice ? 17 : 16),
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderRadius: isSmallDevice ? 10 : 12,
    paddingVertical: isSmallDevice ? 14 : 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cancelText: {
    color: '#6b7280',
    fontSize: isSmallDevice ? 15 : (isLargeDevice ? 17 : 16),
    fontWeight: '600',
  },
});

