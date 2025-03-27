import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Switch, ScrollView, Image } from 'react-native';
import { observer } from 'mobx-react';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useStore } from '../stores/StoreContext';

const ProfileScreen = observer(() => {
  const store = useStore();
  const { userStore, settingsStore } = store;
  
  // Демонстрационные данные
  const [isNotificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [isLocationTrackingEnabled, setLocationTrackingEnabled] = React.useState(true);
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [isPremium, setIsPremium] = React.useState(false);
  
  const toggleNotifications = () => {
    setNotificationsEnabled(prev => !prev);
  };
  
  const toggleLocationTracking = () => {
    setLocationTrackingEnabled(prev => !prev);
  };
  
  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };
  
  const handleUpgradeToPremium = () => {
    console.log('Нажата кнопка перехода на премиум');
  };
  
  const handleLogout = () => {
    console.log('Нажата кнопка выхода');
  };
  
  return (
    <ScrollView style={styles.container}>
      {/* Профиль пользователя */}
      <View style={styles.profileHeader}>
        <View style={styles.profileImageContainer}>
          <Image 
            source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
            style={styles.profileImage} 
          />
          <TouchableOpacity style={styles.editProfileButton}>
            <Ionicons name="pencil" size={18} color={theme.colors.textLight} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>Александр Иванов</Text>
          <Text style={styles.userEmail}>alexander@example.com</Text>
          
          <View style={styles.userStatus}>
            <Ionicons 
              name={isPremium ? 'star' : 'star-outline'} 
              size={16} 
              color={isPremium ? theme.colors.accent : theme.colors.textSecondary} 
            />
            <Text style={[styles.userStatusText, isPremium && styles.premiumText]}>
              {isPremium ? 'Премиум пользователь' : 'Бесплатная учетная запись'}
            </Text>
          </View>
        </View>
      </View>
      
      {!isPremium && (
        <TouchableOpacity style={styles.premiumBanner} onPress={handleUpgradeToPremium}>
          <View style={styles.premiumContent}>
            <Ionicons name="star" size={24} color={theme.colors.textLight} />
            <View style={styles.premiumTextContainer}>
              <Text style={styles.premiumTitle}>Перейдите на премиум</Text>
              <Text style={styles.premiumDescription}>Без рекламы, больше функций, без ограничений</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.colors.textLight} />
        </TouchableOpacity>
      )}
      
      {/* Настройки */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Настройки</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications" size={24} color={theme.colors.textPrimary} />
            <Text style={styles.settingLabel}>Уведомления</Text>
          </View>
          <Switch
            value={isNotificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: theme.colors.textTertiary, true: theme.colors.primary }}
            thumbColor={theme.colors.textLight}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="location" size={24} color={theme.colors.textPrimary} />
            <Text style={styles.settingLabel}>Отслеживание местоположения</Text>
          </View>
          <Switch
            value={isLocationTrackingEnabled}
            onValueChange={toggleLocationTracking}
            trackColor={{ false: theme.colors.textTertiary, true: theme.colors.primary }}
            thumbColor={theme.colors.textLight}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="moon" size={24} color={theme.colors.textPrimary} />
            <Text style={styles.settingLabel}>Темная тема</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: theme.colors.textTertiary, true: theme.colors.primary }}
            thumbColor={theme.colors.textLight}
          />
        </View>
      </View>
      
      {/* Поддержка */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Поддержка</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemContent}>
            <Ionicons name="help-circle" size={24} color={theme.colors.textPrimary} />
            <Text style={styles.menuItemLabel}>Часто задаваемые вопросы</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemContent}>
            <Ionicons name="mail" size={24} color={theme.colors.textPrimary} />
            <Text style={styles.menuItemLabel}>Связь с нами</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemContent}>
            <Ionicons name="document-text" size={24} color={theme.colors.textPrimary} />
            <Text style={styles.menuItemLabel}>Политика конфиденциальности</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      {/* Кнопка выхода */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out" size={20} color={theme.colors.error} />
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </TouchableOpacity>
      
      <View style={styles.version}>
        <Text style={styles.versionText}>MapEase v1.0.0</Text>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.m,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.l,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: theme.spacing.m,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  editProfileButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    ...theme.typography.textSubheader,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    ...theme.typography.textBody,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.s,
  },
  userStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userStatusText: {
    ...theme.typography.textSmall,
    color: theme.colors.textSecondary,
    marginLeft: 5,
  },
  premiumText: {
    color: theme.colors.accent,
    fontWeight: 'bold',
  },
  premiumBanner: {
    backgroundColor: theme.colors.accent,
    margin: theme.spacing.m,
    marginTop: 0,
    borderRadius: theme.spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.m,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  premiumTextContainer: {
    marginLeft: theme.spacing.s,
    flex: 1,
  },
  premiumTitle: {
    ...theme.typography.textBody,
    fontWeight: 'bold',
    color: theme.colors.textLight,
    marginBottom: 2,
  },
  premiumDescription: {
    ...theme.typography.textSmall,
    color: theme.colors.textLight,
    opacity: 0.9,
  },
  section: {
    margin: theme.spacing.m,
    marginTop: theme.spacing.l,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.spacing.s,
    overflow: 'hidden',
  },
  sectionTitle: {
    ...theme.typography.textBody,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    padding: theme.spacing.m,
    paddingBottom: theme.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    ...theme.typography.textBody,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.m,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemLabel: {
    ...theme.typography.textBody,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.m,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: theme.spacing.m,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.m,
    backgroundColor: theme.colors.errorLight,
    borderRadius: theme.spacing.s,
  },
  logoutText: {
    ...theme.typography.textBody,
    color: theme.colors.error,
    fontWeight: 'bold',
    marginLeft: theme.spacing.s,
  },
  version: {
    alignItems: 'center',
    padding: theme.spacing.m,
    paddingBottom: theme.spacing.xl,
  },
  versionText: {
    ...theme.typography.textSmall,
    color: theme.colors.textTertiary,
  },
});

export default ProfileScreen;
