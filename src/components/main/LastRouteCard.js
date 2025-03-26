import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

const LastRouteCard = ({ hasRoute = false, onPress }) => {
  // Если у пользователя нет последнего маршрута
  if (!hasRoute) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Повторим маршрут?</Text>
        <TouchableOpacity style={styles.emptyRouteCard} onPress={onPress}>
          <Text style={styles.emptyTitle}>Пока здесь пусто</Text>
          <Text style={styles.emptyDescription}>
            Вы еще никуда не ездили.
            Давайте исправим это!
          </Text>
          <TouchableOpacity style={styles.routeButton} onPress={onPress}>
            <Ionicons name="navigate-outline" size={20} color="#FFF" />
            <Text style={styles.routeButtonText}>Куда направимся?</Text>
          </TouchableOpacity>
          <View style={styles.mapIconContainer}>
            <View style={styles.mapIconBackground}>
              <Ionicons name="navigate" size={24} color="#FFF" />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // Если у пользователя есть последний маршрут
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Повторим маршрут?</Text>
      <TouchableOpacity style={styles.routeCard} onPress={onPress}>
        <View style={styles.routeInfo}>
          <Text style={styles.routeAddress}>Варшавская ул., 22</Text>
          <Text style={styles.routeDetails}>
            Санкт-Петербург, Московская застава, Московский район
          </Text>
        </View>
        <View style={styles.distanceContainer}>
          <Ionicons name="navigate" size={20} color="#FFF" />
          <Text style={styles.distance}>36 км</Text>
        </View>
        <View style={styles.mapIconContainer}>
          <View style={styles.mapIconBackground}>
            <Ionicons name="navigate" size={24} color="#FFF" />
          </View>
        </View>
      </TouchableOpacity>
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
  emptyRouteCard: {
    backgroundColor: '#6C63FF', 
    borderRadius: theme.spacing.m,
    padding: theme.spacing.m,
    height: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: theme.spacing.xs,
  },
  emptyDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: theme.spacing.m,
    width: '70%',
  },
  routeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.m,
    borderRadius: theme.spacing.m,
    alignSelf: 'flex-start',
  },
  routeButtonText: {
    color: '#FFF',
    marginLeft: theme.spacing.xs,
    fontWeight: '500',
  },
  mapIconContainer: {
    position: 'absolute',
    right: theme.spacing.m,
    bottom: theme.spacing.m,
  },
  mapIconBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeCard: {
    backgroundColor: '#6C63FF', 
    borderRadius: theme.spacing.m,
    padding: theme.spacing.m,
    height: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  routeInfo: {
    width: '70%',
  },
  routeAddress: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: theme.spacing.xs,
  },
  routeDetails: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: theme.spacing.m,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.m,
    borderRadius: theme.spacing.m,
    alignSelf: 'flex-start',
    position: 'absolute',
    bottom: theme.spacing.m,
    left: theme.spacing.m,
  },
  distance: {
    color: '#FFF',
    marginLeft: theme.spacing.xs,
    fontWeight: '500',
  },
});

export default LastRouteCard;
