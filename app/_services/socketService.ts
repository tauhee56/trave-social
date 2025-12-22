// frontend/socketService.ts
import io from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000'; // Update for production
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
    socket.emit('leaveLiveStream', streamId);
    socket.off('userJoined', onUserJoined);
    socket.off('userLeft', onUserLeft);
    socket.off('newLiveComment', onLiveComment);
  };
}

export function sendLiveComment(streamId: string, comment: any) {
  socket.emit('sendLiveComment', { streamId, comment });
}
