# Client Portal V2

Client-scoped operating workspace for VIVIT clients.

## Included
- Live campaign performance using campaign-type primary results (Messages / ATC / Purchases / Leads)
- 30-second in-session refresh
- Creative approval queue with revision notes
- Deliverable progress by creative type
- Upcoming task deadlines and publishing events
- Client-scoped notifications
- Billing summary and invoice status
- Content plan / strategy documents
- Client brand logo and social links
- Archived-record filtering and CLIENT-only isolation
- Responsive mobile layout

## Release gate
`scripts/qa-client-portal-v2.mjs` is part of `npm run build` and checks client isolation, archive safety, primary-result semantics, approval safety, finance/calendar/notification scope, auto-refresh, and mobile responsiveness.
