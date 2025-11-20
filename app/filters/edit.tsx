import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';

// Simple local filter management
const DEFAULT_FILTERS = ['Beach', 'Mountain', 'City', 'Food', 'Culture', 'Adventure'];

export default function FilterEdit() {
  const router = useRouter();
  const [filters, setFilters] = useState<string[]>(DEFAULT_FILTERS);
  const [text, setText] = useState('');

  function onAdd() {
    if (!text.trim()) return;
    setFilters([...filters, text.trim()]);
    setText('');
  }

  function onRemove(f: string) {
    if (DEFAULT_FILTERS.includes(f)) return; // default filters cannot be removed
    setFilters(filters.filter(item => item !== f));
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 18 }}>◀</Text>
        </TouchableOpacity>
        <Text style={{ fontWeight: '700', fontSize: 16, marginLeft: 12 }}>Edit Filters</Text>
      </View>

      <View style={styles.form}>
        <TextInput placeholder="Add new filter" value={text} onChangeText={setText} style={styles.input} />
        <TouchableOpacity style={styles.addBtn} onPress={onAdd}><Text style={{ color: '#fff' }}>Add</Text></TouchableOpacity>
      </View>

      <FlatList
        data={filters}
        keyExtractor={(i) => i}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text>{item}</Text>
            {!DEFAULT_FILTERS.includes(item) ? (
              <TouchableOpacity onPress={() => onRemove(item)}><Text style={{ color: '#e0245e' }}>Remove</Text></TouchableOpacity>
            ) : (
              <Text style={{ color: '#777' }}>Default</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 40 },
  header: { paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  form: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 8, paddingHorizontal: 12, height: 44 },
  addBtn: { marginLeft: 8, backgroundColor: '#f39c12', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
});
