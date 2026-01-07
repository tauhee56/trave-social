import React from 'react';
import { Dimensions, StyleSheet, Text, View, Image } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_BUBBLE_WIDTH = Math.min(340, Math.floor(SCREEN_WIDTH * 0.74));

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
    <View style={styles.outerWrap}>
      {hasReply && (
        <View style={[styles.replyPreview, isSelf ? styles.replyPreviewSelf : styles.replyPreviewOther]}>
          <View style={styles.replyLine} />
          <View style={styles.replyContent}>
            <Text style={styles.replyName}>{isReplyFromSelf ? 'You' : 'Reply'}</Text>
            <Text style={styles.replyText} numberOfLines={2}>{replyTo?.text}</Text>
          </View>
        </View>
      )}
      <View style={[
        styles.msgBubble,
        compact && styles.msgBubbleCompact,
        isSelf ? styles.msgBubbleRight : styles.msgBubbleLeft,
      ]}>
        {imageUrl && <Image source={{ uri: imageUrl }} style={styles.msgImage} />}
        {text && <Text style={isSelf ? styles.msgTextSelf : styles.msgText}>{text}</Text>}
        <View style={styles.msgFooter}>
          <View style={[styles.timePill, isSelf ? styles.timePillSelf : styles.timePillOther]}>
            <Text style={isSelf ? styles.msgTimeSelf : styles.msgTime}>
              {formatTime(createdAt)}
              {editedAt && ' · edited'}
            </Text>
          </View>
        </View>
        {showTail && (isSelf ? <View style={styles.tailRight} /> : <View style={styles.tailLeft} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    maxWidth: MAX_BUBBLE_WIDTH,
    flexShrink: 1,
  },
  msgBubble: {
    position: 'relative',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 11,
    maxWidth: MAX_BUBBLE_WIDTH,
    minWidth: 60,
    flexShrink: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
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
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    borderTopLeftRadius: 10,
  },
  msgBubbleRight: {
    backgroundColor: '#3797f0',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderTopRightRadius: 10,
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
    color: '#1f2937',
    fontSize: 15,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  msgTextSelf: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  timePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  timePillOther: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  timePillSelf: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  msgTime: {
    color: 'rgba(0,0,0,0.55)',
    fontSize: 11,
  },
  msgTimeSelf: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
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
