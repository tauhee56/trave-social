import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from './_components/UserContext';
// import { getCurrentUser } from '../lib/firebaseHelpers';
import { addPassportTicket, getPassportTickets } from '../lib/firebaseHelpers/passport';
import { getCurrentLocation } from '../services/locationService';

const { width } = Dimensions.get('window');
const STAMP_SIZE = (width - 48) / 3;

interface PassportStamp {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  visitDate: number;
  stampType?: string;
}

export default function PassportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentUser = useUser();
  const userId = (params.user as string) || currentUser?.uid;
  // Treat as owner only when both IDs exist and match
  const isOwner = !!(currentUser?.uid && userId && currentUser.uid === userId);

  const [stamps, setStamps] = useState<PassportStamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{
    city?: string;
    country?: string;
    countryCode?: string;
    latitude?: number;
    longitude?: number;
  } | null>(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [selectedStamp, setSelectedStamp] = useState<PassportStamp | null>(null);
  const [selectedStampIndex, setSelectedStampIndex] = useState<number>(-1);
  const [detectingLocation, setDetectingLocation] = useState(false);

  useEffect(() => {
    loadPassportData();
  }, [userId]);

  const loadPassportData = async () => {
    try {
      setLoading(true);

      // Load passport stamps
      if (userId) {
        console.log('📡 [Passport] Loading data for userId:', userId);
        const result = await getPassportTickets(userId);
        console.log('📡 [Passport] Result:', result);

        // Backend returns { locations: [], ticketCount: 0 }
        if (result && result.locations) {
          // Convert locations to stamps format
          const stamps = result.locations.map((loc: any, index: number) => ({
            id: `${loc.city}-${loc.country}-${index}`,
            city: loc.city,
            country: loc.country,
            visitDate: loc.visitedAt ? new Date(loc.visitedAt).getTime() : Date.now(),
            imageUrl: `https://source.unsplash.com/800x600/?${loc.city},${loc.country}`,
            notes: `Visited on ${new Date(loc.visitedAt || Date.now()).toLocaleDateString()}`
          }));
          setStamps(stamps);
        } else if (Array.isArray(result)) {
          setStamps(result as PassportStamp[]);
        } else {
          setStamps([]);
        }
      } else {
        console.log('⚠️ [Passport] No userId available');
        setStamps([]);
      }

      // Get current location if owner
      if (isOwner) {
        // Set default location first
        setCurrentLocation({
          city: 'Detecting',
          country: 'Please wait...',
          countryCode: '',
        });

        setDetectingLocation(true);

        try {
          console.log('📍 [Passport] Attempting to get current location...');
          const location = await getCurrentLocation();
          console.log('📍 [Passport] Location result:', JSON.stringify(location));

          if (location && location.city && location.country) {
            setCurrentLocation({
              city: location.city,
              country: location.country,
              countryCode: location.countryCode || '',
              latitude: location.latitude,
              longitude: location.longitude,
            });
            console.log('✅ [Passport] Location set:', location.city, location.country);
          } else {
            // Location returned but no city data
            console.log('⚠️ [Passport] Location returned but no city data:', location);
            setCurrentLocation({
              city: 'Unknown Location',
              country: 'Could not detect',
              countryCode: '',
            });
          }
        } catch (error: any) {
          console.log('❌ [Passport] Location error:', error?.message || error);
          console.log('❌ [Passport] Full error:', JSON.stringify(error));
          // Fallback when location fails - show helpful message
          setCurrentLocation({
            city: 'Location Error',
            country: 'Tap button to retry',
            countryCode: '',
          });
        } finally {
          setDetectingLocation(false);
        }
      }
    } catch (error) {
      console.error('❌ Error loading passport data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPassport = async (skipConfirmation: boolean = false) => {
    try {
      setDetectingLocation(true);

      console.log('🔍 [Add] Getting fresh GPS location...');
      let locationToAdd;

      try {
        const freshLocation = await getCurrentLocation();
        console.log('📍 [Add] Fresh location result:', JSON.stringify(freshLocation));

        if (!freshLocation || !freshLocation.city) {
          throw new Error('Could not determine your location');
        }

        locationToAdd = {
          city: freshLocation.city,
          country: freshLocation.country || 'Unknown',
          countryCode: freshLocation.countryCode || '',
          latitude: freshLocation.latitude,
          longitude: freshLocation.longitude,
        };

        // Update current location state
        setCurrentLocation(locationToAdd);
        console.log('✅ [Add] Fresh location detected:', locationToAdd.city, locationToAdd.country);

      } catch (error: any) {
        console.log('❌ [Add] Could not get fresh location:', error?.message || error);
        console.log('❌ [Add] Full error:', JSON.stringify(error));
        setDetectingLocation(false);

        // Show user-friendly error message with retry
        Alert.alert(
          'Location Error',
          error.message || 'Could not detect your location. Please make sure:\n\n• Location services are enabled\n• GPS signal is available\n• App has location permission',
          [
            { text: 'Try Again', onPress: () => handleAddToPassport() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }

      setDetectingLocation(false);

      // Check if stamp already exists
      const existingStamp = stamps.find(
        s => s.city?.toLowerCase() === locationToAdd.city?.toLowerCase() &&
             s.country?.toLowerCase() === locationToAdd.country?.toLowerCase()
      );

      if (existingStamp && !skipConfirmation) {
        Alert.alert(
          'Already Added',
          `You already have a stamp for ${locationToAdd.city}, ${locationToAdd.country}!`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Add the ticket with location coordinates
      const ticket = {
        city: locationToAdd.city,
        country: locationToAdd.country,
        countryCode: locationToAdd.countryCode || '',
        latitude: locationToAdd.latitude || 0,
        longitude: locationToAdd.longitude || 0,
        visitDate: Date.now(),
        imageUrl: `https://source.unsplash.com/800x600/?${locationToAdd.city},${locationToAdd.country}`,
        notes: `Visited on ${new Date().toLocaleDateString()}`
      };

      console.log('📝 Adding passport ticket:', ticket);
      const result = await addPassportTicket(userId, ticket);
      console.log('📝 Add ticket result:', result);

      if (result.success) {
        console.log('✅ Passport stamp added successfully!');
        Alert.alert(
          '✅ Added to Passport!',
          `${locationToAdd.city}, ${locationToAdd.country} has been added to your passport!`,
          [{ text: 'Awesome!' }]
        );
        // Reload stamps
        await loadPassportData();
      } else {
        console.error('❌ Failed to add stamp:', result.error);
        Alert.alert(
          'Failed to Add',
          result.error || 'Could not add passport stamp. Please check your internet connection and try again.',
          [
            { text: 'Try Again', onPress: () => handleAddToPassport() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ Error adding passport stamp:', error);
      setDetectingLocation(false);
      Alert.alert(
        'Network Error',
        'Could not connect to server. Please check your internet connection and try again.',
        [
          { text: 'Try Again', onPress: () => handleAddToPassport() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const handleStampPress = (stamp: PassportStamp, index: number) => {
    if (selectedStamp?.id === stamp.id && showEditPopup) {
      // Toggle off if same stamp pressed
      setShowEditPopup(false);
      setSelectedStamp(null);
      setSelectedStampIndex(-1);
    } else {
      setSelectedStamp(stamp);
      setSelectedStampIndex(index);
      setShowEditPopup(true);
    }
  };

  const handleEditStamp = () => {
    // TODO: Edit stamp
    setShowEditPopup(false);
    setSelectedStamp(null);
  };

  const handleRemoveStamp = () => {
    // TODO: Remove stamp from database
    setShowEditPopup(false);
    setSelectedStamp(null);
    setSelectedStampIndex(-1);
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).toUpperCase();
  };

  // Empty state - no stamps yet
  if (!loading && stamps.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/profile' as any);
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Passport</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Empty State Content */}
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>
            We detect that your are currently in:
          </Text>

          {detectingLocation ? (
            <View style={styles.locationCard}>
              <ActivityIndicator size="small" color="#666" />
              <Text style={styles.locationText}>Detecting location...</Text>
            </View>
          ) : (
            <View style={styles.locationCard}>
              <View style={styles.locationIcon}>
                <Ionicons name="locate-outline" size={24} color="#666" />
              </View>
              <Text style={styles.locationText}>
                {currentLocation?.city || 'Unknown'}, {currentLocation?.country || 'Unknown'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddToPassport}
            activeOpacity={0.8}
            disabled={detectingLocation}
          >
            {detectingLocation ? (
              <>
                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.addButtonText}>Detecting location...</Text>
              </>
            ) : (
              <Text style={styles.addButtonText}>✨ Add to my passport</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom Tab Bar Spacer */}
        <View style={{ height: 80 }} />
      </SafeAreaView>
    );
  }

  // Main state - has stamps
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/profile' as any);
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Passport</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F5A623" />
          <Text style={styles.loadingText}>Loading your passport...</Text>
        </View>
      ) : (
        <>
          {/* Stamps Grid */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.stampsGrid}>
              {stamps.map((stamp, index) => (
                <View key={stamp.id} style={styles.stampWrapper}>
                  <TouchableOpacity
                    style={styles.stampContainer}
                    onPress={() => handleStampPress(stamp, index)}
                    activeOpacity={0.7}
                  >
                    <VintageStamp
                      country={stamp.country}
                      city={stamp.city}
                      date={formatDate(stamp.visitDate)}
                      index={index}
                    />
                  </TouchableOpacity>
                  {/* Floating Edit Popup */}
                  {showEditPopup && selectedStampIndex === index && (
                    <View style={styles.floatingPopup}>
                      <TouchableOpacity
                        style={styles.popupEditButton}
                        onPress={handleEditStamp}
                      >
                        <Text style={styles.popupEditText}>Edit</Text>
                        <Ionicons name="pencil" size={14} color="#F5A623" />
                      </TouchableOpacity>
                      <View style={styles.popupDivider} />
                      <TouchableOpacity
                        style={styles.popupRemoveButton}
                        onPress={handleRemoveStamp}
                      >
                        <Text style={styles.popupRemoveText}>Remove</Text>
                        <Ionicons name="close" size={14} color="#E74C3C" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Bottom Add Button */}
          {isOwner && (
            <View style={styles.bottomButtonContainer}>
              <TouchableOpacity
                style={styles.bottomAddButton}
                onPress={handleAddToPassport}
                activeOpacity={0.8}
                disabled={detectingLocation}
              >
                {detectingLocation ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.bottomAddButtonText}>Detecting location...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.bottomAddButtonText}>Add current location</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </>
      )}


    </SafeAreaView>
  );
}

// Vintage Stamp Component with different designs
interface VintageStampProps {
  country: string;
  city: string;
  date: string;
  index: number;
}

const VintageStamp: React.FC<VintageStampProps> = ({ country = '', city = '', date = '', index }) => {
  const stampType = index % 8;
  
  // Safe country and city values
  const safeCountry = country || 'Unknown';
  const safeCity = city || 'Unknown';
  const safeDate = date || '';

  const getStampStyle = () => {
    switch (stampType) {
      case 0:
        return styles.circleStamp;
      case 1:
        return styles.rectangleStamp;
      case 2:
        return styles.triangleStamp;
      case 3:
        return styles.ovalStamp;
      case 4:
        return styles.squareStamp;
      case 5:
        return styles.diamondStamp;
      case 6:
        return styles.hexStamp;
      case 7:
        return styles.badgeStamp;
      default:
        return styles.circleStamp;
    }
  };

  const getBorderStyle = () => {
    const colors = ['#1a1a1a', '#2c3e50', '#34495e', '#4a4a4a'];
    return {
      borderColor: colors[index % colors.length],
    };
  };

  // Get country short code
  const getCountryCode = (countryName: string): string => {
    if (!countryName) return 'N/A';
    const codes: { [key: string]: string } = {
      'usa': 'USA', 'united states': 'USA',
      'canada': 'CAN', 'uk': 'UK', 'united kingdom': 'UK',
      'japan': 'JPN', 'spain': 'ESP', 'germany': 'DEU',
      'france': 'FRA', 'italy': 'ITA', 'australia': 'AUS',
      'brazil': 'BRA', 'india': 'IND', 'china': 'CHN',
      'singapore': 'SGP', 'netherlands': 'NLD', 'portugal': 'PRT',
      'hong kong': 'HKG', 'mexico': 'MEX', 'thailand': 'THA',
    };
    return codes[countryName.toLowerCase()] || countryName.substring(0, 3).toUpperCase();
  };

  return (
    <View style={[styles.vintageStamp, getStampStyle(), getBorderStyle()]}>
      {stampType === 2 ? (
        // Triangle special layout
        <>
          <Text style={styles.stampCountrySmall}>{getCountryCode(safeCountry)}</Text>
          <Text style={styles.stampDateSmall}>{safeDate}</Text>
        </>
      ) : (
        <>
          <Text style={styles.stampArrival}>
            {stampType % 2 === 0 ? 'ARRIVAL' : 'DEPARTURE'}
          </Text>
          <Text style={styles.stampCountryName} numberOfLines={1}>
            {safeCountry.toUpperCase()}
          </Text>
          <Text style={styles.stampCityName} numberOfLines={1}>
            {safeCity}
          </Text>
          <View style={styles.stampDateBox}>
            <Text style={styles.stampDateText}>{safeDate}</Text>
          </View>
          {stampType === 4 && (
            <Text style={styles.stampAirport}>✈ AIRPORT</Text>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },

  // Empty State
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#F5A623',
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5A623',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  manualEntryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  manualEntryText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },

  // Stamps Grid
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  stampsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  stampContainer: {
    width: STAMP_SIZE,
    height: STAMP_SIZE + 10,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Vintage Stamp Styles
  vintageStamp: {
    width: STAMP_SIZE - 8,
    height: STAMP_SIZE - 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderWidth: 2,
  },
  circleStamp: {
    borderRadius: (STAMP_SIZE - 8) / 2,
    borderStyle: 'solid',
  },
  rectangleStamp: {
    borderRadius: 4,
    borderStyle: 'solid',
  },
  triangleStamp: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: (STAMP_SIZE - 16) / 2,
    borderRightWidth: (STAMP_SIZE - 16) / 2,
    borderBottomWidth: STAMP_SIZE - 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#1a1a1a',
    borderWidth: 0,
  },
  ovalStamp: {
    borderRadius: (STAMP_SIZE - 8) / 3,
    width: STAMP_SIZE - 16,
    height: STAMP_SIZE,
    borderStyle: 'solid',
  },
  squareStamp: {
    borderRadius: 8,
    borderStyle: 'solid',
  },
  diamondStamp: {
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
    borderStyle: 'solid',
  },
  hexStamp: {
    borderRadius: 12,
    borderStyle: 'solid',
  },
  badgeStamp: {
    borderRadius: (STAMP_SIZE - 8) / 4,
    borderStyle: 'dashed',
  },
  stampArrival: {
    fontSize: 6,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 1,
    marginBottom: 1,
  },
  stampCountryName: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  stampCityName: {
    fontSize: 7,
    fontWeight: '500',
    color: '#4a4a4a',
    textAlign: 'center',
    marginTop: 1,
  },
  stampDateBox: {
    marginTop: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 2,
  },
  stampDateText: {
    fontSize: 6,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  stampAirport: {
    fontSize: 5,
    fontWeight: '600',
    color: '#666',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  stampCountrySmall: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 20,
  },
  stampDateSmall: {
    fontSize: 5,
    fontWeight: '600',
    color: '#FFF',
  },

  // Stamp Wrapper for popup positioning
  stampWrapper: {
    width: STAMP_SIZE,
    marginBottom: 12,
    position: 'relative',
  },

  // Floating Edit/Remove Popup
  floatingPopup: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -55 }, { translateY: -20 }],
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
    zIndex: 100,
  },
  popupEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  popupEditText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#F5A623',
    marginRight: 4,
  },
  popupDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  popupRemoveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  popupRemoveText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#E74C3C',
    marginRight: 4,
  },

  // Bottom Button - 3D Style
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  bottomAddButton: {
    backgroundColor: '#F5A623',
    borderRadius: 25,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E09000',
    borderBottomWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
    marginBottom: 10,
  },
  bottomAddButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  bottomManualButton: {
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  bottomManualButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667eea',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    width: width - 48,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  modalLocationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 12,
  },
  modalAddButton: {
    backgroundColor: '#F5A623',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  modalCancelButton: {
    paddingVertical: 12,
  },
  modalCancelButtonText: {
    fontSize: 14,
    color: '#666',
  },
  
  // Manual Entry Styles
  modalDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginHorizontal: 12,
  },
  manualEntryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  manualInputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  inputWrapper: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#F9F9F9',
    color: '#333',
  },
});

