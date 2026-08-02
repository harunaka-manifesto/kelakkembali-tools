# Homepage Search Experience Plan

## Goal

Improve homepage search for mobile without moving or resizing the existing search bar.

When the homepage search bar is tapped, a separate full-width search composer opens above the device keyboard. A dark backdrop isolates the search interaction. Submitting the query closes the keyboard and composer, then reveals the existing filtered customer results.

This plan covers interaction and implementation only. The customer filtering and result presentation already exist and should be reused unchanged.

## Product context

Kelak Kembali Tools is a mobile-first, static single-page website with no build step. Its UI is defined in `index.html` and `styles.css`, while routing, state, and interactions live in `app.js` under the shared `window.KK` namespace.

The homepage currently has one native search input. `renderCustomerList()` filters the already-loaded customer collection by name, phone number, or Instagram handle. It also owns the existing no-result flow that offers to create a customer using the entered name.

The project already tracks the mobile keyboard using `window.visualViewport` and publishes its height through the `--keyboard-offset` CSS custom property. The new search composer should reuse that mechanism.

## Agreed direction

- Keep the original homepage search bar in its current layout position.
- Remove the proposed enlargement or morph animation.
- Open a separate search composer when the original bar is tapped or focused.
- Make the composer full-width on mobile and keep it directly above the keyboard.
- Place a dark overlay behind the composer.
- Apply the query only after the user presses Enter/Search.
- Dismiss the composer downward with the keyboard.
- Support backdrop tap, Escape, browser Back, and swipe-down cancellation.
- Preserve and reuse the existing search-result UI.
- Treat mobile as the primary experience and provide a restrained desktop adaptation.

## Interaction states

### 1. Idle

- The existing homepage search bar remains visible in its normal position.
- It displays the currently applied query, if any.
- The customer list displays results for the applied query.
- No backdrop or floating composer is mounted visibly.

### 2. Opening

When the user taps or focuses the homepage search bar:

1. Save the current page scroll position.
2. Copy the applied query into a draft query.
3. Show the full-viewport dark backdrop.
4. Show the floating search composer.
5. Focus its input and place the caret at the end.
6. Lock interaction and scrolling behind the backdrop.

The original search bar remains untouched beneath the backdrop. There is no enlargement or transition between the two bars.

### 3. Editing

- Input changes update only the draft query.
- The customer list behind the backdrop does not filter while the user types.
- The composer follows changes to `--keyboard-offset` so it remains directly above the visible keyboard.
- The native keyboard action should read **Search** through `enterkeyhint="search"`.

### 4. Submitting

When the user presses Enter/Search:

1. Prevent native form navigation or page reload.
2. Copy the trimmed draft query into the original homepage input.
3. Call the existing `renderCustomerList()` function once.
4. Blur the composer input to dismiss the keyboard.
5. Keep the composer visible while `visualViewport` reports the keyboard closing, allowing it to move downward with the keyboard.
6. Fade out the backdrop and remove the modal state once the viewport settles.
7. Ensure the original search bar and beginning of the result list are visible without an unnecessary animated page jump.

Submitting an empty query clears the applied search and restores the full customer list.

### 5. Cancelling

The user can cancel by:

- Tapping the dark backdrop.
- Pressing Escape.
- Using browser or device Back.
- Swiping downward from the composer's drag area.

Cancellation should:

1. Discard the draft query.
2. Leave the applied query and customer results unchanged.
3. Blur the composer input.
4. Follow the keyboard downward before hiding.
5. Restore the saved page scroll position.
6. Return focus to the homepage search bar when appropriate.

Browser Back should dismiss the search layer before navigating away from the homepage. Its temporary history state must integrate with the existing hash router without adding duplicate homepage entries.

## Visual specification

### Backdrop

- Fixed across the complete visual viewport.
- Black at approximately 48% opacity.
- Blocks pointer interaction with the homepage.
- Fades in and out over approximately 150–180ms.
- Sits below the composer and above every homepage section.

### Composer

- Fixed above the keyboard using `bottom: var(--keyboard-offset)`.
- Full-width on mobile.
- White outer surface with 16px horizontal and approximately 10–12px vertical padding.
- The inner search field reuses the current Figma treatment:
  - White background.
  - 1px black border.
  - 12px corner radius.
  - Existing search icon.
  - Existing typography.
  - Existing subtle bottom shadow.
- Include a small drag area above the input for swipe-down dismissal. Gesture handling should not be attached to the text-editing surface.
- Respect the device safe area when the software keyboard is not present.

There should be no scale, enlargement, or morphing animation. The composer's vertical movement should primarily come from the keyboard and visual viewport changing position.

### Desktop adaptation

On devices without a visible software keyboard:

- Keep the dark viewport backdrop.
- Present the composer at the bottom center of the viewport.
- Align its maximum width with the homepage's existing 390px product canvas.
- Add a small bottom margin and rounded outer corners so it reads as a focused search panel instead of an edge-to-edge mobile keyboard accessory.

## Accessibility

- Mark the search layer as a modal dialog with an accessible label.
- Keep the original and composer inputs uniquely labelled.
- Move focus into the composer when it opens.
- Prevent keyboard focus from escaping behind the modal while it is open.
- Restore focus to the original search field after cancellation.
- Ensure Escape always dismisses the modal before other homepage actions run.
- Preserve native input editing and the Search keyboard action.
- Under `prefers-reduced-motion: reduce`, remove fades and gesture-settling animations while keeping the same state transitions.
- Maintain visible focus styles for desktop keyboard users.

## Implementation outline

### `index.html`

- Keep the existing `#customerSearch` input as the visible homepage trigger and applied-query display.
- Add one search overlay outside the normal homepage flow so it can cover the complete viewport.
- Include:
  - Backdrop.
  - Modal/dialog container.
  - Drag area.
  - Duplicate `type="search"` input with `enterkeyhint="search"`.
  - A form wrapper so Enter/Search has one explicit submit path.

### `styles.css`

- Add hidden, opening, open, and closing states for the search overlay.
- Layer the backdrop and composer above homepage content.
- Position the composer with the existing `--keyboard-offset` variable.
- Add background scroll locking without losing the saved homepage position.
- Reuse or share the existing homepage search-field declarations to prevent the two inputs from drifting visually.
- Add the desktop bottom-panel adaptation.
- Add reduced-motion overrides.

### `app.js`

- Cache references to the overlay, backdrop, form, composer input, and drag area.
- Track:
  - Whether search mode is open.
  - The draft query.
  - The applied query already stored in `#customerSearch`.
  - Saved page scroll position.
  - Whether a temporary history entry belongs to the search overlay.
- Add dedicated `openHomepageSearch`, `submitHomepageSearch`, and `closeHomepageSearch` functions.
- Reuse `syncVisualViewport()` and `--keyboard-offset`; do not introduce a second keyboard-height calculation.
- Keep `renderCustomerList()` as the sole filtering and results renderer.
- Replace live filtering from the original input with explicit filtering on composer submit.
- Coordinate close completion with `visualViewport` resize/scroll events, with a short timeout fallback for browsers that do not expose them reliably.
- Add backdrop, Escape, Back, and vertical swipe handlers.
- Close the overlay safely if routing leaves the homepage.

## Gesture behavior

- Start swipe tracking only from the drag area, not the input.
- Follow the pointer vertically during a downward drag.
- Dismiss after either:
  - Approximately 48px of downward travel, or
  - A clear downward release velocity.
- Otherwise return the composer to its resting position.
- Ignore horizontal gestures and multi-touch input.
- Disable gesture animation under reduced-motion preferences.

## Existing behavior that must remain intact

- Search continues matching customer name, phone, and Instagram handle.
- Filtering remains local to the already-loaded customer collection.
- Existing customer sort order remains unchanged.
- A query with no matches still shows the current add-customer action.
- The typed name still passes into the new-customer route.
- Loading, error, empty, and populated customer-list states remain owned by the current renderer.
- The homepage layout, cards, hero, alerts, and navigation remain unchanged.

## Verification matrix

### Core flow

- Tap the original bar and confirm the duplicate composer receives focus.
- Confirm the backdrop blocks homepage interaction.
- Type a query and confirm results do not change before submission.
- Press Search and confirm the correct results appear after dismissal.
- Submit an empty query and confirm all customers return.
- Reopen and confirm the applied query is prefilled.

### Cancellation

- Backdrop tap cancels without applying the draft.
- Escape cancels and restores focus.
- Browser/device Back closes search without leaving the homepage.
- Swipe down closes search without changing results.
- A short swipe returns the composer to position.

### Keyboard and viewport

- iOS Safari: composer remains attached to the keyboard while opening and closing.
- Android Chrome: composer remains attached to the resized visual viewport.
- Keyboard close from the native dismiss control closes the composer cleanly.
- Orientation or viewport-size changes do not strand the composer onscreen.
- The backdrop continues covering the viewport when the page is scrolled.

### Accessibility and desktop

- Tab focus stays inside the open search layer.
- Screen readers announce the dialog and search input clearly.
- Reduced-motion mode has no unnecessary animation.
- Desktop browsers show a centered bottom panel aligned with the homepage canvas.
- Mouse, keyboard, and touch submission all use the same commit path.

## Acceptance criteria

- The original homepage search bar never moves or resizes.
- The floating composer stays directly above the visible mobile keyboard.
- Customer results do not change until Enter/Search is pressed.
- Submission closes the keyboard and composer before presenting the applied result state.
- Backdrop tap, Escape, browser Back, and swipe cancel without applying draft changes.
- The currently applied query is restored whenever search is reopened.
- Background content cannot scroll, receive focus, or receive clicks while search is open.
- Existing empty-result and add-customer behavior is preserved.
- The interaction works in current iOS Safari, Android Chrome, and desktop Safari/Chrome.

## Out of scope

- Redesigning customer result cards.
- Changing the fields or matching rules used by search.
- Server-side search or additional Supabase queries.
- Fuzzy matching, autocomplete, search suggestions, or recent searches.
- Changes to the homepage layout outside the search interaction.
