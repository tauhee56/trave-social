import { Feather, MaterialIcons } from "@expo/vector-icons";
import { Tabs, useRouter, useSegments } from "expo-router";
import React, { createContext, useContext, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { getCurrentUser, getUserConversations, getUserNotifications } from '../../lib/firebaseHelpers';


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
                  {...props}
                  onPress={() => {
                    tabEvent?.emitHomeTabPress();
                    router.push('/(tabs)/home');
                  }}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                />
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
                  // Do not spread props to TouchableOpacity to avoid type errors
                  onPress={() => router.push('/search-modal')}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                  delayLongPress={typeof props.delayLongPress === 'number' ? props.delayLongPress : undefined}
                  disabled={typeof props.disabled === 'boolean' ? props.disabled : undefined}
                  onBlur={typeof props.onBlur === 'function' ? props.onBlur : undefined}
                  onFocus={typeof props.onFocus === 'function' ? props.onFocus : undefined}
                  onLongPress={typeof props.onLongPress === 'function' ? props.onLongPress : undefined}
                  onPressIn={typeof props.onPressIn === 'function' ? props.onPressIn : undefined}
                  onPressOut={typeof props.onPressOut === 'function' ? props.onPressOut : undefined}
                >
                  <Feather name="search" size={24} color={props.accessibilityState?.selected ? '#f39c12' : '#777'} />
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
                  <View style={{
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
                </TouchableOpacity>
              );
            },
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: "Map",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="map" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Feather name="user" size={size} color={color} />
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
  const segments = useSegments();
  const isProfileScreen = segments[segments.length - 1] === 'profile';

  React.useEffect(() => {
    async function fetchCounts() {
      const user = getCurrentUser();
      if (!user) return;
      // Notifications
      const notifRes = await getUserNotifications(user.uid);
      if (notifRes.success && Array.isArray(notifRes.data)) {
        const unread = notifRes.data.filter((n: any) => n && typeof n.read === 'boolean' ? n.read === false : false);
        setUnreadNotif(unread.length);
      }
      // Messages
      const msgRes = await getUserConversations(user.uid);
      if (msgRes.success && Array.isArray(msgRes.data)) {
        const unreadMsgs = msgRes.data.reduce((sum, convo) => sum + (convo.unread || 0), 0);
        setUnreadMsg(unreadMsgs);
      }
    }
    fetchCounts();
  }, []);

  return (
    <View style={styles.topMenu}>
      {isProfileScreen ? (
        <>
          <Text style={styles.logo}>Logo</Text>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity style={styles.topBtn} onPress={() => router.push('/notifications' as any)}>
              <Feather name="bell" size={20} color="#333" />
              {unreadNotif > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: '#ff3b30',
                  borderRadius: 10,
                  minWidth: 16,
                  paddingHorizontal: 4,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 10 }}>{unreadNotif}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.topBtn, { zIndex: 101 }]} onPress={() => setMenuVisible(true)}>
              <Feather name="more-vertical" size={20} color="#333" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.logo}>Logo</Text>
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
                  paddingHorizontal: 4,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 10 }}>{unreadNotif}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
      {/* Instagram-style bottom sheet for settings/activity */}
      {menuVisible && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={{ flex: 1, width: '100%' }} activeOpacity={1} onPress={() => setMenuVisible(false)} />
          <SafeAreaView style={{ width: '100%' }} edges={["bottom"]}>
            <View style={[styles.igSheet, { paddingHorizontal: 0, paddingBottom: 56 }]}> 
              <View style={{ alignItems: 'center', marginBottom: 10 }}>
                <View style={styles.igHandle} />
              </View>
              <View style={{ width: '100%', paddingHorizontal: 18 }}>
                <TouchableOpacity style={[styles.igItem, styles.igRow]} activeOpacity={0.85} onPress={() => { setMenuVisible(false); router.push('/privacy'); }}>
                  <Feather name="lock" size={22} color="#333" style={styles.igIcon} />
                  <Text style={styles.igText}>Privacy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.igItem, styles.igRow]} activeOpacity={0.85} onPress={() => { setMenuVisible(false); router.push('/friends'); }}>
                  <Feather name="users" size={22} color="#333" style={styles.igIcon} />
                  <Text style={styles.igText}>Friends</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.igItem, styles.igRow]} activeOpacity={0.85} onPress={() => { setMenuVisible(false); router.push('/archive'); }}>
                  <Feather name="archive" size={22} color="#333" style={styles.igIcon} />
                  <Text style={styles.igText}>Archive Chats</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.igItem, styles.igRow]} activeOpacity={0.85} onPress={() => { setMenuVisible(false); router.push('/highlight/1'); }}>
                  <Feather name="star" size={22} color="#333" style={styles.igIcon} />
                  <Text style={styles.igText}>Highlights</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.igItem, styles.igRow]} activeOpacity={0.85} onPress={() => { setMenuVisible(false); router.push('/saved'); }}>
                  <Feather name="bookmark" size={22} color="#333" style={styles.igIcon} />
                  <Text style={styles.igText}>Saved</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.igItemLogout, styles.igRow]} activeOpacity={0.85} onPress={() => { setMenuVisible(false); router.replace('/auth/welcome'); }}>
                  <Feather name="log-out" size={22} color="#e0245e" style={styles.igIcon} />
                  <Text style={styles.igTextLogout}>Logout</Text>
                </TouchableOpacity>
                <View style={styles.igDivider} />
                <TouchableOpacity style={[styles.igItem, { alignItems: 'center', marginBottom: 0 }]} activeOpacity={0.85} onPress={() => setMenuVisible(false)}>
                  <Text style={[styles.igText, { fontSize: 17 }]}>Cancel</Text>
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
    igRow: {
      // merged into igItem for consistency
    },
    igIcon: {
      marginRight: 16,
    },
    igDivider: {
      width: '100%',
      height: 1,
      backgroundColor: '#eee',
      marginVertical: 8,
    },
  topMenu: {
    height: 56,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  logo: { fontSize: 16, fontWeight: '700' },
  topBtn: { marginLeft: 12, padding: 6 },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 999,
  },
  igSheet: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 56,
    paddingTop: 18,
    paddingHorizontal: 0,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
    alignItems: 'center',
    zIndex: 1001,
  },
  igHandle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#e5e5e5',
    marginBottom: 20,
    marginTop: 2,
  },
  igItem: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 2,
    backgroundColor: '#fff',
    justifyContent: 'flex-start',
  },
  igItemLogout: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 2,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0245e',
    justifyContent: 'flex-start',
  },
  igText: {
    color: '#222',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  igTextLogout: {
    color: '#e0245e',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

