import { AgoraStreamingService } from '../../services/implementations/AgoraStreamingService';

// Helper to call private handlers (TS private is compile-time)
const callPrivate = (service: any, method: string, ...args: any[]) => {
  if (typeof service[method] !== 'function') {
    throw new Error(`Method ${method} not found`);
  }
  return service[method](...args);
};

describe('AgoraStreamingService', () => {
  let service: AgoraStreamingService;

  beforeEach(() => {
    service = new AgoraStreamingService();
  });

  afterEach(async () => {
    // Ensure proper cleanup between tests
    await service.destroy().catch(() => {});
  });

  it('initializes and destroys correctly', async () => {
    expect(service.isInitialized()).toBe(false);
    await service.initialize();
    expect(service.isInitialized()).toBe(true);
    await service.destroy();
    expect(service.isInitialized()).toBe(false);
  });

  it('creates channel with predictable format', async () => {
    const userId = 'user123';
    const channel = await service.createChannel(userId);
    expect(channel.startsWith(`live_${userId}_`)).toBe(true);
  });

  it('joins channel and leaves without error', async () => {
    const channel = await service.createChannel('userA');
    await expect(service.joinChannel(channel, 'userA', true)).resolves.toBeUndefined();
    expect(service.isInitialized()).toBe(true);
    await expect(service.leaveChannel()).resolves.toBeUndefined();
    // leaving again should be a no-op
    await expect(service.leaveChannel()).resolves.toBeUndefined();
  });

  it('mute/unmute audio toggles state', async () => {
    expect(service.isAudioMuted()).toBe(false);
    await service.muteAudio();
    expect(service.isAudioMuted()).toBe(true);
    await service.unmuteAudio();
    expect(service.isAudioMuted()).toBe(false);
  });

  it('enable/disable video toggles state', async () => {
    expect(service.isVideoEnabled()).toBe(true);
    await service.disableVideo();
    expect(service.isVideoEnabled()).toBe(false);
    await service.enableVideo();
    expect(service.isVideoEnabled()).toBe(true);
  });

  it('setVideoQuality maps to expected configs', async () => {
    const spy = jest.spyOn(service as any, 'setVideoConfig');

    await service.setVideoQuality('low');
    expect(spy).toHaveBeenCalledWith({ width: 320, height: 240, frameRate: 15, bitrate: 200 });

    await service.setVideoQuality('medium');
    expect(spy).toHaveBeenCalledWith({ width: 640, height: 480, frameRate: 24, bitrate: 500 });

    await service.setVideoQuality('high');
    expect(spy).toHaveBeenCalledWith({ width: 1280, height: 720, frameRate: 30, bitrate: 1000 });
  });

  it('token returns empty string when token server is not configured', async () => {
    const token = await service.getToken('ch1', 'user1', true);
    expect(token).toBe('');
  });

  it('provider and appId are correct', () => {
    expect(service.getProvider()).toBe('agora');
    expect(typeof service.getAppId()).toBe('string');
    expect(service.getAppId().length).toBeGreaterThan(0);
  });

  it('invokes event callbacks via internal handlers', () => {
    const joined = jest.fn();
    const left = jest.fn();
    const conn = jest.fn();
    const err = jest.fn();

    service.onUserJoined(joined);
    service.onUserLeft(left);
    service.onConnectionStateChanged(conn);
    service.onError(err);

    // Call internal handlers to simulate SDK events
    callPrivate(service, 'handleUserJoined', 'remoteUser');
    callPrivate(service, 'handleUserLeft', 'remoteUser');
    callPrivate(service, 'handleConnectionStateChanged', 'CONNECTED');
    callPrivate(service, 'handleError', new Error('test'));

    expect(joined).toHaveBeenCalledWith('remoteUser');
    expect(left).toHaveBeenCalledWith('remoteUser');
    expect(conn).toHaveBeenCalledWith('CONNECTED');
    expect(err).toHaveBeenCalled();
  });
});
