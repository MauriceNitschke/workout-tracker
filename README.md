# Training OS

An iPhone-first training planner and workout tracker. The app works as a local guest
PWA and can optionally use Google Sign-In with Firebase/Firestore for private,
cross-device synchronization.

## Local development

1. Install dependencies: `bun install`
2. Copy `.env.example` to `.env.local`.
3. Run the app: `bun run dev`
4. Type-check: `bun run lint`
5. Build: `bun run build`

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
