# ✨ Jammify Features

Jammify is a premium, feature-rich music streaming platform designed for discovery, personalization, and a superior listening experience. Built with a modern tech stack, it offers a seamless blend of aesthetics and functionality.

---

## 🎧 Core Music Experience
- **High-Fidelity Streaming**: Stream over 50 million songs in high-quality (up to 320kbps) audio directly in your browser.
- **Advanced Music Player**: A comprehensive player with full playback control, volume management, shuffle/repeat modes, and real-time progress tracking.
- **Dynamic Backgrounds**: Experience an immersive interface with ambient background gradients that adapt to the color palette of the current track's artwork.
- **Queue Management**: Easily manage your upcoming tracks with an interactive play queue.

## 📻 Radio & Global Discovery
- **Global Radio Station Finder**: Explore and play over 30,000 radio stations from across the globe.
- **Interactive World Map**: Browse radio stations geographically using a fully interactive map view powered by Leaflet.
- **Filtered Exploration**: Discover stations by country, language, or genre (Rock, Pop, Jazz, News, etc.).

## 🔍 Discovery & Smart Search
- **Intelligent Search**: Find any song, artist, or album instantly with search powered by fuzzy matching and natural language processing.
- **Lyrics-Based Search**: Can't remember the title? Search for a song using its lyrics—even if they're slightly misspelled.
- **Smart Discovery**: Curated sections for:
  - **New Releases**: Stay updated with the latest tracks.
  - **Trending Playlists**: What the world is listening to right now.
  - **Top Hits**: International and regional chart-toppers.
  - **English Top**: The best of global music.

## 📚 Personal Library
- **Custom Playlists**: Create, rename, and manage your own music collections.
- **Favorites & Likes**: Save your "Liked Songs," "Favorite Albums," and "Followed Artists" for quick access.
- **Listening History**: Automatically tracks your recently played playlists and songs so you never lose a track.
- **Spotify Importer**: Seamlessly migrate your favorite Spotify playlists directly into Jammify.

## 📱 Platform & Performance
- **PWA Support**: Install Jammify as a Progressive Web App on your mobile device or desktop for a native-like experience.
- **Fully Responsive**: Optimized for every screen size, from large 2K/4K monitors to the latest smartphones.
- **Cloud Sync**: All your preferences, favorites, and playlists are synced across devices via MongoDB.
- **Optimized Performance**: Next.js 16 and React 19 ensure lightning-fast page transitions and minimal load times.

## 🔐 Security & Privacy
- **Secure Authentication**: Robust user authentication using NextAuth.js with MongoDB and JWT support.
- **Account Management**: Self-service signup, email verification, and password reset functionality.
- **Data Privacy**: Your listening data is secured and used only to personalize your experience.

---

## 🛠️ Built With
- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Frontend**: [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/), [Lucide Icons](https://lucide.dev/)
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Search Engines**: [Fuse.js](https://fusejs.io/), [Natural.js](https://github.com/NaturalNode/natural)
- **APIs**: JioSaavn API, Genius API, ytmusic-api
- **Maps**: [Leaflet](https://leafletjs.com/) for Radio exploration
