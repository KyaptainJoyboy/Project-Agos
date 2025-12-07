# AGOS Deployment Guide

This guide covers deploying the AGOS Progressive Web App to production.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Supabase project (already configured)
- Production hosting environment (Vercel, Netlify, or similar)
- Domain with HTTPS (required for PWA features)

## Pre-Deployment Checklist

### 1. Environment Configuration

Ensure your `.env` file contains production values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Database Verification

Verify that all migrations have been applied:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

Expected tables:
- users_profile
- evacuation_centers
- evacuation_routes
- route_packages
- road_conditions
- messages
- vehicles
- vehicle_tracking
- evacuee_locations
- center_updates

### 3. Icons and Manifest

Generate proper PWA icons:

**Required Sizes:**
- 192x192 pixels (icon-192.png)
- 512x512 pixels (icon-512.png)

Place in `public/` directory.

Update `public/manifest.json` with production URLs if needed.

### 4. Service Worker Configuration

Review `public/sw.js`:
- Update cache version if needed
- Verify static assets list
- Check cache size limits

## Build Process

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Type Check

```bash
npm run typecheck
```

### 3. Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### 4. Preview Build Locally

```bash
npm run preview
```

Test all features in the production build before deployment.

## Deployment Options

### Option 1: Vercel (Recommended)

#### Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

#### Using Git Integration

1. Push code to GitHub/GitLab/Bitbucket
2. Import project in Vercel dashboard
3. Configure environment variables
4. Deploy

**Vercel Configuration (`vercel.json`):**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

### Option 2: Netlify

#### Using Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

#### Using Git Integration

1. Push code to Git repository
2. Import project in Netlify
3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables
5. Deploy

**Netlify Configuration (`netlify.toml`):**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/sw.js"
  [headers.values]
    Service-Worker-Allowed = "/"
    Cache-Control = "public, max-age=0, must-revalidate"
```

### Option 3: Custom Server

For deployment to your own server:

#### Using Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name agos.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/agos/dist;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Service Worker headers
    location /sw.js {
        add_header Service-Worker-Allowed /;
        add_header Cache-Control "public, max-age=0, must-revalidate";
        try_files $uri =404;
    }

    # Manifest and icons
    location ~* \.(manifest|json|png|svg|ico)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Static assets
    location ~* \.(js|css|woff|woff2|ttf|eot)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Post-Deployment Configuration

### 1. Verify PWA Installation

Test on multiple devices:
- [ ] Chrome/Edge on Android
- [ ] Safari on iOS
- [ ] Desktop Chrome/Edge

Expected behavior:
- Install prompt appears
- App installs successfully
- Works offline after installation

### 2. Test Service Worker

```javascript
// Open browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});
```

Expected: One active service worker registration.

### 3. Verify Offline Functionality

1. Load app while online
2. Open DevTools Network tab
3. Enable "Offline" mode
4. Navigate app features
5. Verify:
   - [ ] Map tiles load from cache
   - [ ] Routes are accessible
   - [ ] Messages queue offline
   - [ ] UI indicates offline status

### 4. Test Real-Time Features

1. Open app in two different browsers/devices
2. Sign in as different users
3. Perform actions (send message, update center capacity)
4. Verify real-time updates propagate

### 5. Monitor Performance

Use Lighthouse to audit:

```bash
# Install Lighthouse
npm install -g lighthouse

# Run audit
lighthouse https://your-domain.com --view
```

Target scores:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 90+
- PWA: 100

## Monitoring and Maintenance

### Error Tracking

Consider integrating error tracking:

```typescript
// Example: Sentry integration
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: "production",
  tracesSampleRate: 1.0,
});
```

### Analytics

Track usage with privacy-respecting analytics:

```typescript
// Example: Plausible integration
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

### Database Maintenance

Schedule regular maintenance:

```sql
-- Clean up expired evacuee locations
DELETE FROM evacuee_locations
WHERE expires_at < NOW();

-- Archive old messages
INSERT INTO messages_archive
SELECT * FROM messages
WHERE created_at < NOW() - INTERVAL '30 days';

DELETE FROM messages
WHERE created_at < NOW() - INTERVAL '30 days';

-- Update statistics
ANALYZE;
```

### Backup Strategy

Implement automated backups:

1. **Supabase Backups**: Enable automatic daily backups in Supabase dashboard
2. **Export Critical Data**: Regularly export evacuation centers and routes
3. **Version Control**: Keep migration files in version control

## Scaling Considerations

### Database Optimization

As data grows, optimize queries:

```sql
-- Add indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_messages_created_at
ON messages(created_at DESC);

CREATE INDEX CONCURRENTLY idx_evacuee_locations_user_emergency
ON evacuee_locations(user_id, is_emergency);

-- Enable pg_stat_statements for query analysis
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### CDN Configuration

Serve static assets via CDN:
- Map tiles
- Route packages
- Images and icons

### Rate Limiting

Implement API rate limiting:

```typescript
// Example middleware
const rateLimit = {
  messages: 10, // per minute
  reports: 5,   // per minute
  location: 60, // per minute
};
```

## Security Hardening

### 1. Content Security Policy

Add CSP headers:

```html
<meta http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://unpkg.com;
    img-src 'self' data: https: blob:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
    font-src 'self' data:;
  ">
```

### 2. Supabase Security

Configure Supabase project:
- [ ] Enable email verification
- [ ] Set up password requirements
- [ ] Configure JWT expiry
- [ ] Enable audit logging
- [ ] Set up IP restrictions (if applicable)

### 3. Environment Variables

Never commit sensitive data:
- Use environment variables for all secrets
- Rotate keys regularly
- Implement secret management (Vault, AWS Secrets Manager)

## Rollback Procedure

If deployment fails:

### Quick Rollback

**Vercel:**
```bash
vercel rollback
```

**Netlify:**
Use dashboard to restore previous deploy

**Custom Server:**
```bash
# Switch to backup directory
ln -sfn /var/www/agos-backup /var/www/agos
systemctl reload nginx
```

### Database Rollback

```sql
-- Revert migration
BEGIN;
-- Copy of rollback SQL
ROLLBACK; -- or COMMIT if confident
```

## Troubleshooting

### Service Worker Not Updating

```javascript
// Force update
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.update());
});
```

### Cache Issues

Clear all caches:

```javascript
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

### Database Connection Issues

Check Supabase status:
- Verify connection string
- Check API quotas
- Review connection pooling settings

## Support and Maintenance

### Regular Updates

- Update dependencies monthly
- Apply security patches immediately
- Review and update service worker cache
- Refresh map tiles and route data

### Documentation

Keep updated:
- API documentation
- User guides
- Admin procedures
- Incident response plan

---

## Quick Reference

### Commands

```bash
# Development
npm run dev

# Type check
npm run typecheck

# Build
npm run build

# Preview
npm run preview

# Deploy (Vercel)
vercel --prod

# Deploy (Netlify)
netlify deploy --prod
```

### URLs

- Production: https://your-domain.com
- Supabase Dashboard: https://app.supabase.com
- Status Page: Configure monitoring service

### Contacts

- Technical Support: [your-email]
- Emergency: [emergency-contact]
- Database Admin: [db-admin]

---

**Last Updated:** 2024-12-07
