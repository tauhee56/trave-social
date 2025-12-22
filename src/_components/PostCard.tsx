import { Dimensions, StyleSheet } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallDevice = SCREEN_WIDTH < 375;
const IMAGE_PLACEHOLDER = 'L5H2EC=PM+yV0g-mq.wG9c010J}I';

// Props type for PostCard
interface PostCardProps {
	post: any;
	currentUser: any;
	showMenu?: boolean;
	highlightedCommentId?: string;
	highlightedCommentText?: string;
	showCommentsModal?: boolean;
	onCloseCommentsModal?: () => void;
}

const styles = StyleSheet.create({
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 8,
		backgroundColor: '#fff',
	},
	locationRow: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: 8,
	},
	locationTextWrap: {
		flexDirection: 'column',
		alignItems: 'flex-start',
		gap: 0,
	},
	verifiedBadgeBox: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: '#fafafa',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 10,
		marginTop: 2,
	},
	// ...existing code...
});
// ...existing code (component implementation, export, etc.)...
