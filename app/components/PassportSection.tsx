import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { addPassportTicket, deletePassportTicket, getPassportTickets } from '../../lib/firebaseHelpers';

interface CountryTicket {
  id?: string;
  countryCode: string;
  countryName: string;
  flag: string;
  visitDate: string;
  city?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface PassportSectionProps {
  userId: string;
  isOwner?: boolean;
}

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: false,
  }),
});


const PassportSection: React.FC<PassportSectionProps> = ({ userId, isOwner }) => {
  const [visitedCountries, setVisitedCountries] = useState<CountryTicket[]>([]);
  const [currentCountry, setCurrentCountry] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOwner) {
      initializePassport();
    } else {
      loadVisitedCountries();
    }
  }, [userId, isOwner]);

  const initializePassport = async () => {
    await requestPermissions();
    await loadVisitedCountries();
    await startLocationTracking();
  };

  const requestPermissions = async () => {
    try {
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
      if (locationStatus !== 'granted') {
        Alert.alert('Location Permission', 'Please enable location for passport tracking.');
      }
      if (notificationStatus !== 'granted') {
        Alert.alert('Notification Permission', 'Please enable notifications to get country alerts.');
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const startLocationTracking = async () => {
    if (!isOwner) return;
    try {
      setIsTracking(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await checkLocation(location.coords.latitude, location.coords.longitude);
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 300000,
          distanceInterval: 5000,
        },
        async (location) => {
          await checkLocation(location.coords.latitude, location.coords.longitude);
        }
      );
    } catch (error) {
      console.error('Location tracking error:', error);
      setIsTracking(false);
    }
  };

  const checkLocation = async (lat: number, lon: number) => {
    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      if (geocode && geocode[0]) {
        const countryCode = geocode[0].isoCountryCode || '';
        const countryName = geocode[0].country || '';
        const city = geocode[0].city || '';
        if (countryCode && countryCode !== currentCountry) {
          const isVisited = visitedCountries.some((c) => c.countryCode === countryCode);
          if (!isVisited) {
            setCurrentCountry(countryCode);
            await notifyNewCountry(countryName, countryCode, city, { latitude: lat, longitude: lon });
          } else {
            setCurrentCountry(countryCode);
          }
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const notifyNewCountry = async (
    countryName: string,
    countryCode: string,
    city: string,
    coords: { latitude: number; longitude: number }
  ) => {
    if (!isOwner) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎉 New Country Detected!',
        body: `Welcome to ${countryName}! Get your travel ticket now!`,
        data: { countryCode, countryName, city },
      },
      trigger: null,
    });
    Alert.alert(
      '🎫 New Country Detected!',
      `You've entered ${countryName}! Would you like to collect your ticket?`,
      [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Get Ticket',
          onPress: () => collectTicket(countryName, countryCode, city, coords),
        },
      ]
    );
  };

  const collectTicket = async (
    countryName: string,
    countryCode: string,
    city: string,
    coords: { latitude: number; longitude: number }
  ) => {
    try {
      const ticket: CountryTicket = {
        countryCode,
        countryName,
        flag: getFlagEmoji(countryCode),
        visitDate: new Date().toISOString(),
        city,
        coordinates: coords,
      };
      const alreadyVisited = visitedCountries.some((c) => c.countryCode === countryCode);
      if (alreadyVisited) {
        Alert.alert('Already Collected', `${getFlagEmoji(countryCode)} ${countryName} ticket is already in your passport!`);
        return;
      }
      const result = await addPassportTicket(userId, ticket);
      if (result.success) {
        setVisitedCountries([...visitedCountries, ticket]);
        Alert.alert('✅ Ticket Collected!', `${ticket.flag} ${countryName} ticket added to your passport!`);
      } else {
        Alert.alert('Already Collected', `${getFlagEmoji(countryCode)} ${countryName} ticket is already in your passport!`);
      }
    } catch (error) {
      console.error('Error collecting ticket:', error);
      Alert.alert('Error', 'Failed to collect ticket. Please try again.');
    }
  };

  const getFlagEmoji = (countryCode: string): string => {
    if (!countryCode || countryCode.length !== 2) return '🌍';
    const codePoints = countryCode.toUpperCase().split('').map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const loadVisitedCountries = async () => {
    try {
      setLoading(true);
      const tickets = await getPassportTickets(userId);
      setVisitedCountries(tickets as CountryTicket[]);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- UI ---
  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>Loading passport...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {visitedCountries.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: '#999' }}>No passport tickets yet.</Text>
            </View>
          ) : (
            visitedCountries.map((ticket) => (
              <View key={ticket.id || ticket.countryCode} style={{ marginBottom: 16, backgroundColor: '#fff', borderRadius: 8, padding: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 }}>
                <Text style={{ fontSize: 24 }}>{ticket.flag}</Text>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{ticket.countryName}</Text>
                <Text style={{ color: '#666', fontSize: 13 }}>{ticket.city || 'Unknown City'}</Text>
                <Text style={{ color: '#aaa', fontSize: 12 }}>{new Date(ticket.visitDate).toLocaleDateString()}</Text>
                {isOwner && (
                  <TouchableOpacity style={{ marginTop: 8 }} onPress={() => {
                    Alert.alert(
                      'Delete Ticket',
                      `Are you sure you want to delete ${ticket.countryName} ticket?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await deletePassportTicket(userId, ticket.countryCode);
                              setVisitedCountries(visitedCountries.filter((c) => c.countryCode !== ticket.countryCode));
                              Alert.alert('Deleted', `${ticket.countryName} ticket removed from your passport.`);
                            } catch (error) {
                              Alert.alert('Error', 'Failed to delete ticket.');
                            }
                          },
                        },
                      ]
                    );
                  }}>
                    <Text style={{ color: '#d00' }}>Delete Ticket</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>

  );
};

export default PassportSection;



// Stamp style variations for tickets
const stampStyles = [
  {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF6B00',
    borderStyle: 'dashed' as 'dashed',
    backgroundColor: '#FFF5E6',
    transform: [{ rotate: '-6deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  {
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#222',
    borderStyle: 'solid' as 'solid',
    backgroundColor: '#F0F0F0',
    transform: [{ rotate: '4deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FF6B00',
    borderStyle: 'dotted' as 'dotted',
    backgroundColor: '#FFF',
    transform: [{ rotate: '-2deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#222',
    borderStyle: 'dashed' as 'dashed',
    backgroundColor: '#FFF5E6',
    transform: [{ rotate: '8deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
];

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
    color: '#000',
  },
  badge: {
    backgroundColor: '#FF6B00',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  count: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContent: {
    padding: 8,
  },
  ticketsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  ticket: {
    width: '48%',
    height: 130,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  flag: {
    fontSize: 32,
    marginBottom: 4,
  },
  stampCountry: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
    color: '#222',
    letterSpacing: 1,
  },
  stampDate: {
    fontSize: 11,
    color: '#444',
    marginBottom: 2,
  },
  stampCity: {
    fontSize: 10,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  emptyState: {
    width: 200,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  trackingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
});
