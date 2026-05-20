<div align="center">

<img src="https://i.postimg.cc/WbpSYHsp/extension-icon-(1).png" alt="Jammify Logo" width="80" />

# **Jammify**
### 🎶 Stream Music with Style

**A modern music streaming web application built for learning and experimentation**

⚠️ **Educational Disclaimer**  
Jammify is a non-commercial, educational project created to demonstrate modern full-stack web development techniques.  
It is **not affiliated with or endorsed by any music provider**.

---

[![Next.js](https://img.shields.io/badge/Next.js%2016-%23000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React%2019-%232563EB?style=for-the-badge&logo=react)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-%2347A248?style=for-the-badge&logo=mongodb)](https://mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-%23880000?style=for-the-badge&logo=mongoose)](https://mongoosejs.com/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind%20CSS%20v4-%2306B6D4?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer%20Motion-%230055FF?style=for-the-badge&logo=framer)](https://motion.dev/)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-%23000000?style=for-the-badge&logo=shadcnui)](https://ui.shadcn.com/)

---

[🚀 Live Demo](https://jammify-music.vercel.app/) •
[💻 Source Code](https://github.com/shreejaybhay/jammify) •
[📧 Contact](mailto:shreejaybhay26@gmail.com)

</div>

---

## ✨ About

**Jammify** is a feature-rich music streaming platform built with Next.js 16, React 19, and MongoDB. It demonstrates modern full-stack development with:

- **Next.js App Router** with route groups, layouts, and dynamic routes
- **NextAuth.js** with JWT sessions and OAuth (Google, GitHub)
- **shadcn/ui** component library built on **Radix UI** primitives
- **Tailwind CSS v4** with inline `@theme` configuration
- **70+ theme variants** (dark/light pairs)
- **Fuzzy search** using Fuse.js, Levenshtein, and Natural.js
- **Framer Motion** animations and transitions
- **JioSaavn API** for music streaming data *(educational use)*
- **Genius API** for lyrics and metadata
- **Spotify integration** for playlist import
- **PWA** support with installable manifest

---

## 🎯 Core Features

| Feature | Description |
|---------|-------------|
| 🎧 **Music Streaming** | Stream 50M+ songs via JioSaavn integration |
| 🔐 **Authentication** | Email/password, Google & GitHub OAuth via NextAuth |
| 🌙 **70+ Themes** | Wide range of dark and light theme variants |
| 📱 **Responsive Design** | Adaptive layout across desktop, tablet, and mobile |
| 🎨 **shadcn/ui Components** | 54+ accessible UI components built on Radix |
| 🔍 **Smart Search** | Fuzzy search with typo-tolerant matching |
| 📚 **Personal Library** | Like songs, albums, artists, and playlists |
| 📋 **Playlist Management** | Create, import, and manage custom playlists |
| 🎵 **Lyrics Search** | Find songs by lyrics with fuzzy matching |
| 📻 **Radio Stations** | Interactive map-based radio station discovery |
| 💬 **Community Hub** | Posts, comments, and social interaction |
| 🔀 **Recommendations** | Personalized AI-generated music mixes |
| 📊 **Analytics** | User activity tracking and daily active users |
| ⬇️ **Downloads** | Client-side song download with metadata embedding |
| 🧩 **PWA Ready** | Installable as a progressive web app |
| 🗺️ **Sitemap** | Dynamic SEO sitemap generation |

### Additional Highlights
- **Full-screen music player** with rich visualizations
- **Recently played** tracking across playlists
- **Mobile-optimized** UI with bottom navigation
- **Sonner** toast notifications
- **Performance monitoring** utilities
- **Admin dashboard** with role-based access
- **Email verification** flow via Nodemailer
- **Password reset** with secure tokens

---

## 🧱 Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **Next.js 16** (App Router) | Framework with server components, layouts, & route groups |
| **React 19** | UI library |
| **Tailwind CSS v4** | Utility-first CSS with inline `@theme` |
| **shadcn/ui** & **Radix UI** | Accessible, unstyled component primitives |
| **Framer Motion** | Declarative animations & gestures |
| **Lucide Icons** | Consistent icon set |
| **React Hook Form** + **Zod** | Form validation & schema parsing |
| **Recharts** | Charts & data visualization |
| **Leaflet** / **react-leaflet** | Interactive maps for radio stations |
| **Embla Carousel** | Lightweight carousel component |
| **Sonner** | Toast notifications |
| **next-themes** | Theme switching |
| **Vaul** | Drawer component |
| **CMDK** | Command palette |
| **html-to-image** / **html2canvas** | DOM screenshot & canvas rendering |

### Backend
| Technology | Purpose |
|-----------|---------|
| **NextAuth.js** | Authentication with JWT sessions & OAuth providers |
| **MongoDB** + **Mongoose 9** | NoSQL database & ODM with dual connections |
| **bcryptjs** | Password hashing |
| **jsonwebtoken** | JWT token generation |
| **Nodemailer** | Email verification & password reset |
| **sharp** | Image processing |

### Search & Matching
| Technology | Purpose |
|-----------|---------|
| **Fuse.js** | Client-side fuzzy search |
| **Natural.js** | Natural language processing |
| **String Similarity** | String comparison metrics |
| **Fastest Levenshtein** | Optimized edit-distance algorithm |
| **Custom Matcher** | Track matching (Spotify/YouTube → JioSaavn) |

### APIs Integrated
| API | Usage |
|-----|-------|
| **JioSaavn** | Music streaming data *(educational)* |
| **Genius** | Lyrics & song metadata |
| **Spotify** | Playlist importing & metadata |
| **Vercel Analytics** | Traffic & speed insights |

### DevOps & Tooling
| Tool | Usage |
|------|-------|
| **Vercel** | Hosting & deployment |
| **ESLint** | Code linting |
| **JavaScript (ES2022+)** | Language (with `jsconfig.json` path aliases) |
| **PWA** | Web app manifest & service worker ready |

---

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, signup, reset-password, etc.)
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   └── verify-email/
│   ├── music/                    # Authenticated music app
│   │   ├── page.jsx              # Dashboard / Discover home
│   │   ├── search/
│   │   ├── favorites/
│   │   ├── library/
│   │   ├── playlist/[id]/
│   │   ├── playlists/
│   │   ├── album/[id]/
│   │   ├── artist/[id]/
│   │   ├── song/[id]/
│   │   ├── radio/
│   │   ├── chat/
│   │   ├── discover/             # Sub-routes (genres, charts, podcasts, etc.)
│   │   └── profile/
│   ├── api/                      # 56+ API route handlers
│   │   ├── auth/                 # NextAuth + custom auth endpoints
│   │   ├── playlists/
│   │   ├── liked-songs/
│   │   ├── liked-albums/
│   │   ├── liked-artists/
│   │   ├── liked-playlists/
│   │   ├── community/            # Posts & comments
│   │   ├── recommendations/
│   │   ├── analytics/
│   │   ├── genres/
│   │   ├── sections/
│   │   ├── rating/
│   │   ├── spotify-playlists/
│   │   ├── search-lyrics/
│   │   ├── download/
│   │   └── proxy/
│   ├── layout.js
│   └── sitemap.js
├── components/                   # React components
│   ├── ui/                       # 54 shadcn/ui components
│   ├── music/                    # Music-specific components
│   ├── playlists/                # Playlist dialogs
│   └── analytics/                # Activity trackers
├── contexts/
│   └── music-player-context.jsx  # Global player state
├── hooks/                        # Custom hooks (9)
├── lib/                          # Utilities (14 modules)
│   ├── mongodb.js                # DB connection (cached)
│   ├── mongodbPlaylists.js       # Secondary DB connection
│   ├── matcher.js                # Track matching algorithm
│   ├── recommendations.js        # Mix recommendation engine
│   ├── themes.js                 # 70+ theme definitions
│   ├── cache.js                  # In-memory TTL cache
│   ├── email.js                  # Nodemailer service
│   ├── spotify.js                # Spotify API helper
│   ├── clientDownload.js         # M4A download with metadata
│   └── utils.js                  # cn() utility
├── models/                       # 15 Mongoose models
├── data/                         # Static data (genres)
└── middleware.js                  # Route protection
```

---

## 🧪 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run create-indexes` | Create MongoDB indexes |

---

## 🗺️ Routes Overview

### Public Routes
| Path | Description |
|------|-------------|
| `/` | Landing page (Hero, Features, Reviews, FAQ) |
| `/login` | Sign in |
| `/signup` | Create account |
| `/forgot-password` | Password reset request |
| `/reset-password` | Set new password |
| `/verify-email` | Email verification |
| `/reviews` | Public reviews |
| `/features` | Feature showcase |

### Authenticated Routes (`/music/*`)
| Path | Description |
|------|-------------|
| `/music` | Dashboard / Discover home |
| `/music/search` | Search songs, albums, artists |
| `/music/favorites` | Liked songs |
| `/music/library` | Personal library |
| `/music/playlists` | User playlists list |
| `/music/playlists/[id]` | Playlist detail |
| `/music/album/[id]` | Album detail |
| `/music/artist/[id]` | Artist detail |
| `/music/song/[id]` | Song detail |
| `/music/radio` | Radio stations with map |
| `/music/chat` | Community hub |
| `/music/discover` | Music discovery |
| `/music/discover/genres` | Browse genres |
| `/music/discover/top-charts` | Top charts |
| `/music/discover/top-hits` | Top hits |
| `/music/discover/new-releases` | New releases |
| `/music/discover/podcasts` | Podcasts |
| `/music/discover/community` | Community playlists |
| `/music/profile` | User profile |
| `/music/settings` | User settings |

---

## 📸 Screenshots

### 🖥️ Desktop

| Dashboard | Player | Full-Screen | Lyrics |
|:---------:|:------:|:-----------:|:------:|
| ![Dashboard](https://i.postimg.cc/R0TNYXSH/jammify-music-vercel-app-music(High-res).png) | ![Player](https://i.postimg.cc/YCHFy46d/jammify-music-vercel-app-music(High-res)-(1).png) | ![Full Screen](https://i.postimg.cc/Mp9GbXdS/jammify-music-vercel-app-music(High-res)-(2).png) | ![Lyrics](https://i.postimg.cc/gjpdPPgP/jammify-music-vercel-app-music(High-res)-(3).png) |

### 📱 Mobile

| # | Screen | Preview |
|:-:|--------|:-------:|
| 1 | 🏠 **Home** | ![Home](https://i.postimg.cc/nLMwMwCy/jammify-music-vercel-app-music(i-Phone-14-Pro-Max)-(1).png) |
| 2 | ❤️ **Liked Songs** | ![Liked](https://i.postimg.cc/8zZ0pVPw/jammify-music-vercel-app-music(i-Phone-14-Pro-Max)-(2).png) |
| 3 | 🎵 **Full-Screen Player** | ![Fullscreen](https://i.postimg.cc/hPP8SQzc/jammify-music-vercel-app-music(i-Phone-14-Pro-Max)-(3).png) |
| 4 | 📝 **Lyrics** | ![Lyrics](https://i.postimg.cc/QC6TBS9V/jammify-music-vercel-app-music(i-Phone-14-Pro-Max)-(4).png) |
| 5 | 📋 **Playlist** | ![Playlist](https://i.postimg.cc/N0w5jZJ2/jammify-music-vercel-app-music(i-Phone-14-Pro-Max)-(9).png) |
| 6 | 🔍 **Search** | ![Search](https://i.postimg.cc/3x0vRXK7/jammify-music-vercel-app-music(i-Phone-14-Pro-Max)-(5).png) |
| 7 | 📚 **Library** | ![Library](https://i.postimg.cc/G2d8q6vh/jammify-music-vercel-app-music(i-Phone-14-Pro-Max)-(6).png) |
| 8 | ➕ **Create** | ![Create](https://i.postimg.cc/T2kLJ71X/jammify-music-vercel-app-music(i-Phone-14-Pro-Max)-(7).png) |
| 9 | 👤 **Profile** | ![Profile](https://i.postimg.cc/c4rK9Rtf/jammify-music-vercel-app-music(i-Phone-14-Pro-Max)-(8).png) |

---

## 📄 Documentation

| File | Description |
|------|-------------|
| [`AUTH_IMPLEMENTATION.md`](./AUTH_IMPLEMENTATION.md) | Authentication architecture, flow & models |
| [`FEATURES.md`](./FEATURES.md) | Detailed feature list |
| [`MATCHER_ALGORITHM.md`](./MATCHER_ALGORITHM.md) | Track matching algorithm documentation |
| [`music_recommendation_system.md`](./music_recommendation_system.md) | Recommendation engine design |

---

## ⚠️ Legal & Usage Disclaimer

- This project is **strictly for educational and portfolio purposes**
- No music, lyrics, or media files are hosted directly
- All audio and metadata are accessed via **public third-party APIs**
- This project **must not be used commercially**

---

## 📄 License

This repository is **not licensed for commercial use**.  
All rights are reserved by the author.

---

<div align="center">

**Built with ❤️ for learning, experimentation, and music lovers**

[⭐ Star the repository](https://github.com/shreejaybhay/jammify) •
[🐦 GitHub Profile](https://github.com/shreejaybhay)

</div>
