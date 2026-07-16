# Current Location Route Start Design

## Goal

Let a traveller start walking and restaurant routes from their current position.

## Scope

- `src/features/sights/Sights.tsx` and its `WalkingMap` show a current-location control, request browser geolocation on demand, and render a distinct "Вы здесь" marker.
- The Mapbox walking-directions request prepends the current location to the ordered sight coordinates.
- The walking-map bounds include the current location when it is available.
- `src/features/restaurants/Restaurants.tsx` adds the same control to the restaurant-map panel and shares the temporary coordinate with `RestaurantCityMap`.
- `src/features/restaurants/RestaurantCityMap.tsx` renders the same distinct marker and includes it in map bounds.
- Restaurant Google Maps route URLs prepend the current location to the displayed restaurant coordinates.

## Location Lifecycle

- A user presses the location control; the browser uses `navigator.geolocation.getCurrentPosition` with high accuracy and a 10-second timeout.
- During lookup, the control displays a spinner and cannot start a second request.
- On success, the coordinate is held in React component state only. It is never written to trip data, local storage, or Supabase.
- On unavailable geolocation, denied permission, timeout, or any lookup error, show a toast and preserve existing routes and markers.
- Location is a one-time snapshot; the application does not use `watchPosition`.

## Visual Behaviour

- The current-location control sits with the relevant map controls and uses the location-crosshairs icon before success, a spinner while locating, and a location-dot after success.
- The current location uses a blue, non-draggable marker with popup text "Вы здесь". Numbered destination markers retain their current appearance and order.
- Route destination order stays unchanged. The user location is the implicit first route coordinate and does not receive a number in the lists.

## Verification

- With a mocked successful geolocation result, both maps receive and display a current-location marker.
- The walking-direction URL starts with the current coordinate before sight coordinates.
- Restaurant Google Maps URLs start with the current coordinate before restaurant coordinates.
- A mocked geolocation failure leaves routes usable and produces the existing error feedback.
- A Node 22 production build completes successfully.
