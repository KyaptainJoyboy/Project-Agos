# AGOS - Advanced Geohazard Observation and Monitoring System

A progressive web application (PWA) designed for disaster evacuation management in Tuguegarao City, Cagayan. AGOS provides real-time coordination between evacuees, personnel, and administrators during flooding events with robust offline capabilities.

## Features

### Core Capabilities

#### 1. Offline-First Architecture
- **Service Worker**: Comprehensive caching strategy for offline functionality
- **IndexedDB Storage**: Local storage for routes, messages, and location data
- **Background Sync**: Automatic synchronization when connectivity is restored
- **Downloadable Route Packages**: Pre-cache evacuation routes and map tiles for offline navigation

#### 2. Real-Time Updates
- **Live Evacuation Center Capacity**: See current occupancy and availability
- **Vehicle Tracking**: Monitor transportation assets with live location updates
- **Road Conditions**: Real-time reports of passable, flooded, or blocked roads
- **Two-Way Messaging**: Communication between evacuees and personnel with offline queuing

#### 3. Interactive Map (Tuguegarao City)
- **Centered on Tuguegarao City** (17.6132°N, 121.7270°E)
- **Multiple Layers**: Toggle evacuation centers, vehicles, road conditions, and evacuee locations
- **Real-Time Updates**: Live markers for all tracked entities
- **User Location**: GPS-based positioning with route guidance
- **Offline Map Tiles**: Cached OpenStreetMap tiles for offline use

#### 4. Role-Based Access Control
- **Evacuee**: View centers, routes, send reports, share location
- **Personnel**: All evacuee features plus broadcast messages, verify reports
- **Vehicle Operator**: Update vehicle location and passenger count
- **Administrator**: Full system access including center management

#### 5. PWA Features
- **Installable**: Add to home screen on mobile devices
- **Responsive Design**: Phone-first, optimized for mobile use
- **Push Notifications**: Real-time alerts and updates
- **Offline Capabilities**: Full functionality without internet connection

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Leaflet** for interactive maps
- **Lucide React** for icons

### Backend & Database
- **Supabase**
  - PostgreSQL database with PostGIS extension
  - Real-time subscriptions
  - Row Level Security (RLS)
  - Authentication

### PWA Technologies
- **Service Worker** for offline caching
- **IndexedDB** for client-side storage
- **Background Sync API** for data synchronization
- **Web App Manifest** for installability

## Database Schema

### Core Tables

#### users_profile
Extended user profiles with role-based access control.
- Stores user role, contact information, and preferences
- Links to Supabase auth.users

#### evacuation_centers
Physical evacuation centers in Tuguegarao City.
- Location coordinates (PostGIS POINT)
- Capacity tracking (current/maximum)
- Status (operational, full, closed, emergency)
- Amenities and contact information

#### evacuation_routes
Pre-defined evacuation routes.
- Start/end locations (PostGIS POINT)
- Route geometry (GeoJSON)
- Distance and duration estimates
- Priority levels

#### route_packages
Downloadable route bundles for offline use.
- Multiple routes bundled together
- Version management
- File size and coverage area

#### road_conditions
Real-time road status reports.
- Road segments (PostGIS LINESTRING)
- Status: passable, flooded, blocked, unknown
- Severity ratings (1-5)
- User-reported with verification system

#### messages
Two-way communication system.
- Message types: direct, broadcast, alert
- Priority levels (1-5)
- Offline queue support
- Read/unread tracking

#### vehicles
Transportation assets.
- Vehicle type and capacity
- Operator assignment
- Availability status

#### vehicle_tracking
Real-time vehicle location updates.
- GPS coordinates (PostGIS POINT)
- Speed and heading
- ETA calculations
- Passenger count

#### evacuee_locations
Opt-in location sharing by evacuees.
- GPS coordinates with accuracy
- Emergency status flags
- Battery level tracking
- Auto-expiration (1 hour default)

### Security

All tables implement Row Level Security (RLS) with policies based on user roles:
- Evacuees can only access their own data and public information
- Personnel can view and verify reports
- Vehicle operators can update their vehicle data
- Administrators have full access

## Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Environment Variables

Create a `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database Setup

The database schema is already applied to your Supabase instance. The migration includes:
- All tables with proper indexes
- PostGIS extension for geospatial data
- Row Level Security policies
- Real-time subscriptions enabled

## Usage Guide

### For Evacuees

1. **Register/Login**: Create an account with evacuee role
2. **Enable Location**: Grant location permissions for route guidance
3. **View Dashboard**: See available evacuation centers and capacity
4. **Download Routes**: Pre-download evacuation routes for offline use
5. **Navigate**: Use the map to find nearest centers and safe routes
6. **Report Conditions**: Submit road condition reports
7. **Send Messages**: Communicate with personnel
8. **Share Location**: Opt-in to share your location in emergencies

### For Personnel

All evacuee features plus:
- Broadcast messages to all evacuees
- Verify road condition reports
- Update evacuation center status
- Monitor evacuee locations
- Coordinate vehicle dispatch

### For Vehicle Operators

- Update real-time vehicle location
- Report passenger count
- Update destination and ETA
- Coordinate with personnel

### For Administrators

Full system access:
- Manage evacuation centers
- Create and update routes
- User management
- System configuration
- Analytics and reporting

## Offline Functionality

### What Works Offline

- **Maps**: Pre-cached map tiles and route geometry
- **Routes**: Downloaded evacuation routes
- **Messages**: Compose and queue messages for sending
- **Reports**: Submit road condition reports (synced when online)
- **Location Updates**: Queue location updates for sync
- **View Cached Data**: Access previously loaded centers and routes

### Automatic Sync

When internet connection is restored:
- Pending messages are sent
- Location updates are uploaded
- Road condition reports are submitted
- All data is synchronized with the server

## Performance Optimization

### Battery Efficiency
- Adaptive geolocation: Lower frequency when battery is low
- Throttled real-time updates
- Efficient background sync intervals
- Minimal wake locks

### Data Efficiency
- Delta updates for real-time data
- Compressed route packages
- Selective map tile caching
- Optimized database queries

## Security Considerations

- **HTTPS Only**: All communication encrypted
- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: API request throttling
- **Row Level Security**: Database-level access control
- **Input Validation**: Sanitized user inputs
- **Privacy-Focused**: Opt-in location sharing with expiration

## Browser Support

- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support
- **Mobile Browsers**: Optimized for mobile Chrome, Safari, Firefox

## Progressive Enhancement

AGOS is designed with progressive enhancement:
- Core functionality works without JavaScript
- Enhanced features with JavaScript enabled
- Full PWA experience in supported browsers
- Graceful degradation for older browsers

## Development

### Project Structure

```
src/
├── components/          # React components
│   ├── Auth/           # Authentication forms
│   ├── Dashboard/      # Dashboard view
│   ├── Map/            # Map component
│   ├── Messages/       # Messaging interface
│   ├── Routes/         # Routes and packages
│   └── Settings/       # Settings page
├── contexts/           # React contexts
│   └── AuthContext.tsx
├── hooks/              # Custom React hooks
│   ├── useOnlineStatus.ts
│   └── usePWA.ts
├── lib/                # Core libraries
│   ├── auth.ts         # Authentication utilities
│   ├── db.ts           # IndexedDB wrapper
│   ├── supabase.ts     # Supabase client
│   └── syncManager.ts  # Sync management
├── App.tsx             # Main application
├── main.tsx            # Entry point
└── index.css           # Global styles

public/
├── manifest.json       # PWA manifest
├── sw.js              # Service Worker
└── icons/             # App icons
```

### Key Files

- **sw.js**: Service Worker with caching strategies
- **lib/db.ts**: IndexedDB wrapper for offline storage
- **lib/syncManager.ts**: Background sync management
- **contexts/AuthContext.tsx**: Authentication state management

## API Documentation

### Authentication

```typescript
// Sign up
signUp(email: string, password: string, fullName: string, role: UserRole)

// Sign in
signIn(email: string, password: string)

// Sign out
signOut()

// Get current user
getCurrentUser()

// Get user profile
getUserProfile(userId: string)

// Update profile
updateUserProfile(userId: string, updates: Partial<UserProfile>)
```

### Real-Time Subscriptions

```typescript
// Subscribe to evacuation centers
supabase
  .channel('centers')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'evacuation_centers'
  }, callback)
  .subscribe()

// Subscribe to vehicle tracking
supabase
  .channel('vehicles')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'vehicle_tracking'
  }, callback)
  .subscribe()
```

## Testing

### Manual Testing Checklist

- [ ] User registration and login
- [ ] Location permission request
- [ ] Map loads with correct center (Tuguegarao City)
- [ ] Evacuation centers display on map
- [ ] Route package download
- [ ] Offline functionality (disconnect network)
- [ ] Message sending (online and offline)
- [ ] Road condition reporting
- [ ] Real-time updates (center capacity, vehicles)
- [ ] PWA installation prompt
- [ ] Background sync when reconnecting

## Deployment

### Production Build

```bash
npm run build
```

The build output is in the `dist/` directory.

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] HTTPS enabled
- [ ] Service Worker registered
- [ ] PWA manifest configured
- [ ] Icons generated (192x192 and 512x512)
- [ ] Rate limiting configured
- [ ] Error monitoring set up

## License

Copyright © 2024. All rights reserved.

## Support

For issues, questions, or feature requests, please contact the development team.

---

**Built for Tuguegarao City, Cagayan** - Saving lives through technology.
