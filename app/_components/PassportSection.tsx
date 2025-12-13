import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getPassportTickets } from '../../lib/firebaseHelpers/index';

// Conditionally import location service to avoid native module errors
let getCurrentLocation: any = null;
try {
  const locationService = require('../../services/locationService');
  getCurrentLocation = locationService.getCurrentLocation;
} catch (error) {
  console.log('Location service not available:', error);
}

const { width } = Dimensions.get('window');

interface PassportTicket {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  visitDate: number;
  imageUrl?: string;
  notes?: string;
}

interface PassportSectionProps {
  userId: string;
  isOwner?: boolean;
}

const PassportSection: React.FC<PassportSectionProps> = ({ userId, isOwner }) => {
  const [tickets, setTickets] = useState<PassportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{ city?: string; country?: string } | null>(null);

  useEffect(() => {
    loadPassportData();
  }, [userId]);

  const loadPassportData = async () => {
    try {
      setLoading(true);
      
      // Load passport tickets
      const result = await getPassportTickets(userId);
      if (Array.isArray(result)) {
        setTickets(result as PassportTicket[]);
      }
      
      // Get current location if owner
      if (isOwner && getCurrentLocation) {
        try {
          const location = await getCurrentLocation();
          if (location) {
            setCurrentLocation({
              city: location.city,
              country: location.country
            });
          }
        } catch (error) {
          console.log('Error getting current location:', error);
          setCurrentLocation(null);
        }
      }
    } catch (error) {
      console.error('❌ Error loading passport data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFlagEmoji = (countryCode: string): string => {
    if (!countryCode || countryCode.length !== 2) return '🌍';
    const codePoints = countryCode.toUpperCase().split('').map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f39c12" />
        <Text style={styles.loadingText}>Loading your passport...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Current Location Card */}
      {isOwner && currentLocation && (
        <View style={styles.currentLocationCard}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.locationGradient}
          >
            <Feather name="map-pin" size={24} color="#fff" />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Current Location</Text>
              <Text style={styles.locationText}>
                {currentLocation.city}, {currentLocation.country}
              </Text>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{tickets.length}</Text>
          <Text style={styles.statLabel}>Places Visited</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{new Set(tickets.map(t => t.country)).size}</Text>
          <Text style={styles.statLabel}>Countries</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{new Set(tickets.map(t => t.city)).size}</Text>
          <Text style={styles.statLabel}>Cities</Text>
        </View>
      </View>

      {/* Passport Stamps Grid */}
      <View style={styles.stampsHeader}>
        <Text style={styles.stampsTitle}>Travel Stamps</Text>
        <Feather name="award" size={20} color="#f39c12" />
      </View>

      {tickets.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="globe" size={64} color="#ddd" />
          <Text style={styles.emptyTitle}>No Stamps Yet</Text>
          <Text style={styles.emptyText}>
            Start traveling to collect passport stamps!
          </Text>
        </View>
      ) : (
        <View style={styles.stampsGrid}>
          {tickets.map((ticket) => (
            <TouchableOpacity
              key={ticket.id}
              style={styles.stampCard}
              activeOpacity={0.8}
            >
              {/* Stamp Image Background */}
              {ticket.imageUrl ? (
                <Image
                  source={{ uri: ticket.imageUrl }}
                  style={styles.stampImage}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={['#f39c12', '#e74c3c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.stampImage}
                />
              )}

              {/* Stamp Overlay */}
              <View style={styles.stampOverlay}>
                {/* Flag */}
                <Text style={styles.stampFlag}>{getFlagEmoji(ticket.countryCode)}</Text>

                {/* Country & City */}
                <View style={styles.stampInfo}>
                  <Text style={styles.stampCountry} numberOfLines={1}>
                    {ticket.country}
                  </Text>
                  <Text style={styles.stampCity} numberOfLines={1}>
                    {ticket.city}
                  </Text>
                </View>

                {/* Date Badge */}
                <View style={styles.dateBadge}>
                  <Text style={styles.dateText}>
                    {new Date(ticket.visitDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

export default PassportSection;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  currentLocationCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  locationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  locationInfo: {
    marginLeft: 16,
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f39c12',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#eee',
    marginHorizontal: 16,
  },
  stampsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stampsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
  },
  stampsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  stampCard: {
    width: (width - 48) / 2,
    height: 200,
    margin: 6,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  stampImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  stampOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 12,
    justifyContent: 'space-between',
  },
  stampFlag: {
    fontSize: 32,
    textAlign: 'center',
  },
  stampInfo: {
    alignItems: 'center',
  },
  stampCountry: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  stampCity: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  dateBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'center',
  },
  dateText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
});

