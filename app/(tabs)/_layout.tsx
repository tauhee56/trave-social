import { Feather, Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from 'expo-image';
import { Tabs, useFocusEffect, useRouter, useSegments } from "expo-router";
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View, FlatList, Modal, ScrollView } from 'react-native';
import { useNotifications } from '../../hooks/useNotifications';
import { notificationService } from '../../lib/notificationService';
let RtcSurfaceView: any = null;
let VideoSourceType: any = null;
let RenderModeType: any = null;
try {
  const AgoraSDK = require('react-native-agora');
  RtcSurfaceView = AgoraSDK.RtcSurfaceView;
  VideoSourceType = AgoraSDK.VideoSourceType;
  RenderModeType = AgoraSDK.RenderModeType;
} catch {}
// Minimize overlay removed
import { SafeAreaView } from "react-native-safe-area-context";
import { logAnalyticsEvent, setAnalyticsUserId } from '../../lib/analytics';
import { getUserConversations } from '../../lib/firebaseHelpers/conversation';
import { getUserNotifications } from '../../lib/firebaseHelpers/notification';
import fetchLogoUrl from '../../src/_services/brandingService';
import { useUser } from '../_components/UserContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallDevice = SCREEN_WIDTH < 375;
const isLargeDevice = SCREEN_WIDTH >= 414;
const ICON_SIZE = isSmallDevice ? 18 : (isLargeDevice ? 22 : 20);
const CHEVRON_SIZE = isSmallDevice ? 18 : 20;


// Create a context for tab events
const TabEventContext = createContext<{ emitHomeTabPress: () => void; subscribeHomeTabPress: (cb: () => void) => () => void } | undefined>(undefined);

export const useTabEvent = () => useContext(TabEventContext);

// Dedicated tab bar button components so hooks stay inside components
const HomeTabButton = (props: any) => {
  const router = useRouter();
  const tabEvent = useTabEvent();
  return (
    <TouchableOpacity
      {...props}
      onPress={() => {
        tabEvent?.emitHomeTabPress();
        logAnalyticsEvent('tab_home_press', { selected: props.accessibilityState?.selected === true });
        router.push('/(tabs)/home');
      }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      activeOpacity={0.7}
    >
      <Ionicons name={props.accessibilityState?.selected ? 'home' : 'home-outline'} size={24} color={props.accessibilityState?.selected ? '#f39c12' : '#777'} />
      <Text style={{ fontSize: 10, color: props.accessibilityState?.selected ? '#f39c12' : '#777', marginTop: 2 }}>Home</Text>
    </TouchableOpacity>
  );
};

const SearchTabButton = (props: any) => {
  const router = useRouter();
  return (
    <TouchableOpacity
      {...props}
      onPress={() => { logAnalyticsEvent('tab_search_press'); router.push('/search-modal'); }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      activeOpacity={0.7}
    >
      <Ionicons name="search-outline" size={24} color={props.accessibilityState?.selected ? '#f39c12' : '#777'} />
      <Text style={{ fontSize: 10, color: '#777', marginTop: 2 }}>Search</Text>
    </TouchableOpacity>
  );
};

const MapTabButton = (props: any) => {
  const router = useRouter();
  return (
    <TouchableOpacity
      {...props}
      onPress={() => { logAnalyticsEvent('tab_map_press'); router.push('/(tabs)/map'); }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      activeOpacity={0.7}
    >
      <Ionicons name={props.accessibilityState?.selected ? 'map' : 'map-outline'} size={24} color={props.accessibilityState?.selected ? '#f39c12' : '#777'} />
      <Text style={{ fontSize: 10, color: props.accessibilityState?.selected ? '#f39c12' : '#777', marginTop: 2 }}>Map</Text>
    </TouchableOpacity>
  );
};

const ProfileTabButton = (props: any) => {
  const router = useRouter();
  return (
    <TouchableOpacity
      {...props}
      onPress={() => { logAnalyticsEvent('tab_profile_press'); router.push('/(tabs)/profile'); }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      activeOpacity={0.7}
    >
      <Ionicons name={props.accessibilityState?.selected ? 'person' : 'person-outline'} size={24} color={props.accessibilityState?.selected ? '#f39c12' : '#777'} />
      <Text style={{ fontSize: 10, color: props.accessibilityState?.selected ? '#f39c12' : '#777', marginTop: 2 }}>Profile</Text>
    </TouchableOpacity>
  );
};

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
  const user = useUser();
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
          lazy: true,
          unmountOnBlur: false,
          freezeOnBlur: true,
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
            tabBarButton: (props) => <HomeTabButton {...props} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
            tabBarIcon: ({ color, size }) => (
              <Feather name="search" size={size} color={color} />
            ),
            tabBarButton: (props) => <SearchTabButton {...props} />,
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
                  onPress={() => { logAnalyticsEvent('tab_post_press'); router.push('/create-post'); }}
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
            tabBarButton: (props) => <MapTabButton {...props} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
            ),
            tabBarButton: (props) => <ProfileTabButton {...props} />,
          }}
        />
      </Tabs>
      </TabEventContext.Provider>
    </SafeAreaView>
  );
}

function TopMenu() {
  const router = useRouter();
  const user = useUser();
  const [unreadNotif, setUnreadNotif] = React.useState(0);
  const [unreadMsg, setUnreadMsg] = React.useState(0);
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = React.useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);
  const segments = useSegments();
  const isProfileScreen = segments[segments.length - 1] === 'profile';
  
  // Get notifications from hook
  const { notifications, unreadCount, fetchNotifications, markAsRead } = useNotifications(user?.uid || '');

  useEffect(() => {
    const u = user;
    if (u?.uid) setAnalyticsUserId(u.uid);
  }, [user]);

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

  // Refresh badge counts when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      async function fetchCounts() {
        const userData = user;
        if (!userData || !userData.uid) return;
        // Notifications
          const notifRes = await getUserNotifications(userData.uid);
          if (Array.isArray(notifRes)) {
            const unread = notifRes.filter((n: any) => n && typeof n.read === 'boolean' ? n.read === false : false);
            setUnreadNotif(unread.length);
          }
        // Messages
          const msgRes = await getUserConversations(userData.uid);
          if (Array.isArray(msgRes)) {
            const unreadMsgs = msgRes.reduce((sum: number, convo: any) => sum + (convo.unread || 0), 0);
            setUnreadMsg(unreadMsgs);
          }
      }
      fetchCounts();
    }, [])
  );

  const renderNotificationItem = (item: any) => (
    <TouchableOpacity
      style={styles.notificationItem}
      onPress={() => markAsRead(item._id)}
    >
      <View style={styles.notificationContent}>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationType}>{item.type}</Text>
        <Text style={styles.notificationTime}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.topMenu, { justifyContent: 'flex-start' }]}> 
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {logoLoading ? (
          <ActivityIndicator size="small" color="#f39c12" style={{ marginVertical: 2, marginLeft: 0, marginRight: 0, height: 54, width: 130 }} />
        ) : (
          <ExpoImage
            source={{ uri: logoUrl || 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/logo/logo.png' }}
            style={[styles.logoImg, { marginLeft: 0, marginRight: 16, alignSelf: 'flex-start' }]}
            contentFit="contain"
            transition={200}
            cachePolicy="memory-disk"
            accessibilityLabel="App Logo"
          />
        )}
      </View>
      {isProfileScreen ? (
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.topBtn} onPress={() => { logAnalyticsEvent('open_notifications'); setNotificationsModalVisible(true); }}>
            <Feather name="bell" size={ICON_SIZE} color="#333" />
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute',
                top: isSmallDevice ? -4 : -6,
                right: isSmallDevice ? -4 : -6,
                backgroundColor: '#ff3b30',
                borderRadius: isSmallDevice ? 7 : 8,
                minWidth: unreadCount > 99 ? (isSmallDevice ? 16 : 18) : (isSmallDevice ? 14 : 16),
                height: unreadCount > 99 ? (isSmallDevice ? 14 : 16) : (isSmallDevice ? 12 : 14),
                paddingHorizontal: unreadCount > 99 ? 1 : (isSmallDevice ? 2 : 3),
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                borderWidth: 1,
                borderColor: '#fff',
              }}>
                <Text style={{ 
                  color: '#fff', 
                  fontWeight: 'bold', 
                  fontSize: unreadCount > 99 ? (isSmallDevice ? 6 : 7) : unreadCount > 9 ? (isSmallDevice ? 7 : 8) : (isSmallDevice ? 9 : 10), 
                  lineHeight: unreadCount > 99 ? (isSmallDevice ? 9 : 10) : (isSmallDevice ? 11 : 12) 
                }}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.topBtn, { zIndex: 101 }]} onPress={() => { logAnalyticsEvent('open_menu'); setMenuVisible(true); }}>
            <Feather name="more-vertical" size={ICON_SIZE} color="#333" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.topBtn} onPress={() => { logAnalyticsEvent('open_inbox'); router.push('/inbox' as any); }}>
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
          <TouchableOpacity style={styles.topBtn} onPress={() => { logAnalyticsEvent('open_notifications'); setNotificationsModalVisible(true); }}>
            <Feather name="bell" size={18} color="#333" />
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute',
                top: -4,
                right: -4,
                backgroundColor: '#ff3b30',
                borderRadius: 10,
                minWidth: 16,
                paddingHorizontal: unreadCount > 99 ? 2 : 4,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100
              }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: unreadCount > 99 ? 8 : 10 }}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications Modal */}
      <Modal
        visible={notificationsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNotificationsModalVisible(false)}
      >
        <View style={styles.notificationsModal}>
          <View style={styles.notificationsHeader}>
            <Text style={styles.notificationsTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => setNotificationsModalVisible(false)}>
              <Feather name="x" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {notifications.length > 0 ? (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => renderNotificationItem(item)}
              contentContainerStyle={styles.notificationsList}
            />
          ) : (
            <View style={styles.emptyNotifications}>
              <Feather name="bell-off" size={48} color="#ccc" />
              <Text style={styles.emptyNotificationsText}>No notifications yet</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Modern clean bottom sheet for settings/activity */}
      {menuVisible && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity 
            style={{ flex: 1, width: '100%' }} 
            activeOpacity={1} 
            onPress={() => setMenuVisible(false)} 
          />
          <View style={{ width: '100%' }}>
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
                    onPress={() => { logAnalyticsEvent('open_settings'); setMenuVisible(false); router.push('/settings'); }}
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
                    onPress={() => { logAnalyticsEvent('open_friends'); setMenuVisible(false); router.push('/friends'); }}
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
                    onPress={() => { logAnalyticsEvent('open_saved'); setMenuVisible(false); router.push('/saved'); }}
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
                    onPress={() => { logAnalyticsEvent('open_archive'); setMenuVisible(false); router.push('/archive'); }}
                  >
                    <View style={styles.iconContainer}>
                      <Feather name="archive" size={ICON_SIZE} color="#667eea" />
                    </View>
                    <Text style={styles.igText}>Archive</Text>
                    <Feather name="chevron-right" size={CHEVRON_SIZE} color="#ccc" style={styles.chevron} />
                  </TouchableOpacity>

                </View>

                {/* Legal Group */}
                <View style={styles.menuGroup}>
                  <TouchableOpacity 
                    style={styles.igItem} 
                    activeOpacity={0.7} 
                    onPress={() => { logAnalyticsEvent('open_privacy'); setMenuVisible(false); router.push('/legal/privacy'); }}
                  >
                    <View style={styles.iconContainer}>
                      <Feather name="shield" size={ICON_SIZE} color="#667eea" />
                    </View>
                    <Text style={styles.igText}>Privacy Policy</Text>
                    <Feather name="chevron-right" size={CHEVRON_SIZE} color="#ccc" style={styles.chevron} />
                  </TouchableOpacity>

                  <View style={styles.separator} />

                  <TouchableOpacity 
                    style={styles.igItem} 
                    activeOpacity={0.7} 
                    onPress={() => { logAnalyticsEvent('open_terms'); setMenuVisible(false); router.push('/legal/terms'); }}
                  >
                    <View style={styles.iconContainer}>
                      <Feather name="file-text" size={ICON_SIZE} color="#667eea" />
                    </View>
                    <Text style={styles.igText}>Terms of Service</Text>
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
                      logAnalyticsEvent('logout');
                      // Import and use actual logout function
                      const { logoutUser } = await import('../_services/firebaseAuthService');
                      const result = await logoutUser();
                      if (result.success) {
                        console.log('Logged out successfully');
                        router.replace('/auth/welcome');
                      } else {
                        Alert.alert('Error', result.error || 'Logout failed');
                      }
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
                  onPress={() => { logAnalyticsEvent('close_menu'); setMenuVisible(false); }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
      {/* Mini stream overlay removed as per request */}
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
    paddingTop: isSmallDevice ? 40 : 48,
    paddingBottom: isSmallDevice ? 24 : 32,
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
  notificationsModal: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: isSmallDevice ? 50 : 60,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  notificationsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  notificationsList: {
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  notificationType: {
    fontSize: 12,
    color: '#f39c12',
    fontWeight: '600',
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f39c12',
    marginLeft: 8,
  },
  emptyNotifications: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyNotificationsText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  miniOverlay: {
    position: 'absolute',
    bottom: isSmallDevice ? 90 : 100,
    right: isSmallDevice ? 12 : 16,
    width: isSmallDevice ? 160 : 180,
    height: isSmallDevice ? 280 : 320,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 10,
    zIndex: 1000,
  },
  miniHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  miniBtn: { padding: 4 },
});

// MiniStreamOverlay removed