import { EventEmitter } from 'events';

// Event types
export type FeedEventType = 
  | 'POST_DELETED'
  | 'POST_CREATED'
  | 'POST_UPDATED'
  | 'USER_PRIVACY_CHANGED'
  | 'USER_BLOCKED'
  | 'USER_UNBLOCKED';

export interface FeedEvent {
  type: FeedEventType;
  postId?: string;
  userId?: string;
  data?: any;
}

class FeedEventEmitter extends EventEmitter {
  private static instance: FeedEventEmitter;

  private constructor() {
    super();
    this.setMaxListeners(50); // Increase max listeners to avoid warnings
  }

  static getInstance(): FeedEventEmitter {
    if (!FeedEventEmitter.instance) {
      FeedEventEmitter.instance = new FeedEventEmitter();
    }
    return FeedEventEmitter.instance;
  }

  // Emit feed update event
  emitFeedUpdate(event: FeedEvent) {
    console.log('📢 Feed event emitted:', event.type, event);
    this.emit('feedUpdate', event);
  }

  // Subscribe to feed updates
  onFeedUpdate(callback: (event: FeedEvent) => void) {
    this.on('feedUpdate', callback);
    return () => this.off('feedUpdate', callback);
  }

  // Specific event emitters
  emitPostDeleted(postId: string) {
    this.emitFeedUpdate({ type: 'POST_DELETED', postId });
  }

  emitPostCreated(postId: string, data?: any) {
    this.emitFeedUpdate({ type: 'POST_CREATED', postId, data });
  }

  emitPostUpdated(postId: string, data?: any) {
    this.emitFeedUpdate({ type: 'POST_UPDATED', postId, data });
  }

  emitUserPrivacyChanged(userId: string, isPrivate: boolean) {
    this.emitFeedUpdate({ type: 'USER_PRIVACY_CHANGED', userId, data: { isPrivate } });
  }

  emitUserBlocked(userId: string) {
    this.emitFeedUpdate({ type: 'USER_BLOCKED', userId });
  }

  emitUserUnblocked(userId: string) {
    this.emitFeedUpdate({ type: 'USER_UNBLOCKED', userId });
  }
}

export const feedEventEmitter = FeedEventEmitter.getInstance();

