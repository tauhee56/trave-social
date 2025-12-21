/**
 * Agora Streaming Service Implementation
 * Implements IStreamingService using Agora RTC SDK
 */

import { IStreamingService } from '../interfaces/IStreamingService';
import { AGORA_CONFIG } from '../../config/agora';

export class AgoraStreamingService implements IStreamingService {
  private appId: string;
  private appCertificate: string;
  private tokenServerUrl: string;
  private isInit: boolean = false;
  private audioMuted: boolean = false;
  private videoEnabled: boolean = true;
  private currentChannel: string | null = null;

  // Event callbacks
  private userJoinedCallbacks: ((userId: string) => void)[] = [];
  private userLeftCallbacks: ((userId: string) => void)[] = [];
  private connectionStateCallbacks: ((state: string) => void)[] = [];
  private errorCallbacks: ((error: Error) => void)[] = [];

  constructor() {
    this.appId = AGORA_CONFIG.appId;
    this.appCertificate = AGORA_CONFIG.appCertificate || '';
    this.tokenServerUrl = AGORA_CONFIG.tokenServerUrl || '';
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Agora SDK
      // In production, this would initialize the actual SDK
      console.log('Agora SDK initialized');
      this.isInit = true;
    } catch (error) {
      console.error('Failed to initialize Agora:', error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    try {
      if (this.currentChannel) {
        await this.leaveChannel();
      }
      this.isInit = false;
      this.userJoinedCallbacks = [];
      this.userLeftCallbacks = [];
      this.connectionStateCallbacks = [];
      this.errorCallbacks = [];
      console.log('Agora SDK destroyed');
    } catch (error) {
      console.error('Failed to destroy Agora:', error);
      throw error;
    }
  }

  async createChannel(userId: string): Promise<string> {
    const timestamp = Date.now();
    const channelName = `live_${userId}_${timestamp}`;
    return channelName;
  }

  async joinChannel(channelName: string, userId: string, isHost: boolean): Promise<void> {
    try {
      if (!this.isInit) {
        await this.initialize();
      }

      // Get token if token server is configured
      let token: string | null = null;
      if (this.tokenServerUrl) {
        token = await this.getToken(channelName, userId, isHost);
      }

      // Join channel with Agora SDK
      // In production: await agoraEngine.joinChannel(token, channelName, userId, ...)
      
      this.currentChannel = channelName;
      console.log(`Joined channel: ${channelName}`);
    } catch (error) {
      console.error('Failed to join channel:', error);
      this.handleError(error as Error);
      throw error;
    }
  }

  async leaveChannel(): Promise<void> {
    try {
      if (!this.currentChannel) {
        return;
      }

      // Leave channel with Agora SDK
      // In production: await agoraEngine.leaveChannel()
      
      this.currentChannel = null;
      console.log('Left channel');
    } catch (error) {
      console.error('Failed to leave channel:', error);
      throw error;
    }
  }

  async getToken(channelName: string, userId: string, isHost: boolean = false): Promise<string> {
    try {
      if (!this.tokenServerUrl) {
        // Return empty string for development (null token)
        return '';
      }

      const role = isHost ? 'publisher' : 'subscriber';
      const response = await fetch(
        `${this.tokenServerUrl}?channelName=${channelName}&userId=${userId}&role=${role}`
      );

      if (!response.ok) {
        throw new Error('Failed to get token from server');
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Failed to get token:', error);
      // Return empty string for development
      return '';
    }
  }

  async muteAudio(): Promise<void> {
    try {
      // In production: await agoraEngine.muteLocalAudioStream(true)
      this.audioMuted = true;
      console.log('Audio muted');
    } catch (error) {
      console.error('Failed to mute audio:', error);
      throw error;
    }
  }

  async unmuteAudio(): Promise<void> {
    try {
      // In production: await agoraEngine.muteLocalAudioStream(false)
      this.audioMuted = false;
      console.log('Audio unmuted');
    } catch (error) {
      console.error('Failed to unmute audio:', error);
      throw error;
    }
  }

  isAudioMuted(): boolean {
    return this.audioMuted;
  }

  async enableVideo(): Promise<void> {
    try {
      // In production: await agoraEngine.enableLocalVideo(true)
      this.videoEnabled = true;
      console.log('Video enabled');
    } catch (error) {
      console.error('Failed to enable video:', error);
      throw error;
    }
  }

  async disableVideo(): Promise<void> {
    try {
      // In production: await agoraEngine.enableLocalVideo(false)
      this.videoEnabled = false;
      console.log('Video disabled');
    } catch (error) {
      console.error('Failed to disable video:', error);
      throw error;
    }
  }

  async switchCamera(): Promise<void> {
    try {
      // In production: await agoraEngine.switchCamera()
      console.log('Camera switched');
    } catch (error) {
      console.error('Failed to switch camera:', error);
      throw error;
    }
  }

  isVideoEnabled(): boolean {
    return this.videoEnabled;
  }

  async setVideoQuality(quality: 'low' | 'medium' | 'high'): Promise<void> {
    const qualityConfigs = {
      low: { width: 320, height: 240, frameRate: 15, bitrate: 200 },
      medium: { width: 640, height: 480, frameRate: 24, bitrate: 500 },
      high: { width: 1280, height: 720, frameRate: 30, bitrate: 1000 },
    };

    await this.setVideoConfig(qualityConfigs[quality]);
  }

  async setVideoConfig(config: {
    width: number;
    height: number;
    frameRate: number;
    bitrate: number;
  }): Promise<void> {
    try {
      // In production: await agoraEngine.setVideoEncoderConfiguration(config)
      console.log('Video config set:', config);
    } catch (error) {
      console.error('Failed to set video config:', error);
      throw error;
    }
  }

  onUserJoined(callback: (userId: string) => void): void {
    this.userJoinedCallbacks.push(callback);
  }

  onUserLeft(callback: (userId: string) => void): void {
    this.userLeftCallbacks.push(callback);
  }

  onConnectionStateChanged(callback: (state: string) => void): void {
    this.connectionStateCallbacks.push(callback);
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  getAppId(): string {
    return this.appId;
  }

  getProvider(): 'agora' | 'twilio' | 'aws-ivs' | 'custom' {
    return 'agora';
  }

  isInitialized(): boolean {
    return this.isInit;
  }

  // ==================== HELPER METHODS ====================

  private handleUserJoined(userId: string): void {
    this.userJoinedCallbacks.forEach((callback) => callback(userId));
  }

  private handleUserLeft(userId: string): void {
    this.userLeftCallbacks.forEach((callback) => callback(userId));
  }

  private handleConnectionStateChanged(state: string): void {
    this.connectionStateCallbacks.forEach((callback) => callback(state));
  }

  private handleError(error: Error): void {
    this.errorCallbacks.forEach((callback) => callback(error));
  }
}

// Export singleton instance
export const streamingService = new AgoraStreamingService();
