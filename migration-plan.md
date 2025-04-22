# План миграции MapEase с Google Maps на Leaflet+WebView

## Анализ проекта

### Текущая карта и зависимости
- Приложение использует `react-native-maps` с `PROVIDER_GOOGLE` в файле `MapView.js`
- Уже существует компонент `OSMMapView.js`, который использует WebView с Leaflet
- Основной импорт происходит через индексный файл `components/map/index.js`, который сейчас экспортирует `MapView.js`
- Маршруты строятся с помощью `react-native-maps-directions` (Google API)
- Зависимости, связанные с Google: `react-native-maps`, `react-native-maps-directions`

### Архитектура приложения
- Архитектура MobX для управления состоянием
- Слой хуков: useLocation, useSearch, useRouting, useMapControls
- Точка входа в карту: `MapScreen.js` импортирует из `components/map/index.js`
- Компоненты для маршрутов: RouteDirections, FixedRouteDirections, RouteBottomPanel

## Дорожная карта

### Шаг 1: Подготовка OSMMapView и API интерфейса
- [x] Проверить и обновить `OSMMapView.js` для полного соответствия API `MapView.js`
- [x] Убедиться, что все методы и пропсы совпадают (animateToRegion, fitToCoordinates, onRegionChange, и т.д.)
- [x] Обновить версию Leaflet в HTML-шаблоне до последней (текущая 1.7.1, последняя 1.9.4)

### Шаг 2: Замена основного компонента карты
- [x] Изменить `index.js` для экспорта `OSMMapView` вместо `MapView`
- [x] Проверить совместимость с SafeMapWrapper

### Шаг 3: Маршрутизация и направления
- [x] Созданы новые компоненты маршрутизации:
  - [x] `LeafletRouteDirections.js` - аналог RouteDirections для WebView
  - [x] `LeafletFixedRouteDirections.js` - аналог FixedRouteDirections для WebView
  - [x] `RouteAdapter.js` - адаптер для выбора правильного компонента
- [x] Добавлен код Leaflet для построения маршрутов в OSMMapView через API OSRM
- [x] Интегрировать с существующим хуком useRouting (нужно добавить проверку типа карты)
- [x] Адаптировать RouteBottomPanel для работы с новым провайдером маршрутов

### Шаг 4: Маркеры и взаимодействие с картой
- [x] Обновить отображение маркеров пользователя, мест, маршрутов через Leaflet API
- [x] Создать адаптер для маркеров: 
  - [x] `LeafletSelectedPlaceMarker.js` - аналог SelectedPlaceMarker для WebView
  - [x] `LeafletRouteMarkers.js` - аналог RouteMarkers для WebView
  - [x] `MarkerAdapter.js` - адаптер для выбора правильного компонента
- [x] Добавить обработку сообщений между React Native и WebView для маркеров
- [x] Интегрировать маркеры в MapScreen.js
- [x] Реализовать обработчики событий клика, перемещения карты через postMessage API
- [x] Адаптировать SelectedPlaceMarker и SelectedPlaceInfo

### Шаг 5: Кастомные взаимодействия
- [x] Реализовать поиск и отображение результатов через Leaflet
  - [x] Добавлена функция `showSearchResults` в HTML-шаблон
  - [x] Добавлены методы для API компонента (showSearchResults, clearSearchResults)
  - [x] Настроено обработку кликов по результатам поиска
- [ ] Перенести функциональность отображения пробок на Leaflet (если требуется)
- [ ] Настроить сохранение избранных мест и их отображение

### Шаг 6: Удаление зависимостей Google
- [x] Удалить `react-native-maps` и `react-native-maps-directions` из package.json
- [x] Удалить ключи Google API из app.json и других конфигураций
- [x] Очистить неиспользуемый код, связанный с Google Maps
  - [x] Адаптирован компонент SelectedPlaceMarker
  - [x] Адаптирован компонент RouteMarkers

### Шаг 7: Тестирование и отладка
- [ ] Протестировать все основные функции:
  - [ ] Загрузка карты и правильное отображение OSM
  - [ ] Отображение маркеров на карте
  - [ ] Установка маркера при клике на карту
  - [ ] Поиск и отображение результатов
  - [ ] Построение маршрута и отображение направлений
  - [ ] Переключение типов маршрута
- [ ] Исправить выявленные ошибки:
  - [ ] Проблемы с отображением маркеров на Android
  - [ ] Проблемы с построением маршрутов (setIsRouting/setIsRoutingActive)
  - [ ] Проблемы с переключением типов маршрутов (activeTab)
  - [ ] Проблемы с работой хука useStores в iOS
  - [ ] Проблемы с глобальным объектом window в Androidе с UI
- [ ] Проверить производительность WebView решения

## Детали реализации по файлам

### src/components/map/index.js
```js
// Было
import MapViewComponent from './MapView';
// Станет
import MapViewComponent from './OSMMapView';
```

### src/components/map/OSMMapView.js
- Убедиться, что все методы из `MapView.js` реализованы
- Обновить Leaflet до 1.9.4
- Добавить плагины для маршрутизации

### src/hooks/useRouting.js
- Адаптировать для OSRM или другого OSM-провайдера маршрутов

### src/components/map/RouteDirections.js и FixedRouteDirections.js
- Полностью переписать для работы с WebView и Leaflet

### src/screens/MapScreen.js
- Проверить совместимость с новым компонентом карты

## Потенциальные проблемы

1. Производительность WebView может быть ниже нативного решения
2. Потеря некоторых нативных жестов и взаимодействий
3. Несоответствие API между react-native-maps и Leaflet
4. Ограничения публичных сервисов маршрутизации OSM

## Решения

1. Оптимизация Leaflet карты для мобильных устройств
2. Кастомные обработчики событий через postMessage
3. Создание совместимого API-адаптера
4. Настройка кеширования маршрутов

Действую последовательно по плану, шаг за шагом, чтобы не упустить никаких деталей.
