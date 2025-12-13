/**
 * Agora Live Stream Implementation with Dual Camera Support
 * To switch to another provider (Twilio, AWS IVS), create a new implementation
 */

import {
    ChannelProfileType,
    ClientRoleType,
    createAgoraRtcEngine,
    IRtcEngine,
    RtcConnection,
    UserOfflineReasonType
} from 'react-native-agora';
import {
    ConnectionState,
    ILiveStreamService,
    StreamError,
    StreamSession,
    VideoQuality,
    Viewer
} from '../interfaces/ILiveStreamService';

export class AgoraLiveStreamService implements ILiveStreamService {
  private engine: typeof IRtcEngine | null = null;
  private appId: string = '';
  private currentChannel: string = '';
  private currentUid: number = 0;
  private isDualCameraEnabled: boolean = false;
  private isPrimaryFront: boolean = true;
  
  private viewerJoinedCallback?: (viewer: Viewer) => void;
  private viewerLeftCallback?: (viewerId: string) => void;
  private connectionStateCallback?: (state: ConnectionState) => void;
  private errorCallback?: (error: StreamError) => void;

  async initialize(appId: string): Promise<void> {
    this.appId = appId;
    this.engine = createAgoraRtcEngine();
    
    await this.engine.initialize({
      appId: this.appId,
      channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
    });

    // Enable video
    await this.engine.enableVideo();
    await this.engine.startPreview();

    // Setup event handlers
    this.setupEventHandlers();
  }

  async createStream(channelName: string, userId: string): Promise<StreamSession> {
    if (!this.engine) throw new Error('Engine not initialized');

    this.currentChannel = channelName;
    this.currentUid = parseInt(userId) || Math.floor(Math.random() * 100000);

    // Set broadcaster role
    await this.engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

    // Generate token (in production, get from your backend)
    const token = await this.generateToken(channelName, this.currentUid);

    // Join channel
    await this.engine.joinChannel(token, channelName, this.currentUid, {
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    });

    return {
      channelName,
      token,
      uid: this.currentUid,
    };
  }

  async joinStream(channelName: string, userId: string): Promise<StreamSession> {
    if (!this.engine) throw new Error('Engine not initialized');

    this.currentChannel = channelName;
    this.currentUid = parseInt(userId) || Math.floor(Math.random() * 100000);

    // Set audience role
    await this.engine.setClientRole(ClientRoleType.ClientRoleAudience);

    // Generate token
    const token = await this.generateToken(channelName, this.currentUid);

    // Join channel
    await this.engine.joinChannel(token, channelName, this.currentUid, {
      clientRoleType: ClientRoleType.ClientRoleAudience,
    });

    return {
      channelName,
      token,
      uid: this.currentUid,
    };
  }

  async leaveStream(): Promise<void> {
    if (!this.engine) return;
    await this.engine.leaveChannel();
    this.currentChannel = '';
    this.currentUid = 0;
  }

  async switchCamera(): Promise<void> {
    if (!this.engine) return;
    await this.engine.switchCamera();
    this.isPrimaryFront = !this.isPrimaryFront;
  }

  async enableCamera(enabled: boolean): Promise<void> {
    if (!this.engine) return;
    await this.engine.enableLocalVideo(enabled);
  }

  async enableMicrophone(enabled: boolean): Promise<void> {
    if (!this.engine) return;
    await this.engine.enableLocalAudio(enabled);
  }

  async enableDualCamera(enabled: boolean): Promise<void> {
    if (!this.engine) return;
    
    this.isDualCameraEnabled = enabled;
    
    if (enabled) {
      // Enable dual camera mode (requires Agora 4.x+)
      // This will be implemented in the UI layer with two camera views
      console.log('Dual camera enabled - implement in UI with two RtcSurfaceView components');
    } else {
      console.log('Dual camera disabled');
    }
  }

  async switchPrimaryCamera(): Promise<void> {
    await this.switchCamera();
  }

  async setVideoQuality(quality: VideoQuality): Promise<void> {
    // Implementation will be added
    console.log('Video quality set to:', quality);
  }

  async getViewers(): Promise<Viewer[]> {
    // In production, fetch from your backend
    return [];
  }

  onViewerJoined(callback: (viewer: Viewer) => void): void {
    this.viewerJoinedCallback = callback;
  }

  onViewerLeft(callback: (viewerId: string) => void): void {
    this.viewerLeftCallback = callback;
  }

  onConnectionStateChanged(callback: (state: ConnectionState) => void): void {
    this.connectionStateCallback = callback;
  }

  onError(callback: (error: StreamError) => void): void {
    this.errorCallback = callback;
  }

  async destroy(): Promise<void> {
    if (!this.engine) return;
    await this.engine.leaveChannel();
    this.engine.release();
    this.engine = null;
  }

  private setupEventHandlers(): void {
    if (!this.engine) return;

    this.engine.registerEventHandler({
      onUserJoined: (connection: typeof RtcConnection, remoteUid: number, elapsed: number) => {
        if (this.viewerJoinedCallback) {
          this.viewerJoinedCallback({
            uid: remoteUid.toString(),
            name: `User ${remoteUid}`,
            joinedAt: new Date(),
          });
        }
      },
      onUserOffline: (connection: typeof RtcConnection, remoteUid: number, reason: typeof UserOfflineReasonType) => {
        if (this.viewerLeftCallback) {
          this.viewerLeftCallback(remoteUid.toString());
        }
      },
      onError: (err: number, msg: string) => {
        if (this.errorCallback) {
          this.errorCallback({
            code: err.toString(),
            message: msg,
          });
        }
      },
    });
  }

  private async generateToken(channelName: string, uid: number): Promise<string> {
    // In production, call your backend to generate token
    // For now, return empty string (works in testing mode)
    return '';
  }

  getEngine(): typeof IRtcEngine | null {
    return this.engine;
  }

  isDualCameraActive(): boolean {
    return this.isDualCameraEnabled;
  }

  isPrimaryCameraFront(): boolean {
    return this.isPrimaryFront;
  }
}


