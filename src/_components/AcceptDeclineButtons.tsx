import React, { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';

interface AcceptDeclineButtonsProps {
  item: any;
  onActionTaken?: (id: string) => void;
}

const AcceptDeclineButtons: React.FC<AcceptDeclineButtonsProps> = ({ item, onActionTaken }) => {
  const [actionTaken, setActionTaken] = useState(false);
  // Helper to mark notification as read
  const markNotificationRead = async () => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      // ...existing code...
    } catch {}
  };

  return (
    <>
      <TouchableOpacity
        style={{
          backgroundColor: '#007aff',
          paddingVertical: 6,
          paddingHorizontal: 18,
          borderRadius: 8,
          marginRight: 8,
          opacity: actionTaken ? 0.5 : 1,
        }}
        disabled={actionTaken}
        onPress={async () => {
          setActionTaken(true);
          // ...existing code...
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Accept</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{
          backgroundColor: '#ff3b30',
          paddingVertical: 6,
          paddingHorizontal: 18,
          borderRadius: 8,
          opacity: actionTaken ? 0.5 : 1,
        }}
        disabled={actionTaken}
        onPress={async () => {
          setActionTaken(true);
          // ...existing code...
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Decline</Text>
      </TouchableOpacity>
    </>
  );
};

export default AcceptDeclineButtons;
