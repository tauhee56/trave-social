import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const LOCATION_TASK_NAME = 'background-location-task';
const MAJOR_CITIES_THRESHOLD = 100000; // Population threshold for major cities

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  } as any),
});

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  timestamp: number;
}

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

// Store last known location to avoid duplicate notifications
let lastKnownCity: string | null = null;
let lastKnownCountry: string | null = null;

/**
 * Request location permissions
 */
export async function requestLocationPermissions(): Promise<boolean> {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (foregroundStatus !== 'granted') {
      console.log('❌ Foreground location permission denied');
      return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    
    if (backgroundStatus !== 'granted') {
      console.log('⚠️ Background location permission denied');
      return false;
    }

    console.log('✅ Location permissions granted');
    return true;
  } catch (error) {
    console.error('❌ Error requesting location permissions:', error);
    return false;
  }
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('❌ Notification permission denied');
      return false;
    }

    console.log('✅ Notification permissions granted');
    return true;
  } catch (error) {
    console.error('❌ Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Reverse geocode coordinates to get city and country
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<{ city: string; country: string; countryCode: string } | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    
    if (results && results.length > 0) {
      const location = results[0];
      const city = location.city || location.subregion || location.region || 'Unknown City';
      const country = location.country || 'Unknown Country';
      const countryCode = location.isoCountryCode || 'XX';
      
      return { city, country, countryCode };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error reverse geocoding:', error);
    return null;
  }
}

/**
 * Check if city is a major city (simplified - you can enhance this)
 */
function isMajorCity(city: string, country: string): boolean {
  // List of major cities (you can expand this)
  const majorCities = [
    'London', 'Paris', 'New York', 'Tokyo', 'Dubai', 'Singapore',
    'Hong Kong', 'Los Angeles', 'Chicago', 'San Francisco', 'Seattle',
    'Boston', 'Miami', 'Las Vegas', 'Sydney', 'Melbourne', 'Toronto',
    'Vancouver', 'Montreal', 'Berlin', 'Munich', 'Rome', 'Milan',
    'Barcelona', 'Madrid', 'Amsterdam', 'Brussels', 'Vienna', 'Prague',
    'Budapest', 'Warsaw', 'Moscow', 'Istanbul', 'Athens', 'Lisbon',
    'Copenhagen', 'Stockholm', 'Oslo', 'Helsinki', 'Dublin', 'Edinburgh',
    'Manchester', 'Birmingham', 'Glasgow', 'Liverpool', 'Leeds',
    'Shanghai', 'Beijing', 'Shenzhen', 'Guangzhou', 'Seoul', 'Bangkok',
    'Kuala Lumpur', 'Jakarta', 'Manila', 'Ho Chi Minh City', 'Hanoi',
    'Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad',
    'Karachi', 'Lahore', 'Islamabad', 'Dhaka', 'Cairo', 'Johannesburg',
    'Cape Town', 'Nairobi', 'Lagos', 'Casablanca', 'Marrakech',
    'São Paulo', 'Rio de Janeiro', 'Buenos Aires', 'Lima', 'Bogotá',
    'Santiago', 'Mexico City', 'Guadalajara', 'Monterrey'
  ];
  
  return majorCities.some(majorCity => 
    city.toLowerCase().includes(majorCity.toLowerCase()) ||
    majorCity.toLowerCase().includes(city.toLowerCase())
  );
}

/**
 * Send notification for new location
 */
async function sendLocationNotification(city: string, country: string, type: 'city' | 'country'): Promise<void> {
  try {
    const title = type === 'city'
      ? `🌆 New City Visited!`
      : `🌍 New Country Explored!`;

    const body = type === 'city'
      ? `Welcome to ${city}, ${country}! 🎉`
      : `Welcome to ${country}! Your adventure begins! 🗺️`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: 'passport',
          city,
          country,
          screen: 'passport'
        },
        sound: true,
      },
      trigger: null, // Send immediately
    });

    console.log(`✅ Notification sent: ${title} - ${body}`);
  } catch (error) {
    console.error('❌ Error sending notification:', error);
  }
}

/**
 * Create passport ticket for new location
 */
async function createPassportTicket(userId: string, city: string, country: string, countryCode: string, latitude: number, longitude: number): Promise<void> {
  try {
    const ticketId = `${countryCode}_${city.replace(/\s+/g, '_')}_${Date.now()}`;

    const ticket: PassportTicket = {
      id: ticketId,
      city,
      country,
      countryCode,
      latitude,
      longitude,
      visitDate: Date.now(),
      imageUrl: `https://source.unsplash.com/800x600/?${city},${country}`,
      notes: `Visited on ${new Date().toLocaleDateString()}`
    };

    // Save to Firestore
    await setDoc(doc(db, 'users', userId, 'passportTickets', ticketId), ticket);

    console.log(`✅ Passport ticket created: ${city}, ${country}`);
  } catch (error) {
    console.error('❌ Error creating passport ticket:', error);
  }
}

/**
 * Process location update
 */
async function processLocationUpdate(userId: string, latitude: number, longitude: number): Promise<void> {
  try {
    console.log(`📍 Processing location: ${latitude}, ${longitude}`);

    // Reverse geocode
    const locationInfo = await reverseGeocode(latitude, longitude);

    if (!locationInfo) {
      console.log('⚠️ Could not determine location');
      return;
    }

    const { city, country, countryCode } = locationInfo;
    console.log(`📍 Location: ${city}, ${country}`);

    // Check if it's a major city
    if (!isMajorCity(city, country)) {
      console.log(`⚠️ ${city} is not a major city, skipping notification`);
      return;
    }

    // Check if location changed
    const cityChanged = lastKnownCity !== city;
    const countryChanged = lastKnownCountry !== country;

    if (!cityChanged && !countryChanged) {
      console.log('ℹ️ Location unchanged, skipping notification');
      return;
    }

    // Update last known location
    lastKnownCity = city;
    lastKnownCountry = country;

    // Save to user's location history
    await updateDoc(doc(db, 'users', userId), {
      lastKnownLocation: {
        city,
        country,
        countryCode,
        latitude,
        longitude,
        timestamp: Date.now()
      }
    });

    // Send appropriate notification
    if (countryChanged) {
      await sendLocationNotification(city, country, 'country');
      await createPassportTicket(userId, city, country, countryCode, latitude, longitude);
    } else if (cityChanged) {
      await sendLocationNotification(city, country, 'city');
      await createPassportTicket(userId, city, country, countryCode, latitude, longitude);
    }

  } catch (error) {
    console.error('❌ Error processing location update:', error);
  }
}

/**
 * Start background location tracking
 */
export async function startLocationTracking(userId: string): Promise<boolean> {
  try {
    // Check permissions
    const hasLocationPermission = await requestLocationPermissions();
    const hasNotificationPermission = await requestNotificationPermissions();

    if (!hasLocationPermission || !hasNotificationPermission) {
      console.log('❌ Missing permissions for location tracking');
      return false;
    }

    // Define background task
    TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
      if (error) {
        console.error('❌ Background location error:', error);
        return;
      }

      if (data) {
        const { locations } = data;
        const location = locations[0];

        if (location) {
          await processLocationUpdate(
            userId,
            location.coords.latitude,
            location.coords.longitude
          );
        }
      }
    });

    // Start location updates
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 300000, // 5 minutes
      distanceInterval: 1000, // 1 km
      foregroundService: {
        notificationTitle: 'Travel Tracker',
        notificationBody: 'Tracking your adventures 🌍',
        notificationColor: '#f39c12',
      },
    });

    console.log('✅ Background location tracking started');
    return true;
  } catch (error) {
    console.error('❌ Error starting location tracking:', error);
    return false;
  }
}

/**
 * Stop background location tracking
 */
export async function stopLocationTracking(): Promise<void> {
  try {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);

    if (isTracking) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('✅ Background location tracking stopped');
    }
  } catch (error) {
    console.error('❌ Error stopping location tracking:', error);
  }
}

/**
 * Get current location
 */
export async function getCurrentLocation(): Promise<LocationData | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const locationInfo = await reverseGeocode(
      location.coords.latitude,
      location.coords.longitude
    );

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      city: locationInfo?.city,
      country: locationInfo?.country,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('❌ Error getting current location:', error);
    return null;
  }
}

