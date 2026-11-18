# Dishlist

Review sites rate the restaurant; Dishlist rates the **dish**. Log what you ordered, rate it, decide whether you'd order it again, and save how you want it next time ("No onions"). Built with React, TypeScript and Firebase, designed with the [Dishlist design system](https://claude.ai/artifact/AuY3txMqoPVdsadZ3Z2mWd).

## Features

- 🍽️ Rate dishes 1–5 plates (Nope, Meh, Fine, Good, Obsessed) and give each a verdict: Order again, Maybe, or Skip it
- 📝 "Next time" tweaks you'd tell the server (No onions, Extra chili crisp, Sauce on the side), filled in automatically when you log a dish again
- 🔁 Every time you have a dish is kept: its history, how often you've ordered it, and its average rating
- 📍 Places summed up by their dishes (never an averaged restaurant score), with a "Next time here" note for your next visit
- 📸 Photos, resized in the browser and stored in Firebase Storage
- 🔎 Search dishes, places, notes and tweaks; filter by verdict; sort by recent, rating or times ordered
- ↩️ Undo after deleting
- 📊 Your numbers: dishes per month, spending, favorites, where you go most
- 🔄 Works offline: the app opens with no connection, dishes are cached on the device, and changes sync when you reconnect (photos need a connection)
- 📲 Installable on your phone or desktop (Progressive Web App), with light and dark themes
- 🔐 Google sign-in; your dishes are private to your account

## Prerequisites

- Node.js 20.19+ or 22.12+
- npm or yarn
- Firebase account

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd meal-tracker
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

Run the tests (`npm run test:watch` to re-run on changes), type check, and lint:

```bash
npm test
npm run typecheck
npm run lint
```

Test the Firestore and Storage security rules against the local Firebase emulators. This needs Java 21 or newer (on macOS: `brew install openjdk@21`) and uses a `demo-` project, so it never touches your real Firebase project:

```bash
npm run test:rules
```

The app icons in `public/` are generated from `public/icon.svg`. After changing it, regenerate them:

```bash
npm run generate-icons
```

## Building for Production

Build the application:

```bash
npm run build
```

Preview the production build (the service worker, offline support, and install prompt only run in a production build):

```bash
npm run preview
```

## Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication and Google sign-in method
3. Create a Firestore database
4. Set up Cloud Storage for photos. New projects need the Blaze (pay-as-you-go) plan for Storage; personal use normally stays within the no-cost allowance. Put the bucket name (e.g. `your-project.firebasestorage.app`) in `VITE_FIREBASE_STORAGE_BUCKET`.
5. Deploy the security rules in [`firestore.rules`](firestore.rules) and [`storage.rules`](storage.rules) (each user can only see and change their own meals and photos):

```bash
firebase deploy --only firestore:rules,storage
```

## Project Structure

```
src/
├── app/              # App shell (navigation, toasts, sign-out), router, update prompt
├── screens/          # Home, Dishes, Dish, Places, Place, Me, Log a dish sheet, Login
├── ui/               # Dishlist design system components, ported to typed React
├── design/           # Design system tokens (tokens.json → tokens.css), component CSS, fonts, logos
├── contexts/         # Auth context, provider, and useAuth hook
├── lib/              # Firebase setup, dish grouping, stats, filtering, formatting, image resizing
├── services/         # Reading and writing meals and photos
├── types.ts          # Shared TypeScript types
└── App.tsx           # Login screen or the signed-in app
tests/rules/          # Security rules tests (run on the Firebase emulators)
public/               # App icons and other static files
firestore.rules       # Firestore security rules
storage.rules         # Storage security rules
```

## Design system

The look and the product rules (dish first, plates not stars, a skipped dish is information rather than an error) come from the [Dishlist design system](https://claude.ai/artifact/AuY3txMqoPVdsadZ3Z2mWd). `src/design/` holds a copy of its tokens, component stylesheet, fonts and logos, and `src/ui/` ports its components. After updating `src/design/tokens.json`, regenerate the CSS variables:

```bash
npm run generate-tokens
```

## Key Technologies

- React 19 and TypeScript
- Firebase 13 (Authentication, Firestore with offline cache, Storage, Hosting)
- Vite 8 with vite-plugin-pwa
- Gabarito and Figtree (SIL Open Font License, in `src/design/fonts/`)
- Vitest and Testing Library

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Design, icons and logos from the Dishlist design system
- [Gabarito](https://fonts.google.com/specimen/Gabarito) and [Figtree](https://fonts.google.com/specimen/Figtree), under the SIL Open Font License (see `src/design/fonts/`)
