import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { theme } from '../../theme';

const PlaceCard = ({ title, count, color, icon, onPress }) => {
  return (
    <TouchableOpacity style={[styles.placeCard, { backgroundColor: color }]} onPress={onPress}>
      <View style={styles.placeContent}>
        <Text style={styles.placeCount}>{count} мест рядом с вами</Text>
        <Text style={styles.placeTitle}>{title}</Text>
      </View>
      <View style={styles.placeIconContainer}>
        {icon}
      </View>
    </TouchableOpacity>
  );
};

const NearbyPlacesSection = ({ onPress }) => {
  // В реальном приложении эти данные будут приходить из API или хранилища
  const places = [
    {
      id: '1',
      title: 'Аптеки',
      count: 10,
      color: '#4CD97B',
      icon: <Text style={styles.pharmacyIcon}>+</Text>
    },
    {
      id: '2',
      title: 'Рестораны и кафе',
      count: 6,
      color: '#FFB74D',
      icon: <Text style={styles.restaurantIcon}>✕</Text>
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Полезные места рядом</Text>
      <View style={styles.cardsContainer}>
        {places.map((place) => (
          <PlaceCard 
            key={place.id}
            title={place.title}
            count={place.count}
            color={place.color}
            icon={place.icon}
            onPress={onPress}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.l,
    paddingHorizontal: theme.spacing.m,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.m,
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  placeCard: {
    flex: 1,
    borderRadius: theme.spacing.m,
    padding: theme.spacing.m,
    marginHorizontal: theme.spacing.xs,
    height: 120,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  placeContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  placeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  placeCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: theme.spacing.xs,
  },
  placeIconContainer: {
    position: 'absolute',
    right: -10,
    top: -10,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pharmacyIcon: {
    fontSize: 70,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  restaurantIcon: {
    fontSize: 70,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

export default NearbyPlacesSection;
