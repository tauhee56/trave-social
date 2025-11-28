import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import React, { useState } from 'react';
import { Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { addUserSection, deleteUserSection, updateUserSection, updateUserSectionsOrder } from '../../lib/firebaseHelpers';
import { getUserSectionsSorted } from '../../lib/firebaseHelpers/getUserSectionsSorted';

type Section = {
  name: string;
  postIds: string[];
  coverImage?: string;
};

type Post = {
  id: string;
  imageUrl?: string;
  imageUrls?: string[];
};

type EditSectionsModalProps = {
  visible: boolean;
  onClose: () => void;
  userId: string;
  sections: Section[];
  posts: Post[];
  onSectionsUpdate: (sections: Section[]) => void;
};

export default function EditSectionsModal({
  visible,
  onClose,
  userId,
  sections,
  posts,
  onSectionsUpdate,
}: EditSectionsModalProps) {
  const [selectedSectionForEdit, setSelectedSectionForEdit] = useState<string | null>(null);
  const [sectionMode, setSectionMode] = useState<'select' | 'cover'>('select');
  const [newSectionName, setNewSectionName] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);

  const handleCreateSection = async () => {
    if (!newSectionName.trim() || !userId) return;
    await addUserSection(userId, { name: newSectionName.trim(), postIds: [] });
    const res = await getUserSectionsSorted(userId);
    if (res.success && res.data) {
      onSectionsUpdate(res.data);
    }
    setNewSectionName('');
    setShowCreateInput(false);
  };

  const handleDeleteSection = async (sectionName: string) => {
    if (!userId) return;
    Alert.alert('Delete section', `Delete "${sectionName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteUserSection(userId, sectionName);
          const res = await getUserSectionsSorted(userId);
          if (res.success && res.data) {
            onSectionsUpdate(res.data);
          }
          if (selectedSectionForEdit === sectionName) {
            setSelectedSectionForEdit(null);
          }
        },
      },
    ]);
  };

  const handleSelectSection = (sectionName: string) => {
    setSelectedSectionForEdit(prev => prev === sectionName ? null : sectionName);
    setSectionMode('select');
  };

  const handlePostSelection = async (post: Post) => {
    if (!userId || !selectedSectionForEdit) return;
    const section = sections.find(s => s.name === selectedSectionForEdit);
    if (!section) return;

    if (sectionMode === 'cover') {
      const uri = post.imageUrl || post.imageUrls?.[0];
      await updateUserSection(userId, { name: selectedSectionForEdit, postIds: section.postIds, coverImage: uri });
      const res = await getUserSectionsSorted(userId);
      if (res.success && res.data) {
        onSectionsUpdate(res.data);
      }
    } else {
      const newPostIds = section.postIds.includes(post.id)
        ? section.postIds.filter(id => id !== post.id)
        : [...section.postIds, post.id];
      await updateUserSection(userId, { name: selectedSectionForEdit, postIds: newPostIds, coverImage: section.coverImage });
      const res = await getUserSectionsSorted(userId);
      if (res.success && res.data) {
        onSectionsUpdate(res.data);
      }
    }
  };

  const handleSave = () => {
    setSelectedSectionForEdit(null);
    setSectionMode('select');
    setShowCreateInput(false);
    onClose();
  };

  const handleClearAll = () => {
    setSelectedSectionForEdit(null);
    setSectionMode('select');
  };

  const handleReorderSections = async (data: Section[]) => {
    onSectionsUpdate(data);
    // Save order to Firebase
    if (userId) {
      await updateUserSectionsOrder(userId, data);
    }
  };

  const renderSectionItem = ({ item, drag, isActive }: RenderItemParams<Section>) => {
    const isSelected = selectedSectionForEdit === item.name;
    const [editing, setEditing] = useState(false);
    const [sectionName, setSectionName] = useState(item.name);
    const handleNameUpdate = async () => {
      if (sectionName.trim() && sectionName !== item.name) {
        // Rename logic: create new section, copy data, delete old section
        await updateUserSection(userId, { name: sectionName.trim(), postIds: item.postIds, coverImage: item.coverImage });
        await deleteUserSection(userId, item.name);
        const res = await getUserSectionsSorted(userId);
        if (res.success && res.data) {
          onSectionsUpdate(res.data);
        }
      }
      setEditing(false);
    };
    return (
      <ScaleDecorator>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity
            onLongPress={drag}
            style={[styles.dragHandle, isSelected && { marginRight: 0 }]}
          >
            <Ionicons name="menu" size={24} color="#999" />
          </TouchableOpacity>
          {isSelected ? (
            <View style={styles.selectedSectionCard}>
              <TouchableOpacity
                activeOpacity={1}
                onLongPress={() => setEditing(true)}
                style={styles.selectedSectionInputWrap}
              >
                <TextInput
                  style={styles.selectedSectionInput}
                  value={sectionName}
                  editable={editing}
                  onChangeText={setSectionName}
                  onBlur={handleNameUpdate}
                  onSubmitEditing={handleNameUpdate}
                  selectTextOnFocus={editing}
                />
              </TouchableOpacity>
              <View style={styles.selectedSectionActions}>
                <View style={styles.selectedSectionActionRow}>
                  <Ionicons name="albums-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.selectedSectionActionText}>{item.postIds?.length || 0} Posts</Text>
                </View>
                <TouchableOpacity style={styles.selectedSectionActionRow} onPress={() => handleDeleteSection(item.name)}>
                  <Ionicons name="trash-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.selectedSectionActionText}>Delete this section</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.sectionRowSimple}
              onPress={() => handleSelectSection(item.name)}
            >
              <Text style={styles.sectionRowTitle}>{item.name}</Text>
              <Text style={styles.sectionRowCount}>{item.postIds?.length || 0} Posts</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit sections</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Create new section button */}
          {!showCreateInput ? (
            <TouchableOpacity
              style={styles.createSectionBtn}
              onPress={() => setShowCreateInput(true)}
            >
              <Ionicons name="add" size={20} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.createSectionText}>Create a new section</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.createInputContainer}>
              <TextInput
                style={styles.createInput}
                placeholder="Section name"
                value={newSectionName}
                onChangeText={setNewSectionName}
                autoFocus
                onSubmitEditing={handleCreateSection}
              />
              <TouchableOpacity onPress={handleCreateSection} style={styles.createConfirmBtn}>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowCreateInput(false); setNewSectionName(''); }} style={styles.createCancelBtn}>
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          {/* Draggable Sections list */}
          <View style={{ minHeight: sections.length * 80 }}>
            <DraggableFlatList
              data={sections}
              onDragEnd={({ data }) => handleReorderSections(data)}
              keyExtractor={(item) => item.name}
              renderItem={renderSectionItem}
              scrollEnabled={false}
            />
          </View>

          {/* Section management instructions */}
          {selectedSectionForEdit && (
            <View style={styles.managementSection}>
              <Text style={styles.instructionTitle}>Select post below to add to this section</Text>
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeBtn, sectionMode === 'select' && styles.modeBtnActive]}
                  onPress={() => setSectionMode('select')}
                >
                  <Text style={[styles.modeBtnText, sectionMode === 'select' && styles.modeBtnTextActive]}>
                    Select posts
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, sectionMode === 'cover' && styles.modeBtnActive]}
                  onPress={() => setSectionMode('cover')}
                >
                  <Text style={[styles.modeBtnText, sectionMode === 'cover' && styles.modeBtnTextActive]}>
                    Select cover
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Posts grid for selection */}
              <View style={styles.grid}>
                {posts.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.gridItem}
                    activeOpacity={0.8}
                    onPress={() => handlePostSelection(p)}
                  >
                    <ExpoImage
                      source={{ uri: p.imageUrl || p.imageUrls?.[0] }}
                      style={styles.gridImage}
                      contentFit="cover"
                      transition={200}
                    />
                    {sectionMode === 'select' && sections.find(s => s.name === selectedSectionForEdit)?.postIds.includes(p.id) && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Bottom actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity onPress={handleClearAll}>
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
    selectedSectionCard: {
      flex: 1,
      backgroundColor: '#f39c12',
      borderRadius: 16,
      borderWidth: 2,
      borderColor: '#f39c12',
      padding: 12,
      justifyContent: 'center',
      shadowColor: '#f39c12',
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    selectedSectionInputWrap: {
      backgroundColor: '#fff',
      borderRadius: 8,
      marginBottom: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    selectedSectionInput: {
      fontSize: 16,
      fontWeight: '600',
      color: '#222',
      paddingVertical: 6,
      paddingHorizontal: 2,
      backgroundColor: 'transparent',
    },
    selectedSectionActions: {
      marginTop: 2,
    },
    selectedSectionActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    selectedSectionActionText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '500',
    },
    sectionRowSimple: {
      flex: 1,
      backgroundColor: 'transparent',
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 8,
      justifyContent: 'center',
    },
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  closeBtn: { padding: 8 },
  title: { fontSize: 16, fontWeight: '600', color: '#000' },
  content: { padding: 16 },
  createSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  createSectionText: { fontSize: 15, fontWeight: '500' },
  createInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  createInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  createConfirmBtn: {
    backgroundColor: '#f39c12',
    padding: 8,
    borderRadius: 8,
  },
  createCancelBtn: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingVertical: 16,
    paddingLeft: 4,
    paddingRight: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  sectionRowActive: {
    backgroundColor: '#fff4e6',
    borderWidth: 2,
    borderColor: '#f39c12',
  },
  sectionRowDragging: {
    backgroundColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  dragHandle: {
    padding: 8,
    marginLeft: -8,
    marginRight: 4,
  },
  sectionRowContent: {
    flex: 1,
    paddingLeft: 8,
  },
  sectionRowTitle: { fontSize: 15, fontWeight: '600', color: '#000' },
  sectionRowCount: { fontSize: 13, color: '#666', marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteText: { color: '#ff3b30', fontSize: 13, fontWeight: '500' },
  managementSection: { marginTop: 24 },
  instructionTitle: { fontSize: 14, fontWeight: '600', color: '#000' },
  modeToggle: { flexDirection: 'row', gap: 8, marginTop: 12 },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: '#f39c12' },
  modeBtnText: { fontSize: 13, fontWeight: '500', color: '#000' },
  modeBtnTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  gridItem: { width: '33.3333%', aspectRatio: 1, padding: 1 },
  gridImage: { width: '100%', height: '100%' },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#f39c12',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingBottom: 40,
  },
  clearText: { fontSize: 16, color: '#666' },
  saveBtn: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
