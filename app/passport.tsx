import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions, Image, TextInput, Alert, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getCurrentUser } from '../lib/firebaseHelpers';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const { width } = Dimensions.get('window');

// Mock passport stamps data
const PASSPORT_STAMPS = [
  { id: 1, country: 'USA', flag: '🇺🇸', date: 'Jun 2024', cities: 3, adventures: 5 },
  { id: 2, country: 'Canada', flag: '🇨🇦', date: 'May 2024', cities: 2, adventures: 3 },
  { id: 3, country: 'Japan', flag: '🇯🇵', date: 'Apr 2024', cities: 4, adventures: 7 },
  { id: 4, country: 'India', flag: '🇮🇳', date: 'Mar 2024', cities: 2, adventures: 4 },
  { id: 5, country: 'Netherlands', flag: '🇳🇱', date: 'Feb 2024', cities: 1, adventures: 2 },
  { id: 6, country: 'Singapore', flag: '🇸🇬', date: 'Jan 2024', cities: 1, adventures: 3 },
  { id: 7, country: 'Portugal', flag: '🇵🇹', date: 'Dec 2023', cities: 2, adventures: 5 },
  { id: 8, country: 'Brazil', flag: '🇧🇷', date: 'Nov 2023', cities: 3, adventures: 6 },
  { id: 9, country: 'UK', flag: '🇬🇧', date: 'Oct 2023', cities: 4, adventures: 8 },
  { id: 10, country: 'Spain', flag: '🇪🇸', date: 'Sep 2023', cities: 3, adventures: 5 },
  { id: 11, country: 'Hong Kong', flag: '🇭🇰', date: 'Aug 2023', cities: 1, adventures: 2 },
  { id: 12, country: 'Australia', flag: '🇦🇺', date: 'Jul 2023', cities: 3, adventures: 6 },
];

const COUNTRIES_LIST = [
  { name: 'USA', flag: '🇺🇸' },
  { name: 'France', flag: '🇫🇷' },
  { name: 'Japan', flag: '🇯🇵' },
  { name: 'Australia', flag: '🇦🇺' },
  { name: 'Brazil', flag: '🇧🇷' },
  { name: 'UK', flag: '🇬🇧' },
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'Italy', flag: '🇮🇹' },
  { name: 'Spain', flag: '🇪🇸' },
  { name: 'Canada', flag: '🇨🇦' },
  { name: 'Mexico', flag: '🇲🇽' },
  { name: 'China', flag: '🇨🇳' },
  { name: 'India', flag: '🇮🇳' },
  { name: 'Thailand', flag: '🇹🇭' },
  { name: 'UAE', flag: '🇦🇪' },
  { name: 'Turkey', flag: '🇹🇷' },
  { name: 'Greece', flag: '🇬🇷' },
  { name: 'Switzerland', flag: '🇨🇭' },
  { name: 'Netherlands', flag: '🇳🇱' },
  { name: 'Portugal', flag: '🇵🇹' },
  { name: 'Singapore', flag: '🇸🇬' },
  { name: 'Malaysia', flag: '🇲🇾' },
  { name: 'Indonesia', flag: '🇮🇩' },
  { name: 'Vietnam', flag: '🇻🇳' },
  { name: 'South Korea', flag: '🇰🇷' },
];

export default function PassportScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const userId = params.userId as string;
  const currentUser = getCurrentUser();
  const isOwner = currentUser?.uid === userId;
  
  const [editMode, setEditMode] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStamp, setEditingStamp] = useState<any>(null);
  const [stamps, setStamps] = useState(PASSPORT_STAMPS);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);

  useEffect(() => {
    loadStamps();
  }, [userId]);

  async function loadStamps() {
    if (!userId) return;
    try {
      const stampDoc = await getDoc(doc(db, 'passportStamps', userId));
      if (stampDoc.exists()) {
        setStamps(stampDoc.data().stamps || PASSPORT_STAMPS);
      }
    } catch (error) {
      console.error('Error loading stamps:', error);
    }
  }

  async function saveStamps(newStamps: any[]) {
    if (!userId) return;
    try {
      await setDoc(doc(db, 'passportStamps', userId), { stamps: newStamps });
      setStamps(newStamps);
    } catch (error) {
      console.error('Error saving stamps:', error);
      Alert.alert('Error', 'Failed to save stamps');
    }
  }

  const currentLocation = 'London, United Kingdom';
  const currentFlag = '🇬🇧';

  const handleRemoveStamp = (id: number) => {
    if (!isOwner) return;
    const newStamps = stamps.filter(s => s.id !== id);
    saveStamps(newStamps);
  };

  const handleAddStamp = () => {
    if (!isOwner || !selectedCountry) return;
    const newStamp = {
      id: Date.now(),
      country: selectedCountry.name,
      flag: selectedCountry.flag,
      date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      cities: 1,
      adventures: 1
    };
    const newStamps = [newStamp, ...stamps];
    saveStamps(newStamps);
    setShowLocationModal(false);
    setSelectedCountry(null);
  };

  const handleEditStamp = (stamp: any) => {
    if (!isOwner) return;
    setEditingStamp({ ...stamp });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingStamp) return;
    const newStamps = stamps.map(s => s.id === editingStamp.id ? editingStamp : s);
    saveStamps(newStamps);
    setShowEditModal(false);
    setEditingStamp(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Professional Header with Gradient */}
      <LinearGradient
        colors={['#FFB800', '#FF8C00']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => {
            router.dismissAll();
            router.replace('/(tabs)/profile' as any);
          }}>
            <Feather name="x" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>My Passport</Text>
          {isOwner && (
            <TouchableOpacity onPress={() => setEditMode(!editMode)}>
              <Text style={[styles.editText, editMode && { color: '#fff', fontWeight: '700' }]}>
                {editMode ? 'Done' : 'Edit'}
              </Text>
            </TouchableOpacity>
          )}
          {!isOwner && <View style={{ width: 50 }} />}
        </View>
        
        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stamps.length}</Text>
            <Text style={styles.statLabel}>Countries</Text>
          </View>
          <View style={[styles.statItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }]}>
            <Text style={styles.statNumber}>{stamps.reduce((sum, s) => sum + (s.cities || 0), 0)}</Text>
            <Text style={styles.statLabel}>Cities</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stamps.reduce((sum, s) => sum + (s.adventures || 0), 0)}</Text>
            <Text style={styles.statLabel}>Adventures</Text>
          </View>
        </View>
      </LinearGradient>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {stamps.length === 0 ? (
          <View style={styles.placeholderWrap}>
            <View style={styles.emptyIconCircle}>
              <Feather name="globe" size={48} color="#FFB800" />
            </View>
            <Text style={styles.placeholderText}>No passport stamps yet</Text>
            <Text style={styles.emptySubtext}>Start traveling and collect stamps from around the world!</Text>
          </View>
        ) : (
          <View style={styles.stampsGrid}>
            {stamps.map((stamp, index) => (
              <View key={stamp.id} style={styles.stampContainer}>
                <TouchableOpacity 
                  style={[
                    styles.stamp,
                    editMode && isOwner && styles.stampEditMode,
                    { backgroundColor: `hsl(${(index * 40) % 360}, 65%, 95%)` }
                  ]}
                  activeOpacity={0.8}
                  onPress={() => editMode && isOwner && handleEditStamp(stamp)}
                >
                  <View style={styles.stampHeader}>
                    <Text style={styles.stampFlag}>{stamp.flag}</Text>
                    {editMode && isOwner && (
                      <TouchableOpacity 
                        style={styles.removeIconBtn}
                        onPress={() => handleRemoveStamp(stamp.id)}
                      >
                        <Feather name="x-circle" size={20} color="#f44336" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.stampCountry}>{stamp.country}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                        <Feather name="map-pin" size={12} color="#666" />
                        <Text style={{ fontSize: 11, color: '#666', marginLeft: 4 }}>{stamp.cities || 0}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Feather name="activity" size={12} color="#666" />
                        <Text style={{ fontSize: 11, color: '#666', marginLeft: 4 }}>{stamp.adventures || 0}</Text>
                      </View>
                    </View>
                    <Text style={styles.stampDate}>{stamp.date}</Text>
                  </View>
                  
                  {/* Decorative stamp border */}
                  <View style={styles.stampBorderDecor} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {isOwner && (
          <View style={styles.addSection}>
            <Text style={styles.addTitle}>Add Current Location</Text>
            <Text style={styles.addSubtitle}>Stamp your passport with your current destination</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowLocationModal(true)}
              activeOpacity={0.8}
            >
              <Feather name="map-pin" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.addButtonText}>Add Location</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Location Detection Modal */}
      {isOwner && (
        <Modal
          visible={showLocationModal}
          transparent={false}
          animationType="slide"
          onRequestClose={() => {
            setShowLocationModal(false);
            setSelectedCountry(null);
          }}
        >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <TouchableOpacity onPress={() => {
              setShowLocationModal(false);
              setSelectedCountry(null);
            }}>
              <Feather name="x" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {COUNTRIES_LIST.map((country) => (
              <TouchableOpacity
                key={country.name}
                style={[
                  styles.countryItem,
                  selectedCountry?.name === country.name && styles.countryItemSelected
                ]}
                onPress={() => setSelectedCountry(country)}
              >
                <Text style={styles.countryFlag}>{country.flag}</Text>
                <Text style={[
                  styles.countryName,
                  selectedCountry?.name === country.name && styles.countryNameSelected
                ]}>{country.name}</Text>
                {selectedCountry?.name === country.name && (
                  <Feather name="check" size={20} color="#FFB800" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
            <TouchableOpacity 
              style={[
                styles.confirmButton,
                !selectedCountry && { backgroundColor: '#ccc' }
              ]} 
              onPress={handleAddStamp}
              disabled={!selectedCountry}
            >
              <Text style={styles.confirmButtonText}>
                {selectedCountry ? `Add ${selectedCountry.name}` : 'Select a country'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      )}

      {/* Edit Stamp Modal */}
      {isOwner && showEditModal && editingStamp && (
        <Modal
          visible={showEditModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowEditModal(false);
            setEditingStamp(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Stamp</Text>
                <TouchableOpacity onPress={() => {
                  setShowEditModal(false);
                  setEditingStamp(null);
                }}>
                  <Feather name="x" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <View style={styles.editForm}>
                <Text style={styles.editLabel}>Country</Text>
                <TextInput
                  style={styles.editInput}
                  value={editingStamp.country}
                  onChangeText={(text) => setEditingStamp({ ...editingStamp, country: text })}
                  placeholder="Country name"
                />

                <Text style={styles.editLabel}>Flag Emoji</Text>
                <TextInput
                  style={styles.editInput}
                  value={editingStamp.flag}
                  onChangeText={(text) => setEditingStamp({ ...editingStamp, flag: text })}
                  placeholder="🇺🇸"
                />

                <Text style={styles.editLabel}>Date</Text>
                <TextInput
                  style={styles.editInput}
                  value={editingStamp.date}
                  onChangeText={(text) => setEditingStamp({ ...editingStamp, date: text })}
                  placeholder="Jan 2024"
                />

                <Text style={styles.editLabel}>Cities Visited</Text>
                <TextInput
                  style={styles.editInput}
                  value={String(editingStamp.cities || 0)}
                  onChangeText={(text) => setEditingStamp({ ...editingStamp, cities: parseInt(text) || 0 })}
                  placeholder="0"
                  keyboardType="numeric"
                />

                <Text style={styles.editLabel}>Adventures</Text>
                <TextInput
                  style={styles.editInput}
                  value={String(editingStamp.adventures || 0)}
                  onChangeText={(text) => setEditingStamp({ ...editingStamp, adventures: parseInt(text) || 0 })}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity style={styles.confirmButton} onPress={handleSaveEdit}>
                <Text style={styles.confirmButtonText}>Save Changes</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingStamp(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerGradient: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backBtn: {},
  title: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginLeft: -24,
  },
  editText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  placeholderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF5E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  placeholderText: {
    color: '#333',
    fontSize: 18,
    marginTop: 12,
    fontWeight: '700',
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  stampsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  stampContainer: {
    width: '48%',
    marginBottom: 16,
  },
  stamp: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFB800',
    borderStyle: 'dashed',
    minHeight: 140,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stampEditMode: {
    borderColor: '#f44336',
  },
  stampHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  stampFlag: {
    fontSize: 48,
    marginBottom: 8,
  },
  stampCountry: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
    textAlign: 'center',
  },
  stampDate: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  removeIconBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  stampBorderDecor: {
    position: 'absolute',
    bottom: 8,
    width: '80%',
    height: 1,
    backgroundColor: '#FFB800',
    opacity: 0.3,
  },
  editButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  editBtn: {
    backgroundColor: '#FFB800',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  editForm: {
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  countryItemSelected: {
    backgroundColor: '#FFF8E6',
  },
  countryFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  countryNameSelected: {
    color: '#FFB800',
    fontWeight: '700',
  },
  removeBtn: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  removeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addSection: {
    marginTop: 32,
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 20,
  },
  addTitle: {
    fontSize: 16,
    color: '#222',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  addSubtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#FFB800',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  locationInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  locationFlag: {
    fontSize: 64,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  locationName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  confirmButton: {
    backgroundColor: '#f39c12',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
