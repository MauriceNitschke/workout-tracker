# Training OS

An iPhone-first training planner and workout tracker. The app works as a local guest
PWA and can optionally use Google Sign-In with Firebase/Firestore for private,
cross-device synchronization.

## Local development

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`.
3. Run the app: `npm run dev`
4. Type-check: `npm run lint`
5. Build: `npm run build`

Without Firebase variables, all workout features remain available in local guest mode.

## Enable Google account synchronization

1. Create a Firebase project and web app.
2. Enable Google under Firebase Authentication → Sign-in method.
3. Create a Firestore database.
4. Add `localhost` and `mauricenitschke.github.io` to Authentication → Authorized domains.
5. Put the web app configuration into the `VITE_FIREBASE_*` variables listed in
   `.env.example`.
6. Deploy the private per-user rules:

   ```sh
   firebase deploy --only firestore:rules
   ```

7. Add the same values as GitHub repository variables so the Pages workflow can
   include Firebase configuration in the production build.

Firebase web configuration is public by design. `firestore.rules` provides data
isolation and must be deployed before enabling sign-in for users.

## Data authority

- Signed out: the device guest dataset is authoritative.
- Signed in with existing cloud data: Firestore is authoritative and replaces the
  active device cache.
- Signed in with a new account: choose whether to initialize it from the device or
  start empty.
- Offline signed-in edits use Firestore's persistent cache and synchronize after
  reconnection.

JSON import/export remains available as an independent backup.

## Enable iPhone PWA notifications

1. In Firebase Console, open Project settings → Cloud Messaging → Web Push
   certificates and create a key pair.
2. Add the public key as `VITE_FIREBASE_VAPID_KEY` locally and in the GitHub Pages
   build variables.
3. Install and verify the scheduled backend:

   ```sh
   cd functions
   npm install
   npm run build
   cd ..
   firebase deploy --only functions
   ```

4. Deploy the updated frontend. On iPhone, install the site to the Home Screen,
   open Account & Settings, and explicitly enable notifications.

The app stores one private FCM subscription per signed-in device. The scheduled
function respects quiet hours and sends morning, start-time-relative,
missed-workout, and weekly bodyweight reminders.
