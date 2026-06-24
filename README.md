# Musik Studio Lite

**Web-based Digital Audio Workstation (DAW)** untuk music production yang lightweight, accessible, dan open source.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Web Audio API](https://img.shields.io/badge/Built%20with-Web%20Audio%20API-blue)](https://www.w3.org/TR/webaudio/)
[![Mobile Friendly](https://img.shields.io/badge/Mobile-Friendly-green)](https://responsive.is/)

## 🎵 Why Musik Studio Lite?

Professional music production tools are expensive and resource-heavy. **Musik Studio Lite** democratizes audio creation for musicians, producers, and hobbyists—especially in regions where premium DAWs are financially inaccessible.

This is an **open-source, browser-based solution** that requires zero installation and works on any device with a modern web browser.

---

## ✨ Features

### Core Recording & Playback
- 🎚️ **Multi-track Recording** - 7+ default tracks (Drum, Piano, Guitar, Bass, Vocal, FX, MIDI) + unlimited custom tracks
- ▶️ **Real-time Playback** - Synchronized playback across all tracks
- 🎼 **Timeline Editor** - Visual step sequencer with drag-and-drop pattern editing
- 🔁 **Loop Area** - Mark point A→B and loop any section of your song
- 📊 **Master Meter & Volume Control** - Real-time level monitoring

### Audio Synthesis & Instruments
- 🥁 **Drum Pad** - 16 drum sounds with WAV asset fallback + synth generation
- 🎹 **Piano** - Octaves C4 to D6 with synthetic sound synthesis
- 🎸 **Guitar** - Plucked string simulation with realistic timbre
- 🎸 **Bass** - Deep low-frequency synth for bass lines
- ✨ **FX Panel** - Effects processing and sound manipulation
- 🎤 **Vocal Track** - Dedicated vocal recording and effects

### Pattern & Project Management
- 💾 **Save/Load Patterns** - Store reusable patterns and recall instantly
- 📁 **Project Persistence** - Save entire projects to localStorage
- 📦 **Import Audio** - Load MP3/WAV files from your device into tracks
- 📤 **Export WAV** - Render final mix to professional WAV format (via OfflineAudioContext)
- 📝 **Auto Record** - Automatic note capture as you tap pads

### Advanced Features
- 🎼 **MIDI Support** - Import .mid/.midi files and sync with tracks
- 📌 **Markers** - Add markers for song sections (intro, chorus, bridge, outro)
- 🎚️ **Master Recording** - Capture master output in real-time
- 🔊 **BPM Control** - Adjust tempo from 40–300 BPM
- 🎨 **Dark Purple Theme** - Eye-friendly UI optimized for long sessions

---

## 🚀 Live Demo

**[Try Musik Studio Lite Now](https://akipdavid8-cpu.github.io/Musik-studio-mini/)**

*Note: Best experienced on mobile or tablet devices.*

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **Audio**: Web Audio API (oscillators, gain nodes, filters, offline context)
- **UI Framework**: Pure HTML5 + CSS3
- **Data Persistence**: Browser localStorage + IndexedDB (planned)
- **Build**: No build step required (works directly in browser)
- **Deployment**: GitHub Pages / Static hosting

---

## 📦 Project Structure

```
Musik-Studio-Lite/
├── index.html          # Main app structure & panel definitions
├── style.css           # Dark theme styling, responsive layout
├── script.js           # Audio synthesis, timeline logic, recording/export
├── lame.min.js         # MP3 encoding library (for future features)
├── README.md           # This file
└── docs/               # (Planned) Detailed documentation
```

---

## 🎯 Roadmap

### Phase 1: Web Completeness (Current)
- [x] Multi-track timeline editor
- [x] Audio synthesis (Piano, Guitar, Bass, Drums)
- [x] Pattern save/load
- [x] Audio import (MP3/WAV)
- [x] WAV export
- [ ] Improved UI for large screens (desktop responsiveness)
- [ ] Better audio visualization (waveform display refinement)

### Phase 2: Mobile APK (In Progress)
- [ ] Capacitor integration for Android APK
- [ ] Native file system access
- [ ] App store distribution
- [ ] Offline-first architecture

### Phase 3: Advanced Audio
- [ ] VST/AU plugin support
- [ ] Real-time EQ & compression
- [ ] MIDI keyboard input
- [ ] Cloud sync (optional)

### Phase 4: Community & Scale
- [ ] Collaborative editing (multi-user sessions)
- [ ] Sample library sharing
- [ ] Community remix features
- [ ] Accessibility improvements (screen reader support)

---

## 🔧 Installation & Usage

### Option 1: Use Online (No Installation)
Simply visit: **[Musik Studio Lite](https://akipdavid8-cpu.github.io/Musik-studio-mini/)**

### Option 2: Run Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/akipdavid8-cpu/Musik-Studio-Lite.git
   cd Musik-Studio-Lite
   ```

2. **Serve via local HTTP server** (required for Web Audio API)
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js http-server
   npx http-server -p 8000
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

### Option 3: Deploy Your Own Copy
- Fork this repository
- Enable GitHub Pages in settings
- Deploy your own instance at `https://YOUR_USERNAME.github.io/Musik-Studio-Lite/`

---

## 💡 Quick Start Guide

### Record Your First Beat

1. **Open Drum Pad** → Tap drum sounds to trigger
2. **Open Timeline Editor** → Click "Play" to start recording
3. **Auto Record Active** → Your pad taps appear as notes in the timeline
4. **Add Piano** → Open Piano Pad, play a melody alongside
5. **Export** → Hit Export Panel → Render to WAV

### Create a Loop

1. Open **Timeline Editor**
2. Click **"🅰 Set A"** at your loop start point
3. Click **"🅱 Set B"** at your loop end point
4. Click **"▶ Play Loop"** to hear the section repeat
5. Build your arrangement around this loop

---

## 🤝 Contributing

We welcome contributions from the community! Whether it's bug fixes, feature ideas, or documentation improvements:

1. **Fork** this repository
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to your branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Areas We Need Help With
- 🎨 UI/UX improvements (especially desktop responsiveness)
- 🔊 Audio quality enhancements
- 📱 Mobile optimization
- 🧪 Bug testing and reporting
- 📚 Documentation & tutorials
- 🌍 Internationalization (i18n support)

---

## 📋 Known Limitations & Issues

- **Browser Support**: Requires modern browsers with Web Audio API support (Chrome 25+, Firefox 30+, Safari 14+, Edge 79+)
- **Audio Latency**: Slight delay on some Android devices
- **localStorage Limit**: Projects >5MB may fail to save on some browsers
- **MIDI Import**: Currently read-only; editing MIDI events coming soon
- **Desktop UI**: Optimized for mobile; desktop version in progress

---

## 🐛 Bug Reports & Feature Requests

Found a bug or have an idea? 

- **Issues**: [Open an issue](https://github.com/akipdavid8-cpu/Musik-Studio-Lite/issues)
- **Discussions**: [Start a discussion](https://github.com/akipdavid8-cpu/Musik-Studio-Lite/discussions)
- **Email**: Contact maintainer via GitHub profile

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

In summary: You're free to use, modify, and distribute this software for personal or commercial projects, as long as you include the original license and copyright notice.

---

## 🙏 Acknowledgments

- **Web Audio API Documentation** - W3C and MDN
- **Open Source Community** - For inspiration and feedback
- **Indonesia's Music Community** - For drive and motivation

---

## 📞 Support

Have questions? Here are some resources:

- 📖 **Wiki** (coming soon) - Detailed tutorials and guides
- 💬 **GitHub Discussions** - Ask community members
- 🐦 **Twitter/X** - Follow for updates: [@akipdavid8_cpu](https://twitter.com/akipdavid8_cpu)

---

## 🌍 Why This Matters

In Indonesia and developing regions, access to professional music production tools is limited by cost and hardware requirements. **Musik Studio Lite** removes these barriers:

- **Free & Open Source** → No licensing costs
- **Browser-Based** → Works on any device
- **Lightweight** → ~50KB of assets (excluding dependencies)
- **Accessible** → Designed for creators at all skill levels
- **Community-Driven** → Improvements come from users like you

This is more than an app—it's an ecosystem for musicians to create, share, and collaborate without financial gatekeeping.

---

## 🚀 Status

**Current Version**: 1.0.0 (Beta)  
**Last Updated**: June 2026  
**Active Development**: Yes

---

## 📊 Stats

- **Lines of Code**: ~4000+ (HTML + CSS + JS)
- **Features**: 15+
- **Default Tracks**: 7
- **Supported Audio Formats**: MP3, WAV, OGG (import); WAV (export)
- **Deployment**: GitHub Pages + Can be self-hosted

---

**Made with ❤️ for creators everywhere.**
