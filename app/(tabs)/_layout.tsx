import React from 'react';
import { Tabs, useRouter, useSegments } from "expo-router";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getUserNotifications, getCurrentUser, getUserConversations } from '../../lib/firebaseHelpers';

export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const isProfileScreen = segments[segments.length - 1] === 'profile';
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      {!isProfileScreen && <TopMenu />}
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
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              router.push('/(tabs)/home');
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
          }}
        />
        <Tabs.Screen
          name="post"
          options={{
            title: "Post",
            tabBarLabel: '',
            tabBarIcon: ({ color, size }) => (
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
            ),
            tabBarButton: (props) => {
              const { onPress, ...rest } = props;
              return (
                <TouchableOpacity
                  {...rest}
                  onPress={() => router.push('/create-post')}
                />
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

  React.useEffect(() => {
    async function fetchCounts() {
      const user = getCurrentUser();
      if (!user) return;
      // Notifications
      const notifRes = await getUserNotifications(user.uid);
      if (notifRes.success && Array.isArray(notifRes.data)) {
        const unread = notifRes.data.filter(n => n.read === false || n.read === undefined);
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
    </View>
  );
}

const styles = StyleSheet.create({
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
});

