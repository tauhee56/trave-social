import { useState } from "react";
import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive values
const isSmallDevice = SCREEN_HEIGHT < 700;
const isMediumDevice = SCREEN_HEIGHT >= 700 && SCREEN_HEIGHT < 850;

const responsiveValues = {
	imageHeight: isSmallDevice ? 240 : isMediumDevice ? 300 : 340,
	titleSize: isSmallDevice ? 16 : 18,
	labelSize: isSmallDevice ? 13 : 14,
	inputSize: isSmallDevice ? 14 : 15,
	spacing: isSmallDevice ? 12 : 16,
	spacingLarge: isSmallDevice ? 16 : 20,
	inputHeight: isSmallDevice ? 44 : 48,
	modalPadding: isSmallDevice ? 16 : 20,
};

interface StoryUser {
	userId: string;
	userName: string;
	userAvatar: string;
	stories: any[];
}

function StoriesRowComponent({ onStoryPress, refreshTrigger }: { onStoryPress?: (stories: any[], initialIndex: number) => void; refreshTrigger?: number }) {
	const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);
	const [currentUserAvatar, setCurrentUserAvatar] = useState('');
	const [showUploadModal, setShowUploadModal] = useState(false);
	const [selectedMedia, setSelectedMedia] = useState<any>(null);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [locationQuery, setLocationQuery] = useState('');
	const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
	const [loadingLocations, setLoadingLocations] = useState(false);
	const DEFAULT_AVATAR_URL = 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/default/default-pic.jpg';
	// ...existing code...
}

export default StoriesRowComponent;
// ...existing code (styles, helpers, etc.)...
