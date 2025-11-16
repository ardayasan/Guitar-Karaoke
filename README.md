# SmartTab - Guitar Karaoke 🎸

**Real-Time Guitar Practice Assistant**

Graduation Project - Arda Yasan and Burak Kuruçay

## Overview

SmartTab is an iOS mobile application that revolutionizes guitar practice by providing real-time audio feedback. The app listens to your guitar playing through your iPhone's microphone, detects the notes you're playing, compares them with tablature, and provides instant visual feedback on accuracy.

### Key Features

- 🎵 **Real-time Pitch Detection**: Advanced YIN algorithm for accurate note detection
- 🎸 **Tablature Display**: Synchronized tab scrolling and highlighting
- ✅ **Instant Feedback**: Visual indicators (green/red) for correct/incorrect notes
- 📊 **Practice Statistics**: Track accuracy, streaks, and improvement over time
- 🎯 **Smart Accuracy Scoring**: Real-time calculation of playing accuracy
- 📱 **Native iOS Experience**: Built with React Native and Expo

## Technology Stack

### Core Framework
- **React Native** v0.73+ with **Expo** SDK v50+
- **TypeScript** for type safety and better developer experience
- **React Navigation** for screen navigation

### Audio Processing
- **expo-av**: Microphone input and audio capture
- **Custom FFT Implementation**: Real-time frequency analysis
- **YIN Algorithm**: Fundamental frequency estimation optimized for guitar

### UI/UX
- **React Native Paper**: Material Design components
- **Custom Theme**: Consistent branding and user experience

### State Management
- **Zustand**: Lightweight state management for practice sessions and library

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Shared components
│   ├── practice/       # Practice screen components
│   ├── library/        # Library screen components
│   └── settings/       # Settings screen components
├── navigation/         # Navigation configuration
│   ├── AppNavigator.tsx
│   └── types.ts
├── screens/           # Main app screens
│   ├── home/          # Home screen
│   ├── library/       # Tab library
│   ├── practice/      # Practice mode
│   └── settings/      # App settings
├── services/          # Business logic services
│   ├── audio/         # Audio recording service
│   ├── pitch/         # Pitch detection service
│   └── tablature/     # Tab parsing (future)
├── store/            # Zustand state stores
│   ├── practiceStore.ts
│   └── libraryStore.ts
├── types/            # TypeScript type definitions
│   ├── music.ts      # Music theory types
│   └── tablature.ts  # Tab-related types
└── utils/            # Utility functions
    ├── audio/        # FFT, YIN algorithm
    └── music/        # Note conversions, theory
```

## Installation & Setup

### Prerequisites

- **Node.js** v18+ and npm
- **Expo CLI**: `npm install -g expo-cli`
- **Xcode** 14.0+ (for iOS development)
- **Physical iPhone** with iOS 13.0+ (audio processing requires real device)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/ardayasan/GuitarKaraoke.git
   cd GuitarKaraoke
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   # or
   expo start
   ```

4. **Run on iOS**
   ```bash
   npm run ios
   # or press 'i' in the Expo CLI
   ```

5. **Build for iOS device**
   ```bash
   eas build --platform ios --profile development
   ```

## Development

### Running the App

```bash
# Start development server
npm start

# Run on iOS (requires Xcode)
npm run ios

# Run on Android (requires Android Studio)
npm run android

# Run on web (limited audio functionality)
npm run web
```

### Testing Audio Features

**Important**: Audio processing features require a physical device. The iOS Simulator cannot access the microphone or perform real-time audio analysis.

1. Install on physical iPhone using Expo Go or development build
2. Grant microphone permissions when prompted
3. Use a tuned acoustic or electric guitar
4. Test in a quiet environment for best results

## Architecture

### Audio Processing Pipeline

```
Microphone Input
    ↓
AudioRecordingService (expo-av)
    ↓
Audio Samples (Float32Array)
    ↓
FFT Analysis + Windowing
    ↓
YIN Pitch Detection
    ↓
Frequency → MIDI Note Conversion
    ↓
Note Comparison with Tablature
    ↓
Visual Feedback (Green/Red)
```

### YIN Algorithm Implementation

The app uses the YIN algorithm for pitch detection, specifically designed for musical applications:

- **Accuracy**: >85% for single notes across all frets
- **Latency**: <100ms from input to feedback
- **Frequency Range**: 82.41 Hz (E2) to 1318.51 Hz (E6)
- **Buffer Size**: 2048 samples (~46ms at 44.1kHz)

### State Management

- **Practice Store**: Session state, detections, statistics
- **Library Store**: Tab library, current song, filters

## Current Implementation Status

### ✅ Completed Features

- [x] Project setup with Expo and TypeScript
- [x] Core audio processing (FFT, YIN algorithm)
- [x] Pitch detection service with smoothing
- [x] Note/frequency conversion utilities
- [x] Navigation structure (Home, Library, Practice, Settings)
- [x] UI layouts with React Native Paper
- [x] State management with Zustand
- [x] iOS microphone permissions

### 🚧 In Progress

- [ ] AlphaTab.js integration for tablature rendering
- [ ] Real-time note comparison and feedback system
- [ ] Tab file import and parsing

### 📋 Planned Features

- [ ] Chord recognition (15 common chords)
- [ ] Practice session history
- [ ] Progress tracking over time
- [ ] Tempo control and metronome
- [ ] Loop sections for practice
- [ ] Multiple tuning support
- [ ] Backing track integration

## Performance Targets

- **Pitch Detection Accuracy**: ≥85% on individual notes
- **Chord Recognition**: ≥80% for 15 common chords
- **Latency**: ≤100ms from audio input to visual feedback
- **Note Recognition Rate**: ≥90% for simple melodies (80-120 BPM)
- **Error Detection**: ≥90% accuracy in flagging wrong notes

## Known Limitations

1. **Device Requirements**: Requires physical iOS device (no simulator support)
2. **Monophonic Detection**: Current implementation optimized for single notes
3. **Chord Recognition**: Limited to 15 most common chords initially
4. **Tab Format**: Limited tab format support (to be expanded)
5. **Audio Quality**: Requires quiet environment for best accuracy

## Future Enhancements

### Phase 1 (Current)
- Complete basic pitch detection and feedback
- Implement tablature display
- Tab library management

### Phase 2
- Chord recognition
- Advanced feedback modes
- Practice history and analytics

### Phase 3
- Social features (sharing progress)
- Cloud sync for tabs and progress
- AI-powered practice recommendations
- Custom exercises generator

## Contributing

This is a graduation project, but contributions and feedback are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Microphone Permission Issues
- Check Settings → SmartTab → Microphone is enabled
- Restart the app after granting permissions

### Poor Pitch Detection
- Ensure guitar is properly tuned
- Reduce background noise
- Adjust sensitivity in Settings
- Try different picking/strumming techniques

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
expo start --clear
```

## License

This project is part of a graduation project. All rights reserved.

## Authors

- **Arda Yasan** - [GitHub](https://github.com/ardayasan)
- **Burak Kuruçay**

## Acknowledgments

- YIN algorithm by Alain de Cheveigné and Hideki Kawahara
- AlphaTab project for tablature rendering
- Expo and React Native communities

## Contact

For questions or feedback, please open an issue on GitHub.

---

**Made with ❤️ for guitar learners everywhere**
