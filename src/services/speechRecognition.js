// u0421u0435u0440u0432u0438u0441 u0434u043bu044f u0440u0430u0441u043fu043eu0437u043du0430u0432u0430u043du0438u044f u0440u0435u0447u0438 u0432 React Native
import { Platform } from 'react-native';

// u041au043bu0430u0441u0441 u0434u043bu044f u0440u0430u0431u043eu0442u044b u0441 u0440u0430u0441u043fu043eu0437u043du0430u0432u0430u043du0438u0435u043c u0440u0435u0447u0438
class SpeechRecognitionService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isAvailable = false;
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onStartCallback = null;
    this.onEndCallback = null;
    this.onPartialResultCallback = null;
    
    // u041fu0440u043eu0432u0435u0440u044fu0435u043c u0434u043eu0441u0442u0443u043fu043du043eu0441u0442u044c API u0440u0430u0441u043fu043eu0437u043du0430u0432u0430u043du0438u044f u0440u0435u0447u0438
    this.checkAvailability();
  }

  // u041fu0440u043eu0432u0435u0440u043au0430 u0434u043eu0441u0442u0443u043fu043du043eu0441u0442u0438 u0440u0430u0441u043fu043eu0437u043du0430u0432u0430u043du0438u044f u0440u0435u0447u0438 u043du0430 u0443u0441u0442u0440u043eu0439u0441u0442u0432u0435
  checkAvailability() {
    // u0412 u0432u0435u0431-u0441u0440u0435u0434u0435 u043cu043eu0436u043du043e u0438u0441u043fu043eu043bu044cu0437u043eu0432u0430u0442u044c Web Speech API
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.SpeechRecognition) {
      this.isAvailable = true;
      return true;
    }
    
    // u0412 u043cu043eu0431u0438u043bu044cu043du044bu0445 u043fu0440u0438u043bu043eu0436u0435u043du0438u044fu0445 u043du0443u0436u043du043e u0438u0441u043fu043eu043bu044cu0437u043eu0430u0442u044c u043du0430u0442u0438u0432u043du044bu0435 u043cu043eu0434u0443u043bu0438
    // u0412 u0440u0435u0430u043bu044cu043du043eu043c u043fu0440u0438u043bu043eu0436u0435u043du0438u0438 u0437u0434u0435u0441u044c u0431u044bu043b0430 u0431u044b u043fu0440u043eu0432u0435u0440u0435u043d u043du0430u043b0438u0447u0438u044f u0438 u0438u043du0438u0446u0438u0430u043bu0438u0437u0430u0446u0438u044f u043du0430u0442u0438u0432u043du044bu0445 u043cu043eu0434u0443u043bu0435u0439
    // u0414u043bu044f u0434u0435u043cu043eu043du0441u0442u0440u0430u0446u0438u0438 u0431u0443u0434u0435u043c u0438u0441u043fu043eu043bu044cu0437u043eu0430u0442u044c u0438u043cu0438u0442u0430u0446u0438u044e
    this.isAvailable = true;
    return true;
  }

  // u0418u043du0438u0446u0438u0430u043bu0438u0437u0430u0446u0438u044f u0440u0430u0441u043fu043eu0437u043du0430u0432u0430u043du0438u044f u0440u0435u0447u0438
  initialize() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'ru-RU'; // u0423u0441u0442u0430u043du0430u0432u043bu0438u0432u0430u0435u043c u0440u0443u0441u0441u043au0438u0439 u044fu0437u044bu043a

        this.recognition.onstart = () => {
          this.isListening = true;
          if (this.onStartCallback) this.onStartCallback();
        };

        this.recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0])
            .map((result) => result.transcript)
            .join('');

          if (event.results[0].isFinal) {
            if (this.onResultCallback) this.onResultCallback(transcript);
          } else {
            if (this.onPartialResultCallback) this.onPartialResultCallback(transcript);
          }
        };

        this.recognition.onerror = (event) => {
          if (this.onErrorCallback) this.onErrorCallback(event.error);
        };

        this.recognition.onend = () => {
          this.isListening = false;
          if (this.onEndCallback) this.onEndCallback();
        };

        return true;
      }
    }
    
    // u0414u043bu044f u043cu043eu0431u0438u043bu044cu043du044bu0445 u043fu043bu0430u0442u0446u043eu0440u043c u0438u0441u043fu043eu043bu044cu0437u0443u0435u043c u0438u043cu0438u0442u0430u0446u0438u044e
    return true;
  }

  // u041du0430u0447u0430u0442u044c u0440u0430u0441u043fu043eu0437u043du0430u0432u0430u043du0438u0435 u0440u0435u0447u0438
  start() {
    if (!this.isAvailable) {
      if (this.onErrorCallback) {
        this.onErrorCallback('u0420u0430u0441u043fu043eu0437u043du0430u0432u0430u043du0438u0435 u0440u0435u0447u0438 u043du0435u0434u043eu0441u0442u0443u043fu043du043e u043du0430 u044du0442u043eu043c u0443u0441u0442u0440u043eu0439u0441u0442u0432u0435');
      }
      return false;
    }

    if (Platform.OS === 'web' && this.recognition) {
      this.recognition.start();
      return true;
    }

    // u0418u043cu0438u0442u0430u0446u0438u044f u0440u0430u0441u043fu043eu0437u043du0430u0432u0430u043du0438u044f u0440u0435u0447u0438 u0434u043bu044f u0434u0435u043cu043eu043du0441u0442u0440u0430u0446u0438u0438
    this.isListening = true;
    if (this.onStartCallback) this.onStartCallback();

    // u0418u043cu0438u0442u0438u0440u0443u0435u043c u043fu0440u043eu0446u0435u0441u0441 u0440u0430u0441u043fu043eu0437u043du0430u0432u0430u043du0438u044f u0441 u043fu043eu0441u0442u0435u043fu0435u043du043du044bu043c u043fu043eu044fu0444u043eu043bu044cu0435u043du0438u0435u043c u0442u0435u043au0441u0442u0430
    this.simulateVoiceRecognition();
    
    return true;
  }

  // u041eu0441u0442u0430u043du043eu0432u0438u0442u044c u0440u0430u0441u043fu043eu0437u043du0430u0432u0430u043du0438u0435 u0440u0435u0447u0438
  stop() {
    if (Platform.OS === 'web' && this.recognition) {
      this.recognition.stop();
    }

    // u0414u043bu044f u0438u043cu0438u0442u0430u0446u0438u0438
    this.isListening = false;
    if (this.onEndCallback) this.onEndCallback();
    
    // u041eu0441u0442u0430u043du0430u0432u043bu0438u0432u0430u0435u043c u0432u0441u0435 u0442u0430u0439u043cu0435u0440u044b
    if (this.recognitionInterval) {
      clearInterval(this.recognitionInterval);
      this.recognitionInterval = null;
    }
    
    return true;
  }

  // u0418u043cu0438u0442u0430u0446u0438u044f u0440u0430u0441u043fu043eu0437u043du0430u0432u0430u043du0438u044f u0440u0435u0447u0438 u0434u043bu044f u0434u0435u043cu043eu043du0441u0442u0440u0430u0446u0438u0438
  simulateVoiceRecognition() {
    // u041du0430u0431u043eu0440 u0432u043eu0437u043cu043eu0436u043du044bu0445 u0444u0440u0430u0437 u0434u043bu044f u0438u043cu0438u0442u0430u0446u0438u0438
    const possiblePhrases = [
      'Малая Яковлевская улица',
      'Пионерский переулок',
      'Васильевская улица',
      'Подольский переулок',
      'Кафе у Петровича',
      'Магазин продукты',
      'Ближайшая аптека',
      'Парк Горького',
      'Метро Технологический институт',
      'Московский вокзал'
    ];
    
    // u0412u044bu0431u0438u0440u0430u0435u043c u0441u043bu0443u0447u0430u0439u043du0443u044u u0444u0440u0430u0437u0443
    const selectedPhrase = possiblePhrases[Math.floor(Math.random() * possiblePhrases.length)];
    
    // u0420u0430u0437u0431u0438u0432u0430u0435u043c u0444u0440u0430u0437u0443 u043du0430 u0447u0430u0441u0442u0438 u0434u043bu044f u043fu043eu0441u0442u0435u043fu0435u043du043du043eu0433u043e u0440u0430u0441u043fu043eu0437u043du0430u0432u0430u043du0438u044f
    const parts = [];
    for (let i = 1; i <= selectedPhrase.length; i++) {
      parts.push(selectedPhrase.substring(0, i));
    }
    
    let index = 0;
    this.recognitionInterval = setInterval(() => {
      if (!this.isListening) {
        clearInterval(this.recognitionInterval);
        return;
      }
      
      if (index < parts.length) {
        const currentText = parts[index];
        if (this.onPartialResultCallback) this.onPartialResultCallback(currentText);
        index++;
      } else {
        // u0417u0430u0432u0435u0440u0448u0430u0435u043c u0440u0430u0441u043fu043eu0437u043du0430u0432u0430u043du0438u0435
        if (this.onResultCallback) this.onResultCallback(selectedPhrase);
        clearInterval(this.recognitionInterval);
        this.isListening = false;
        if (this.onEndCallback) this.onEndCallback();
      }
    }, 100); // u0418u043du0442u0435u0440u0432u0430u043b u043cu0435u0436u0434u0443 u043eu0431u043du043eu0432u043bu0435u043du0438u044fu043cu0438 u0442u0435u043au0441u0442u0430
  }

  // u0423u0441u0442u0430u043du043eu0438u0442u0435 u043eu0431u0440u0430u0431u043eu0442u0447u0438u043a u0434u043bu044f u0440u0435u0437u0443u043bu044cu0442u0430u0442u043eu0432 u0440u0430u0441u043fu043eu0437u043du0430u0432u0430u043du0438u044f
  onResult(callback) {
    this.onResultCallback = callback;
  }

  // u0423u0441u0442u0430u043du043eu0438u0442u0435 u043eu0431u0440u0430u0431u043eu0442u0447u0438u043a u0434u043bu044f u043fu0440u043eu043cu0435u0436u0443u0442u043eu0447u043du044bu0445 u0440u0435u0437u0443u043bu044cu0442u0430u0442u043eu0432
  onPartialResult(callback) {
    this.onPartialResultCallback = callback;
  }

  // u0423u0441u0442u0430u043du043eu0438u0442u0435 u043eu0431u0440u0430u0431u043eu0442u0447u0438u043a u0434u043bu044f u043eu0448u0438u0431u043eu043a
  onError(callback) {
    this.onErrorCallback = callback;
  }

  // u0423u0441u0442u0430u043du043eu0438u0442u0435 u043eu0431u0440u0430u0431u043eu0442u0447u0438u043a u0434u043bu044f u043du0430u0447u0430u043bu0430 u0440u0430u0441u043fu043eu0437u043du0430u0432u0430u043du0438u044f
  onStart(callback) {
    this.onStartCallback = callback;
  }

  // u0423u0441u0442u0430u043du043eu0438u0442u0435 u043eu0431u0440u0430u0431u043eu0442u0447u0438u043a u0434u043bu044f u0437u0430u0432u0435u0440u0448u0435u043du0438u044f u0440u0430u0441u043fu043eu0437u043du0430u0432u0430u043du0438u044f
  onEnd(callback) {
    this.onEndCallback = callback;
  }
}

// u0421u043eu0437u0434u0430u0435u043c u0440u0435u0437u0435u0440u0432 u0441u0435u0440u0432u0438u0441u0430
const speechRecognition = new SpeechRecognitionService();

export default speechRecognition;
