# FocusGrove — App Design Context & Architecture

This document provides a complete overview of the FocusGrove web application. Use this context to understand the app's current structure, screens, and navigation flow before proposing design changes (e.g., redesigning the main Dashboard screen).

## 1. Concept & Visual Style
- **App Goal:** A focus/productivity app for people with ADHD. Users earn "focus minutes" by concentrating on tasks, which they can later spend in a custom "Rewards Store".
- **Platform:** Mobile-first Web App (SPA - Single Page Application).
- **Aesthetic:** Premium Dark Mode, Glassmorphism, Neon/Glow accents.
- **Color Palette:**
  - Backgrounds: Deep dark blue/black (`#0a0f1a`, `#111827`)
  - Glass Cards: Semi-transparent black with blur (`rgba(17, 24, 39, 0.7)`, `backdrop-filter: blur(20px)`)
  - Accents: Vibrant Teal/Turquoise (`#00d4aa`) and Emerald Green (`#10b981`)
  - Danger/Warnings: Red (`#f85149`)
- **Typography:** Google Fonts 'Inter', clean and modern.

## 2. Navigation Flow
- The app uses a **Bottom Navigation Bar** with 4 tabs: Home (Dashboard), Focus, Rewards, Settings.
- Only one screen is active (visible) at a time.
- The bottom nav is visible on all screens **except** during an active Focus Session, where it hides to prevent distraction.

## 3. Screens Overview

### Screen 1: Dashboard (`#screen-dashboard`)
**Purpose:** The main landing screen.
**Current Elements:**
- **Header:** Logo on the left, Language switch (RU/EN) on the right.
- **Stats Grid:** 3 cards showing "Total Hours", "Day Streak", and a highlighted "Balance (min)" card.
- **Duration Selector:** Pills to select session length (25, 45, 60) or a custom number input.
- **Start Button:** A massive primary button with a pulsing glow effect (`#btn-start-focus`).
- **Rewards Preview:** A mini-list showing the top 3 rewards the user is closest to affording, with their cost and a status (e.g., "Need X min" or "Available!").

### Screen 2: Focus Mode (`#screen-focus`)
**Purpose:** The active timer screen where the user focuses.
**Current Elements:**
- **Header:** Large timer (countdown or countup), toggle button to switch timer mode, and a small badge showing the target duration.
- **3D Canvas:** The center of the screen is dominated by a Three.js canvas where a 3D procedural low-poly tree grows in real-time as the timer progresses.
- **Footer:** A progress bar (0% to 100%) and a secondary button to "End early".
- **Strict Mode:** If the user switches tabs or minimizes the browser, a warning modal appears. Doing it twice resets the session completely.

### Screen 3: Rewards Store (`#screen-rewards`)
**Purpose:** Where users spend their earned focus minutes on custom rewards.
**Current Elements:**
- **Header:** Title and a prominent badge showing the current available balance.
- **Add Button:** Primary button to create a new custom reward.
- **Rewards Grid:** Cards showing the user's created rewards. Each card has an emoji, title, cost, and a "Claim" button. If the user doesn't have enough balance, the button is locked and shows "Need X min".
- **History:** A list at the bottom showing previously claimed rewards and timestamps.

### Screen 4: Settings (`#screen-settings`)
**Purpose:** App configuration.
**Current Elements:**
- Dropdown for default session duration.
- Toggle for default timer mode (Countdown/Countup).
- Toggle for language (RU/EN).
- Danger zone button to wipe all LocalStorage data.

## 4. Modals (Overlays)
The app uses glassmorphic modals centered on the screen with a darkened backdrop:
- **Warning Modal:** "You left the app. Don't do it again!"
- **Reset Modal:** "Focus broken. Session reset."
- **Complete Modal:** "Session complete! You earned X minutes."
- **Add Reward Modal:** Form with Emoji picker, Name input, and Cost input.
- **Celebration Modal:** Appears when a reward is claimed, includes a confetti animation.
- **Confirm Delete Modal:** Standard "Are you sure?" prompt.

## 5. What Needs to be Redesigned
*(When giving this to a design AI, specify what you want to change here. For example: "I want to completely redesign the Dashboard (#screen-dashboard) to make it look like a futuristic control panel, keeping the same elements but rearranging them for better UX.")*
