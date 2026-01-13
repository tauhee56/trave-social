import io from 'socket.io-client';

// Use LAN IP for mobile device access
const SOCKET_URL = 'http://192.168.1.10:5000'; // <-- Replace with your computer's LAN IP
const socket = io(SOCKET_URL);

export function subscribeToMessages(onMessage: (msg: any) => void) {
  socket.on('newMessage', onMessage);
  return () => socket.off('newMessage', onMessage);
}

export function sendMessage(message: any) {
  socket.emit('sendMessage', message);
}

export function subscribeToLiveStream(streamId: string, onUserJoined: (data: any) => void, onUserLeft: (data: any) => void, onLiveComment: (comment: any) => void) {
  socket.emit('joinLiveStream', streamId);
  socket.on('userJoined', onUserJoined);
  socket.on('userLeft', onUserLeft);
  socket.on('newLiveComment', onLiveComment);
  return () => {
    socket.off('userJoined', onUserJoined);
    socket.off('userLeft', onUserLeft);
    socket.off('newLiveComment', onLiveComment);
  };
}
