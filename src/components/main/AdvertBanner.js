import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';

const AdvertBanner = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <Text style={styles.title}>БОНУС 500%</Text>
        <Text style={styles.subtitle}>на «Набор первопроходца»</Text>
        <Text style={styles.description}>Только для новых игроков!</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 80,
    marginHorizontal: theme.spacing.m,
    marginBottom: theme.spacing.l,
    borderRadius: theme.spacing.s,
    overflow: 'hidden',
    backgroundColor: '#1E2747',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: theme.spacing.m,
    alignItems: 'center',
  },
  title: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    marginVertical: 2,
  },
  description: {
    color: '#FFD700',
    fontSize: 12,
  },
});

export default AdvertBanner;
