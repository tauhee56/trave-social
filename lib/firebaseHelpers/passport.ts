// Passport ticket helpers

export async function getPassportTickets(userId: string) {
  try {
    const res = await fetch(`/api/users/${userId}/passport-tickets`);
    const data = await res.json();
    return data.data || {};
  } catch (error: any) {
    return [];
  }
}

export async function addPassportTicket(userId: string, ticket: any) {
  try {
    const res = await fetch(`/api/users/${userId}/passport-tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket)
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePassportTicket(userId: string, ticketId: string, updates: any) {
  try {
    const res = await fetch(`/api/users/${userId}/passport-tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePassportTicket(userId: string, ticketId: string) {
  try {
    const res = await fetch(`/api/users/${userId}/passport-tickets/${ticketId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
