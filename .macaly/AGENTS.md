## Project Context

**App Name**: Kuryr4You Dispečink
**Type**: Courier dispatch management system (NOT taxi)
**Language**: Czech only
**Owner**: Petr Gottstein (petr.gottstein@gmail.com)

## Design Preferences

- Professional, dark design (industrial/utilitarian tone)
- Inspired by Onfleet and Routific
- Czech language throughout entire UI
- Mobile-responsive (drivers use mobile browsers)

## Features

- Three roles: Dispečer (Admin), Řidič (Driver), Zákazník (Customer)
- Real-time GPS tracking of drivers (Leaflet + OpenStreetMap)
- Route visualization (OSRM open routing)
- Proof of Delivery: photo + digital signature
- Public tracking link (no login required for recipients)
- Shared availability calendar (all drivers see each other)
- Corporate customer accounts (14-day invoicing cycle, admin approval)
- Email notifications on order status changes
- Driver analytics and performance stats
- Manual driver assignment by dispatcher

## No-gos

- No payment gateway / online card payments
- No native mobile app (responsive web only)
- No SMS notifications (email only)
- No AI auto-assignment of drivers
- No multi-language support

## Testing Preferences

Pečlivě a spolehlivě — check work carefully after each major change. Write tests for non-trivial logic.
