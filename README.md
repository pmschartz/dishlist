# Restaurant Meal Tracker

A beautiful web application for tracking and rating your restaurant dining experiences. Built with React, TypeScript, Firebase, and Tailwind CSS.

## Features

- 🔐 Google Authentication
- 📝 Track restaurant meals with ratings
- 🏪 Auto-complete restaurant names
- ⭐ 5-star rating system
- 📸 Meal photos (resized in the browser, stored in Firebase Storage)
- 💰 Price tracking
- 📱 Responsive design

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

## Building for Production

Build the application:

```bash
npm run build
```

Preview the production build:

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
├── components/         # React components
├── contexts/          # Context providers
├── lib/              # Firebase and other configurations
├── services/         # API and service functions
├── types/            # TypeScript type definitions
└── App.tsx           # Main application component
```

## Key Technologies

- React 18
- TypeScript
- Firebase (Authentication & Firestore)
- Tailwind CSS
- Vite
- Lucide React Icons

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Icons by [Lucide](https://lucide.dev)
- UI Components inspired by [Tailwind UI](https://tailwindui.com)
