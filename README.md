# Taipei travel companion

A private Traditional Chinese travel app with a public GitHub Pages shell. Google sign-in and enabled per-trip membership are required for private itinerary and booking data.

Daily itinerary, bookings, checklist, Google Maps, themes and an offline public demo are included. Online private content stays in memory. Authorized users can explicitly save a read-only device copy without a separate password. Attraction popups show recommendation reasons, local history and references.

This repository contains no private bookings, account identifiers or travel dates. config.public.json is public Firebase web configuration, not an admin credential. Never commit service-account keys, private seeds or membership identities.

The app uses the isolated taipeiTrips namespace and the named Firebase client app taipei-travel. firestore.rules preserves the legacy Korea policy and adds Taipei membership rules. Recheck current live rules before any deployment; do not replace the shared policy with a standalone ruleset. Membership writes require an authorized privileged operator.

No build is required. Serve the cloned public files with any local static server, or publish main/root through GitHub Pages. Open the fictional demo without signing in. Only public shell assets are cached by the service worker. Private offline copies are fetched from the server after fresh membership verification and stored as AES-GCM ciphertext in IndexedDB alongside a non-extractable device-browser key. This is not an independent app lock or a Face ID check: someone with access to the unlocked device and browser can open the copy. Open while offline; no queued edits. For legacy passphrase copies, sign in online and save again once on the usual device; the old ciphertext is removed only after a successful replacement. The copy expires after 14 days, and explicit logout or observed access revocation removes it. Remote revocation cannot invalidate an already downloaded copy while offline.

Validation before release: 4 core tests and 14 additional authentication/UI regression scenarios, 12 authorization scenarios, 7 shared-project regression scenarios, and responsive/offline/mocked-auth browser checks passed locally. Real-account access verification is separate.

Google authentication and trip authorization are separate. A missing or denied membership keeps Logout and the signed-in identity visible and offers a retry. Only server-authorized admins can edit. The optional five-day Taipei inspiration is available without private bookings; all ideas are unbooked suggestions.
