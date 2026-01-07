import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, memo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getActiveLiveStreams } from '../../lib/firebaseHelpers';

const DEFAULT_AVATAR_URL = 'https://via.placeholder.com/200x200.png?text=Profile';

interface LiveStream {
	id: string;
	userId: string;
	userName: string;
	userAvatar: string;
	channelName: string;
	viewerCount: number;
	isLive: boolean;
	startedAt: any;
}

function LiveStreamsRowComponent() {
	const router = useRouter();
	const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
	const lastFetchRef = React.useRef<number>(0);
	const isFetchingRef = React.useRef<boolean>(false);
	const hasInitializedRef = React.useRef<boolean>(false);

	useEffect(() => {
		// Only fetch once on initial mount
		if (hasInitializedRef.current) return;
		hasInitializedRef.current = true;

		let isMounted = true;

		const fetchLiveStreams = async () => {
			// Prevent multiple concurrent fetches
			if (isFetchingRef.current) return;

			isFetchingRef.current = true;

			try {
				const res: any = await getActiveLiveStreams();
				if (!isMounted) {
					isFetchingRef.current = false;
					return;
				}
				
				let streams: any[] = [];
				if (Array.isArray(res)) {
					streams = res;
				} else if (res && typeof res === 'object') {
					const candidate = (res as any).streams ?? (res as any).data;
					streams = Array.isArray(candidate) ? candidate : [];
				} else {
					streams = [];
				}

				if (streams.length > 0) {
					streams.sort((a: any, b: any) => (b?.viewerCount || 0) - (a?.viewerCount || 0));
				}
				setLiveStreams(streams);
			} catch (error) {
				console.error('❌ Error fetching live streams:', error);
			} finally {
				isFetchingRef.current = false;
			}
		};

		// Initial fetch only - no polling
		fetchLiveStreams();

		return () => {
			isMounted = false;
		};
	}, []);

	if (liveStreams.length === 0) {
		return null;
	}

	const handleStreamPress = (stream: LiveStream) => {
		router.push({
			pathname: '/watch-live',
			params: {
				streamId: stream.id,
				channelName: stream.channelName,
				hostName: stream.userName,
				hostAvatar: stream.userAvatar
			}
		});
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					<View style={styles.liveDot} />
					<Text style={styles.title}>Live Now</Text>
				</View>
				<Text style={styles.count}>{liveStreams.length} streaming</Text>
			</View>
			<ScrollView 
				horizontal 
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
			>
				{liveStreams.map((stream) => (
					<TouchableOpacity
						key={stream.id}
						style={styles.streamCard}
						onPress={() => handleStreamPress(stream)}
						activeOpacity={0.8}
					>
						<View style={styles.avatarContainer}>
							<Image 
								source={{ uri: stream.userAvatar || DEFAULT_AVATAR_URL }} 
								style={styles.avatar}
							/>
							<View style={styles.liveRing} />
							<View style={styles.liveBadge}>
								<Text style={styles.liveText}>LIVE</Text>
							</View>
						</View>
						<Text style={styles.userName} numberOfLines={1}>
							{stream.userName}
						</Text>
						<View style={styles.viewerInfo}>
							<Ionicons name="eye" size={12} color="#666" />
							<Text style={styles.viewerCount}>
								{stream.viewerCount || 0}
							</Text>
						</View>
					</TouchableOpacity>
				))}
			</ScrollView>
		</View>
	);
}

export default memo(LiveStreamsRowComponent);

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
		backgroundColor: '#fff',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	liveDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#ff0000',
		marginRight: 8,
	},
	title: {
		fontSize: 17,
		fontWeight: '700',
		color: '#000',
	},
	count: {
		fontSize: 13,
		color: '#666',
		fontWeight: '500',
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingBottom: 12,
	},
	streamCard: {
		alignItems: 'center',
		marginRight: 16,
		width: 80,
	},
	avatarContainer: {
		position: 'relative',
		marginBottom: 8,
	},
	avatar: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: '#f0f0f0',
	},
	liveRing: {
		position: 'absolute',
		top: -3,
		left: -3,
		right: -3,
		bottom: -3,
		borderRadius: 35,
		borderWidth: 2,
		borderColor: '#ff0000',
	},
	liveBadge: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: '#ff0000',
		paddingVertical: 2,
		borderRadius: 8,
		alignItems: 'center',
	},
	liveText: {
		color: '#fff',
		fontSize: 9,
		fontWeight: '700',
		letterSpacing: 0.5,
	},
	userName: {
		fontSize: 13,
		fontWeight: '600',
		color: '#000',
		textAlign: 'center',
		marginBottom: 4,
		width: '100%',
	},
	viewerInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	viewerCount: {
		fontSize: 12,
		color: '#666',
		fontWeight: '500',
	},
});
