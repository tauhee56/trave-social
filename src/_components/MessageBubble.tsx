import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  text?: string;
  imageUrl?: string | null;
  createdAt: any;
  editedAt?: any;
  isSelf: boolean;
  formatTime: (ts: any) => string;
  replyTo?: { id: string; text: string; senderId: string } | null;
  username?: string;
  currentUserId?: string;
  compact?: boolean;
  showTail?: boolean;
};

export default function MessageBubble({
  text,
  imageUrl,
  createdAt,
  editedAt,
  isSelf,
  formatTime,
  replyTo,
  username,
  currentUserId,
  compact = false,
  showTail = true,
}: Props) {
  const hasReply = !!(replyTo && replyTo.text);
  const isReplyFromSelf = replyTo?.senderId === currentUserId;

  return (
    <View style={{ maxWidth: '100%' }}>
      {hasReply && (
        <View style={[styles.replyPreview, isSelf ? styles.replyPreviewSelf : styles.replyPreviewOther]}>
          <View style={styles.replyLine} />
          <View style={styles.replyContent}>
            <Text style={styles.replyName}>{/* ...existing code... */}</Text>
          </View>
        </View>
      )}
      {/* ...existing code... */}
    </View>
  );
}

const styles = StyleSheet.create({
  msgBubble: {
    position: 'relative',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '92%',
    minWidth: 60,
    flexShrink: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  msgBubbleCompact: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '100%',
    flexShrink: 1,
    shadowOpacity: 0,
    elevation: 0,
  },
  msgBubbleLeft: {
    backgroundColor: '#efefef',
  },
  msgBubbleRight: {
    backgroundColor: '#3797f0',
  },
  tailLeft: {
    position: 'absolute',
    left: -6,
    bottom: 8,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderRightWidth: 6,
    borderTopColor: 'transparent',
    borderRightColor: '#efefef',
  },
  tailRight: {
    position: 'absolute',
    right: -6,
    bottom: 8,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderLeftColor: '#3797f0',
  },
  msgText: {
    color: '#222',
    fontSize: 15,
    flexWrap: 'wrap',
  },
  msgTextSelf: {
    color: '#fff',
    fontSize: 15,
    flexWrap: 'wrap',
  },
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  msgTime: {
    color: '#999',
    fontSize: 11,
    marginTop: 4,
  },
  msgTimeSelf: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 4,
  },
  msgImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  editedLabel: {
    fontStyle: 'italic',
    fontSize: 10,
  },
  // Reply styles
  replyPreview: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 8,
  },
  replyPreviewSelf: {
    alignSelf: 'flex-end',
  },
  replyPreviewOther: {
    alignSelf: 'flex-start',
    marginLeft: 0,
  },
  replyLine: {
    width: 3,
    backgroundColor: '#3797f0',
    borderRadius: 2,
    marginRight: 8,
  },
  replyContent: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 200,
  },
  replyName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3797f0',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 13,
    color: '#666',
  },
});
