import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, Dimensions, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { ArrowRight, ArrowLeftWhite } from '../../assets/icons/index';

/**
 * Компонент информации о выбранном месте с возможностью сворачивания/разворачивания
 * 
 * @param {Object} props - Свойства компонента
 * @param {Object} props.placeInfo - Информация о выбранном месте
 * @param {Function} props.onStartRouting - Функция для начала построения маршрута
 * @param {Boolean} props.isVisible - Флаг видимости компонента
 */
const SelectedPlaceInfo = ({ placeInfo, onStartRouting, isVisible = true }) => {
  // Состояние развернутости панели (по умолчанию развернута)
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Анимированные значения
  const slideAnim = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(1)).current; // Начинаем с 1, т.к. по умолчанию развернуто
  const [containerHeight, setContainerHeight] = useState(150); // Начальная высота - развернутая
  
  // Получаем размеры экрана
  const { width } = Dimensions.get('window');
  
  // Функция для разворачивания/сворачивания панели
  const toggleExpand = (shouldExpand = !isExpanded) => {
    setIsExpanded(shouldExpand);
    
    Animated.timing(expandAnim, {
      toValue: shouldExpand ? 1 : 0,
      duration: 300,
      useNativeDriver: false
    }).start();
    
    // Обновляем высоту контейнера напрямую
    setContainerHeight(shouldExpand ? 150 : 60); // Уменьшаем высоту свернутого состояния
  };
  
  // Настраиваем обработчик жестов для свайпа
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Реагируем только на вертикальные движения
        return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dx) < Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        // Не делаем ничего во время движения, только отслеживаем
      },
      onPanResponderRelease: (_, gestureState) => {
        // Если свайп вниз - сворачиваем, если вверх - разворачиваем
        if (gestureState.dy > 30) { // Свайп вниз
          toggleExpand(false);
        } else if (gestureState.dy < -30) { // Свайп вверх
          toggleExpand(true);
        }
      }
    })
  ).current;
  
  // Эффект для анимации появления/исчезновения
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : 100, // 0 - видимый, 100 - скрытый
      duration: 300,
      useNativeDriver: true
    }).start();
  }, [isVisible, slideAnim]);
  
  // Если нет информации о месте, не отображаем ничего
  if (!placeInfo) return null;
  
  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          transform: [{ translateY: slideAnim }],
          height: containerHeight
        }
      ]}
      {...panResponder.panHandlers}
    >
      {/* Индикатор свайпа (горизонтальная полоска) */}
      <View style={styles.swipeIndicatorContainer}>
        <View style={styles.swipeIndicator} />
      </View>
      
      {/* Верхняя часть с названием */}
      <TouchableOpacity 
        style={styles.header} 
        onPress={() => toggleExpand()}
        activeOpacity={0.8}
      >
        <View style={styles.headerContent}>
          <View style={styles.placeNameContainer}>
            <Ionicons name="location" size={20} color={theme.colors.primary} style={styles.locationIcon} />
            <Text style={styles.placeName} numberOfLines={1} ellipsizeMode="tail">
              {placeInfo.name || "Выбранное место"}
            </Text>
          </View>
          
          <View style={styles.distanceContainer}>
            {placeInfo.distance && (
              <Text style={styles.distance}>
                {placeInfo.distance < 1 
                  ? `${Math.round(placeInfo.distance * 1000)} м` 
                  : `${placeInfo.distance.toFixed(1)} км`}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
      
      {/* Содержимое, которое появляется при разворачивании */}
      <Animated.View style={[styles.expandedContent, { opacity: expandAnim }]}>
        {placeInfo.address && (
          <Text style={styles.address} numberOfLines={2} ellipsizeMode="tail">
            {placeInfo.address}
          </Text>
        )}
      </Animated.View>
      
      {/* Кнопки действий */}
      <View style={[styles.actionsContainer, !isExpanded && styles.actionsContainerCollapsed]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onStartRouting(false)}
        >
          <ArrowLeftWhite width={24} height={24} style={styles.buttonIcon}/>
          <Text style={styles.actionText}>Сюда</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => onStartRouting(true)}
        >
          <ArrowRight width={24} height={24} style={styles.buttonIcon}/>
          <Text style={[styles.actionText, styles.secondaryText]}>Отсюда</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.iconButton, styles.secondaryButton]}
        >
          <Ionicons name="bookmark-outline" size={22} color="#6979F8" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.iconButton, styles.secondaryButton]}
        >
          <Ionicons name="share-outline" size={22} color="#6979F8" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    paddingHorizontal: 16,
    paddingBottom: 14,
    overflow: 'hidden',
    zIndex: 1000 // Добавляем высокий z-index для отображения поверх навигации
  },
  swipeIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: 8 // Уменьшаем вертикальный отступ
  },
  swipeIndicator: {
    width: 60,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 2
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  placeNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8
  },
  locationIcon: {
    marginRight: 6
  },
  placeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  distance: {
    fontSize: 16,
    fontWeight: 'bold', // Делаем расстояние жирным
    color: theme.colors.primary,
    marginRight: 4
  },
  expandedContent: {
    marginBottom: 14 // Уменьшаем отступ снизу
  },
  address: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginLeft: 26
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 0
  },
  actionsContainerCollapsed: {
    marginBottom: -10
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    height: 44
  },
  secondaryButton: {
    backgroundColor: '#E8EAFF',
  },
  secondaryText: {
    color: '#5853FC',
  },
  buttonIcon: {
    marginRight: 8
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkButton: {
    minWidth: 44,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.secondary
  },
  shareButton: {
    minWidth: 44,
    paddingHorizontal: 12,
    backgroundColor: '#5c6bc0'
  },
  actionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4
  }
});

export default SelectedPlaceInfo;
