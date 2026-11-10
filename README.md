# Project ALEN: site and trial keys

The public site for Project ALEN (product, features, walkthrough, privacy) and the free 7-day trial key page, served by
GitHub Pages at https://bharathpathan.github.io/alen-trial/.

The source lives in the Project ALEN repository under `site/` and is copied here to publish.

- `trial.html` + `assets/trial.js`: sign in with Firebase Authentication (Google, or email and password with a confirmed
  address), collect the holder's details, and write one key per account to Cloud Firestore.
- `firestore.rules`: the security rules that enforce it on Google's servers (7 days from server time, one trial per
  account, keys readable one at a time and never listable). Deploy with
  `firebase deploy --only firestore:rules --project project-alen`.
- The Firebase web configuration in `assets/trial.js` is public by design; access is controlled by the rules.

Withdraw a key: set `revoked: true` on its `keys/{key}` document in the Firebase console.
