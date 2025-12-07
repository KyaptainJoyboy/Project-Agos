# AGOS Testing Guide

Comprehensive testing guide for the AGOS platform covering all features and scenarios.

## Testing Environment Setup

### Prerequisites

1. **Development Server Running**
   ```bash
   npm run dev
   ```

2. **Multiple Browsers/Devices**
   - Desktop Chrome/Edge
   - Mobile Chrome (Android)
   - Mobile Safari (iOS)
   - Firefox

3. **Network Tools**
   - Browser DevTools
   - Network throttling capability
   - Ability to toggle online/offline mode

4. **Test Accounts**
   Create accounts with different roles:
   - Evacuee user
   - Personnel user
   - Vehicle operator user
   - Admin user

## Feature Testing Checklist

### 1. Authentication System

#### Registration
- [ ] Navigate to registration page
- [ ] Fill in all required fields
- [ ] Select different roles
- [ ] Submit form
- [ ] Verify account creation
- [ ] Check profile creation in database

**Expected Result:** User account created, profile stored, redirected to dashboard

#### Login
- [ ] Enter valid credentials
- [ ] Click "Sign In"
- [ ] Verify redirect to dashboard
- [ ] Check authentication state persists on refresh

**Expected Result:** Successful login, session persisted

#### Logout
- [ ] Click logout button
- [ ] Verify redirect to login
- [ ] Attempt to access protected routes
- [ ] Refresh page

**Expected Result:** Session cleared, redirected to login

### 2. Dashboard View

#### Statistics Display
- [ ] View total evacuation centers
- [ ] Check total evacuees count
- [ ] See available vehicles
- [ ] View active alerts

**Expected Result:** All statistics display correctly

#### Evacuation Centers List
- [ ] Scroll through centers list
- [ ] Check capacity percentages
- [ ] Verify status badges (operational, full, etc.)
- [ ] View center details

**Expected Result:** Centers displayed with real-time capacity

#### Real-Time Updates
- [ ] Open app in two browser windows
- [ ] Update center capacity in database
- [ ] Observe automatic update

**Expected Result:** Dashboard updates without refresh

### 3. Map View

#### Map Loading
- [ ] Navigate to Map view
- [ ] Verify map centers on Tuguegarao City (17.6132°N, 121.7270°E)
- [ ] Check that map tiles load
- [ ] Zoom in and out
- [ ] Pan around the map

**Expected Result:** Interactive map with proper center point

#### Evacuation Centers Layer
- [ ] Toggle "Evacuation Centers" layer
- [ ] Click on center markers
- [ ] View popup information
- [ ] Verify color coding by capacity

**Expected Result:** Centers displayed with color-coded markers

#### Vehicle Tracking Layer
- [ ] Toggle "Transport Vehicles" layer
- [ ] View vehicle locations
- [ ] Click on vehicle markers
- [ ] Check vehicle information display

**Expected Result:** Vehicles shown with movement indicators

#### Road Conditions Layer
- [ ] Toggle "Road Conditions" layer
- [ ] View road status overlays
- [ ] Click on road segments
- [ ] Check status (passable, flooded, blocked)

**Expected Result:** Roads color-coded by status

#### User Location
- [ ] Click "My Location" button
- [ ] Grant location permission
- [ ] Verify map centers on user
- [ ] Check accuracy indicator

**Expected Result:** User location shown with blue marker

### 4. Routes View

#### Route Packages
- [ ] View available route packages
- [ ] Check package information (size, version, routes)
- [ ] Download a package (while online)
- [ ] Monitor download progress
- [ ] Verify download completion

**Expected Result:** Package downloaded, stored in IndexedDB

#### Available Routes
- [ ] View routes list
- [ ] Check route details (distance, duration)
- [ ] View priority levels
- [ ] Check destination centers

**Expected Result:** All routes displayed correctly

#### Offline Package Access
- [ ] Download package while online
- [ ] Go offline (DevTools Network tab → Offline)
- [ ] View downloaded packages
- [ ] Verify routes are accessible

**Expected Result:** Downloaded content accessible offline

### 5. Messages View

#### Viewing Messages
- [ ] Navigate to Messages
- [ ] View message list
- [ ] Check message types (broadcast, direct, alert)
- [ ] View priority indicators
- [ ] See unread badges

**Expected Result:** Messages displayed correctly

#### Sending Messages (Personnel/Admin)
- [ ] Log in as personnel or admin
- [ ] Click "New" message button
- [ ] Fill in subject and content
- [ ] Select message type
- [ ] Choose priority level
- [ ] Send message

**Expected Result:** Message sent successfully

#### Offline Message Queue
- [ ] Go offline
- [ ] Compose a message
- [ ] Click send
- [ ] Verify "pending" status
- [ ] Go back online
- [ ] Watch automatic sync

**Expected Result:** Message queued offline, synced when online

#### Real-Time Message Delivery
- [ ] Open two browser windows (different users)
- [ ] Send message from one user
- [ ] Observe delivery to recipient

**Expected Result:** Message appears instantly

### 6. Settings View

#### Profile Information
- [ ] View user profile
- [ ] Check name, email, role
- [ ] Verify contact information

**Expected Result:** Correct profile data displayed

#### Location Permission
- [ ] Toggle location permission
- [ ] Grant/deny browser location access
- [ ] Verify permission state updates

**Expected Result:** Permission changes reflected

#### Notifications
- [ ] Toggle notification permission
- [ ] Grant browser notification access
- [ ] Verify setting persists

**Expected Result:** Notification preference saved

#### PWA Installation
- [ ] View install prompt (if available)
- [ ] Click "Install App"
- [ ] Complete installation
- [ ] Open installed app

**Expected Result:** App installs and opens standalone

#### Cache Management
- [ ] View cache size
- [ ] Click "Clear Cache"
- [ ] Confirm action
- [ ] Verify cache cleared

**Expected Result:** Cache size resets to zero

### 7. Offline Functionality

#### Offline Map Access
1. Load map while online
2. Navigate around to cache tiles
3. Go offline
4. Navigate map
5. Verify tiles load from cache

**Expected Result:** Map works offline

#### Offline Route Access
1. Download route package
2. Go offline
3. View routes
4. Access route details

**Expected Result:** Routes accessible offline

#### Offline Data Queue
1. Go offline
2. Send message
3. Share location
4. Report road condition
5. Go back online
6. Verify all queued items sync

**Expected Result:** All offline actions sync automatically

#### Service Worker Caching
1. Open DevTools → Application → Service Workers
2. Verify service worker active
3. Check Cache Storage
4. Verify cached resources

**Expected Result:** Service worker caching all specified resources

### 8. Real-Time Subscriptions

#### Center Capacity Updates
1. Open dashboard in two windows
2. Update center capacity in one window (via database)
3. Observe update in other window

**Expected Result:** Real-time update without refresh

#### Vehicle Location Updates
1. Open map view
2. Have vehicle operator update location
3. Observe vehicle marker move in real-time

**Expected Result:** Vehicle position updates live

#### New Messages
1. Open messages in two windows (different users)
2. Send message from one
3. Receive in other without refresh

**Expected Result:** Message appears instantly

### 9. Role-Based Access Control

#### Evacuee Role
- [ ] Can view centers and routes
- [ ] Can send messages to personnel
- [ ] Can share location
- [ ] Can report road conditions
- [ ] Cannot send broadcasts
- [ ] Cannot manage centers

**Expected Result:** Appropriate access level

#### Personnel Role
- [ ] All evacuee capabilities
- [ ] Can send broadcast messages
- [ ] Can verify road reports
- [ ] Can update center status
- [ ] Can view all evacuee locations

**Expected Result:** Extended permissions

#### Vehicle Operator Role
- [ ] Can update vehicle location
- [ ] Can update passenger count
- [ ] Can view routes
- [ ] Cannot access admin functions

**Expected Result:** Vehicle-specific access

#### Admin Role
- [ ] Full system access
- [ ] Can manage centers
- [ ] Can create routes
- [ ] Can manage users
- [ ] Can access all features

**Expected Result:** Complete system access

### 10. Mobile Experience

#### Responsive Design
- [ ] Test on phone screen size
- [ ] Verify bottom navigation
- [ ] Check touch interactions
- [ ] Test swipe gestures
- [ ] Verify readable text sizes

**Expected Result:** Optimized mobile UI

#### Touch Interactions
- [ ] Tap buttons and links
- [ ] Zoom map with pinch
- [ ] Scroll lists smoothly
- [ ] Toggle switches work

**Expected Result:** Smooth touch experience

#### PWA Features on Mobile
- [ ] Install app to home screen
- [ ] Open from home screen
- [ ] Verify standalone mode
- [ ] Check splash screen
- [ ] Test offline mode

**Expected Result:** Native app-like experience

### 11. Performance Testing

#### Load Time
- [ ] Measure initial page load
- [ ] Check time to interactive
- [ ] Verify first contentful paint

**Target:** < 2 seconds on 3G

#### Navigation Speed
- [ ] Switch between views rapidly
- [ ] Check transition smoothness
- [ ] Verify no lag

**Expected Result:** Instant navigation

#### Map Performance
- [ ] Load map with all layers
- [ ] Zoom in/out rapidly
- [ ] Pan around quickly
- [ ] Toggle layers

**Expected Result:** Smooth 60fps performance

#### Memory Usage
- [ ] Open DevTools Performance Monitor
- [ ] Use app for 10 minutes
- [ ] Check memory growth

**Expected Result:** Stable memory, no leaks

### 12. Error Handling

#### Network Errors
- [ ] Lose connection during operation
- [ ] Verify error messages
- [ ] Check offline indicator
- [ ] Verify queuing works

**Expected Result:** Graceful degradation

#### Invalid Data
- [ ] Submit empty forms
- [ ] Enter invalid email
- [ ] Use weak password

**Expected Result:** Clear error messages

#### Permission Denials
- [ ] Deny location permission
- [ ] Deny notification permission
- [ ] Verify app still works

**Expected Result:** App continues functioning

## Automated Testing Scenarios

### Unit Tests (Example)

```typescript
describe('OfflineDB', () => {
  test('adds pending message', async () => {
    await offlineDB.init();
    const message = {
      id: '123',
      content: 'Test',
      messageType: 'direct',
      priority: 1,
      timestamp: Date.now(),
      syncStatus: 'pending'
    };
    await offlineDB.addPendingMessage(message);
    const messages = await offlineDB.getPendingMessages();
    expect(messages).toContainEqual(message);
  });
});
```

### Integration Tests (Example)

```typescript
describe('Authentication Flow', () => {
  test('user can register and login', async () => {
    // Register
    await signUp('test@example.com', 'password123', 'Test User', 'evacuee');

    // Login
    const result = await signIn('test@example.com', 'password123');
    expect(result.user).toBeDefined();

    // Get profile
    const profile = await getUserProfile(result.user.id);
    expect(profile?.full_name).toBe('Test User');
  });
});
```

## Performance Benchmarks

### Lighthouse Scores

Run Lighthouse audit:
```bash
lighthouse http://localhost:5173 --view
```

**Target Scores:**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 90+
- PWA: 100

### Load Testing

Use Artillery or similar tool:

```yaml
config:
  target: 'http://localhost:5173'
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - flow:
      - get:
          url: "/"
      - get:
          url: "/api/centers"
```

## Security Testing

### Authentication
- [ ] Attempt SQL injection in login
- [ ] Try XSS in message content
- [ ] Test password strength requirements
- [ ] Verify JWT expiration

### Authorization
- [ ] Access routes without auth
- [ ] Try to access other users' data
- [ ] Attempt privilege escalation
- [ ] Test RLS policies

### Data Privacy
- [ ] Verify location data expiration
- [ ] Check message encryption
- [ ] Test data deletion
- [ ] Audit data access logs

## Acceptance Criteria

### Must Have (Critical)
- ✅ User authentication working
- ✅ Map displays Tuguegarao City
- ✅ Evacuation centers visible
- ✅ Routes downloadable
- ✅ Offline mode functional
- ✅ Messages send/receive
- ✅ PWA installable

### Should Have (Important)
- ✅ Real-time updates
- ✅ Vehicle tracking
- ✅ Road conditions display
- ✅ Location sharing
- ✅ Background sync
- ✅ Push notifications

### Nice to Have (Enhancement)
- ✅ Analytics tracking
- ✅ Advanced filtering
- ✅ Data export
- ✅ Multi-language support

## Bug Reporting Template

When reporting bugs, include:

```
**Title:** Brief description

**Environment:**
- Browser: Chrome 120
- Device: iPhone 14
- OS: iOS 17
- Network: 4G

**Steps to Reproduce:**
1. Go to...
2. Click on...
3. Observe...

**Expected Behavior:**
Should display...

**Actual Behavior:**
Shows error...

**Screenshots:**
[Attach images]

**Console Errors:**
[Paste console logs]

**Additional Context:**
Any other relevant information
```

## Test Data

### Sample Credentials

```
Evacuee:
- email: evacuee@test.com
- password: test123456

Personnel:
- email: personnel@test.com
- password: test123456

Admin:
- email: admin@test.com
- password: test123456
```

### Sample Locations (Tuguegarao City)

```
City Center: 17.6132, 121.7270
North Area: 17.6250, 121.7350
South Area: 17.6050, 121.7200
East Area: 17.6150, 121.7450
West Area: 17.6100, 121.7150
```

## Continuous Testing

### Daily Checks
- [ ] Login functionality
- [ ] Map loads correctly
- [ ] Real-time updates working
- [ ] Mobile responsive

### Weekly Checks
- [ ] Full feature test suite
- [ ] Performance audit
- [ ] Security scan
- [ ] Backup verification

### Monthly Checks
- [ ] Load testing
- [ ] User acceptance testing
- [ ] Accessibility audit
- [ ] Browser compatibility

---

**Remember:** Always test on real mobile devices in addition to browser emulators for the most accurate results.
