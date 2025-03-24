import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

const VoiceSearch = ({ isActive, isRecognizing, recognizedText, onStop }) => {
  if (!isActive) return null;
  
  return (
    <View style={styles.voiceSearchOverlay}>
      <View style={styles.voiceSearchContainer}>
        <View style={styles.voiceWaveContainer}>
          {/* u0418u043cu0438u0442u0430u0446u0438u044f u0437u0432u0443u043au043eu0440u044bu0445 u0432u043eu043bu043d */}
          <View style={[styles.voiceWave, { height: isRecognizing ? 15 + Math.random() * 30 : 15 }]} />
          <View style={[styles.voiceWave, { height: isRecognizing ? 15 + Math.random() * 30 : 25 }]} />
          <View style={[styles.voiceWave, { height: isRecognizing ? 15 + Math.random() * 30 : 35 }]} />
          <View style={[styles.voiceWave, { height: isRecognizing ? 15 + Math.random() * 30 : 45 }]} />
          <View style={[styles.voiceWave, { height: isRecognizing ? 15 + Math.random() * 30 : 35 }]} />
          <View style={[styles.voiceWave, { height: isRecognizing ? 15 + Math.random() * 30 : 25 }]} />
          <View style={[styles.voiceWave, { height: isRecognizing ? 15 + Math.random() * 30 : 15 }]} />
        </View>
        <TouchableOpacity 
          style={styles.voiceSearchButton}
          onPress={onStop}
        >
          <Ionicons name="mic" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.voiceSearchText}>{recognizedText || "u0413u043eu0432u043eu0440u0438u0442u0435"}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  voiceSearchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  voiceSearchContainer: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  voiceWaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginBottom: 24,
  },
  voiceWave: {
    width: 4,
    marginHorizontal: 2,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  voiceSearchButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  voiceSearchText: {
    fontSize: 18,
    color: theme.colors.text,
    textAlign: 'center',
  },
});

export default VoiceSearch;
