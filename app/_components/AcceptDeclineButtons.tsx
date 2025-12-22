import React, { useState } from 'react';
import { Text, TouchableOpacity, Alert } from 'react-native';

interface AcceptDeclineButtonsProps {
  item: any;
  onActionTaken?: (id: string) => void;
}

const AcceptDeclineButtons: React.FC<AcceptDeclineButtonsProps> = ({ item, onActionTaken }) => {
  const [actionTaken, setActionTaken] = useState(false);

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
          try {
            // TODO: Implement backend API to accept follow request
            // const response = await fetch(`/api/users/followRequests/${item.senderId}/accept`, {
            //   method: 'POST'
            // });
            
            Alert.alert('Success', 'Follow request accepted');
            if (onActionTaken) onActionTaken(item.id);
          } catch (err) {
            console.error('Error accepting request:', err);
            Alert.alert('Error', 'Failed to accept request');
          }
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Accept</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: '#FF3B30',
          paddingVertical: 6,
          paddingHorizontal: 18,
          borderRadius: 8,
          opacity: actionTaken ? 0.5 : 1,
        }}
        disabled={actionTaken}
        onPress={async () => {
          setActionTaken(true);
          try {
            // TODO: Implement backend API to reject follow request
            // const response = await fetch(`/api/users/followRequests/${item.senderId}/reject`, {
            //   method: 'POST'
            // });
            
            Alert.alert('Success', 'Follow request rejected');
            if (onActionTaken) onActionTaken(item.id);
          } catch (err) {
            console.error('Error rejecting request:', err);
            Alert.alert('Error', 'Failed to reject request');
          }
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Decline</Text>
      </TouchableOpacity>
    </>
  );
};

export default AcceptDeclineButtons;
            });

            alert('Request declined');
            if (onActionTaken) onActionTaken(item.id);
          } catch (err) {
            console.error('Error declining request:', err);
            alert('Error declining request');
          }
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Decline</Text>
      </TouchableOpacity>
    </>
  );
};

export default AcceptDeclineButtons;
