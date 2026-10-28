# Taipei travel companion

A private Traditional Chinese travel app with a public GitHub Pages shell. Google sign-in and enabled per-trip membership are required for private itinerary and booking data.

Daily itinerary, bookings, checklist, Google Maps, themes and an offline public demo are included. Private content stays in memory and is cleared on logout, revoked access or offline events.

This repository contains no private bookings, account identifiers or travel dates. config.public.json is public Firebase web configuration, not an admin credential. Never commit service-account keys, private seeds or membership identities.

The app uses the isolated taipeiTrips namespace and the named Firebase client app taipei-travel. firestore.rules preserves the legacy Korea policy and adds Taipei membership rules. Recheck current live rules before any deployment; do not replace the shared policy with a standalone ruleset. Membership writes require an authorized privileged operator.

No build is required. Serve the cloned public files with any local static server, or publish main/root through GitHub Pages. Open the fictional demo without signing in. Offline support covers the public shell and demo only.

Validation before release: 3 core tests, 12 authorization scenarios, 7 shared-project regression scenarios, and responsive/offline/mocked-auth browser checks passed locally. Real-account access verification is separate.
