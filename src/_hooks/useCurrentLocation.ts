import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

function useCurrentLocation() {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      // ...existing code...
    })();
  }, []);

  return { location, errorMsg };
}

export default useCurrentLocation;
