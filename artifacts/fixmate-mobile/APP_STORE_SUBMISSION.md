# FixMate App Store submission

This file contains the owner-supplied App Store Connect information for the first iOS release.

## App identity

- App name: FixMate
- Bundle ID: `fixmaterepair`
- Version: `1.0.0`
- Build: `1`
- Primary category: Utilities
- Secondary category: Lifestyle
- Copyright: Use the current year and the legal developer or company name on the Apple Developer account.

Do not change the bundle ID after creating the App ID in Apple.

## Listing copy

### Subtitle

AI household repair guidance

### Promotional text

Photograph a household problem, understand the likely fault and safety risk, estimate UK repair costs, and prepare a clear handoff to a local professional.

### Description

FixMate helps UK households understand what may be wrong before deciding what to do next.

Start with a description, photo, or short video of a household repair problem. FixMate reviews the evidence and gives you:

- A likely fault with a confidence score
- Clear safety guidance
- Realistic UK repair and parts estimates
- Practical next steps
- Guidance on when to stop and use a qualified professional

FixMate Plus adds evidence-aware diagnosis, private follow-up questions about your saved diagnosis, repair history, and marketplace coordination.

When professional help is appropriate, you can prepare a repair job, compare itemised quotes, and keep each engineer conversation private.

FixMate provides informational repair guidance, not a guarantee or a substitute for a qualified professional. Never work on gas, mains electricity, boilers, fire hazards, pressurised systems, exposed wiring, flooding, or fumes. Follow the safety notice shown with every diagnosis.

Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. You can manage or cancel subscriptions in your App Store account settings.

Privacy Policy: https://fixmate.repair/privacy
Terms & Conditions: https://fixmate.repair/terms

### Keywords

home repair,UK repair,appliance,diagnosis,DIY,handyman,maintenance,quotes,household

## URLs

- Privacy Policy URL: https://fixmate.repair/privacy
- Support URL: https://fixmate.repair/contact
- Marketing URL: https://fixmate.repair/about
- Terms & Conditions URL: https://fixmate.repair/terms
- Apple Standard EULA for subscription reference: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

All three FixMate URLs were publicly reachable before submission preparation.

## App privacy answers

Declare data collected by FixMate and its service providers:

- Contact info: name and email address
- Coarse location: postcode supplied for a repair job or engineer profile
- User content: diagnosis descriptions, photos, videos, repair jobs, quotes, and messages
- Identifiers: FixMate/Clerk user ID
- Purchases: subscription status and marketplace purchase history
- Financial info: payment information processed by Apple or Stripe; FixMate does not store full card details
- Usage data: generic product interactions and server access logs
- Diagnostics: error and performance information if collected by the platform

Purposes:

- App functionality
- Account management
- Customer support
- Fraud prevention and security
- Product analytics for generic interactions only

Data is linked to the user where required to provide accounts, saved diagnoses, subscriptions, and marketplace jobs. FixMate does not use this data to track users across other companies' apps or websites, so answer **No** to tracking unless the production configuration changes.

## Age rating

FixMate is intended only for adults. Complete Apple's current age-rating questionnaire truthfully and declare:

- User-generated marketplace content
- Private messaging
- In-app purchases
- AI-generated repair guidance
- Links that open FixMate support pages

Choose the rating that enforces the app's stated 18+ audience in every storefront where Apple makes that option available.

## Subscription products

Entitlement: `fixmate_plus`

The active RevenueCat offering must contain:

- Monthly FixMate Plus subscription
- Annual FixMate Plus subscription

Prices and localized names must come from App Store Connect through RevenueCat. Do not hardcode store prices in the app.

Before review:

1. Create the first TestFlight build with Replit Expo Launch.
2. In Replit Publishing, use **Sync RevenueCat to App Store Connect**.
3. Confirm both products are attached to the current RevenueCat offering and the `fixmate_plus` entitlement.
4. Add localized subscription names, descriptions, prices, and review screenshots in App Store Connect.
5. Confirm Agreements, Tax, and Banking are active.

## Review notes

FixMate uses AI to provide cautious household repair triage. Dangerous categories are explicitly routed to qualified professionals. The app does not present diagnoses as certain.

The FixMate Plus purchase screen is available from Profile. It displays store-provided prices, subscription duration, auto-renewal disclosure, Privacy Policy, Terms of Use, and Restore Purchases.

Marketplace checkout is for real-world household repair services and is processed by Stripe. Digital FixMate Plus access is sold only through Apple's in-app purchase system via RevenueCat.

The reviewer must receive a production review account that can access signed-in diagnosis and account settings. Do not put a personal password in this file. Enter the review credentials directly in App Store Connect.

## Owner actions in App Store Connect

- Enrol in the Apple Developer Program if not already enrolled.
- Create or confirm the App ID using `fixmaterepair`.
- Supply the legal developer name and copyright.
- Complete Agreements, Tax, and Banking.
- Add a dedicated production review account in App Review Information.
- Supply review contact details.
- Upload screenshots generated from the final native build for Apple's currently required iPhone sizes.
- Complete export compliance; the app declares that it uses no non-exempt encryption.
- Complete content-rights and advertising-identifier questions.
- Sync RevenueCat products and submit subscriptions with the app version.
- Submit the build for review from App Store Connect after Expo Launch uploads it.