// Passport ticket helpers
import { API_BASE_URL } from '../api';

export async function getPassportTickets(userId: string) {
  try {
    console.log('📡 [Passport] Fetching passport for user:', userId);
    const url = `${API_BASE_URL}/users/${userId}/passport`;
    console.log('📡 [Passport] GET URL:', url);

    const res = await fetch(url);
    const data = await res.json();

    console.log('📡 [Passport] Response:', data);
    return data.data || { locations: [], ticketCount: 0 };
  } catch (error: any) {
    console.error('❌ [Passport] Error fetching passport:', error);
    return { locations: [], ticketCount: 0 };
  }
}

export async function addPassportTicket(userId: string, ticket: any) {
  try {
    console.log('📡 [Passport] Adding location for user:', userId);
    const url = `${API_BASE_URL}/users/${userId}/passport/locations`;
    console.log('📡 [Passport] POST URL:', url);

    // Backend expects: city, country, lat, lon
    const locationData = {
      city: ticket.city,
      country: ticket.country,
      lat: ticket.latitude || 0,
      lon: ticket.longitude || 0
    };
    console.log('📡 [Passport] Location data:', locationData);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(locationData)
    });

    console.log('📡 [Passport] Response status:', res.status);
    const data = await res.json();
    console.log('📡 [Passport] Response data:', data);

    return data;
  } catch (error: any) {
    console.error('❌ [Passport] Error adding location:', error);
    return { success: false, error: error.message || 'Network request failed' };
  }
}

export async function updatePassportTicket(userId: string, ticketId: string, updates: any) {
  try {
    console.log('📡 [Passport] Update not implemented - using delete/add instead');
    return { success: false, error: 'Update not supported' };
  } catch (error: any) {
    console.error('❌ [Passport] Error updating ticket:', error);
    return { success: false, error: error.message || 'Network request failed' };
  }
}

export async function deletePassportTicket(userId: string, city: string, country: string) {
  try {
    console.log('📡 [Passport] Deleting location:', city, country);
    const url = `${API_BASE_URL}/users/${userId}/passport/locations`;
    console.log('📡 [Passport] DELETE URL:', url);

    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city, country })
    });

    const data = await res.json();
    console.log('📡 [Passport] Delete response:', data);

    return data;
  } catch (error: any) {
    console.error('❌ [Passport] Error deleting location:', error);
    return { success: false, error: error.message || 'Network request failed' };
  }
}
