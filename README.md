# MelaChow Vendor

Standalone Next.js dashboard for MelaChow restaurant vendors.

## Scope

- Vendor authentication under `/vendors/auth`
- Vendor dashboard, menu, orders, riders, payouts, reviews, and notifications under `/vendors`
- Private dashboard metadata, robots, and sitemap defaults for a subdomain deployment

## Development

```bash
npm install
npm run dev
```

Set `NEXT_PUBLIC_VENDOR_URL` for production metadata when deploying to a vendor subdomain.
