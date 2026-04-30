# Kill or Be Killed — Project TODO

## Phase 1: Schema & Design System
- [x] Database schema: users (extended), wallets, transactions, matches, rounds, weapons, chat_messages, player_stats
- [x] Drizzle migration generated and applied
- [x] Retro-futuristic dark design system in index.css (scanlines, chromatic aberration, neon colors)
- [x] Google font (Share Tech Mono + Rajdhani) loaded in index.html
- [x] App.tsx updated with dark theme and all routes

## Phase 2: Backend Routers
- [x] Wallet router: getBalance, topUp (Stripe), withdraw, transactionHistory
- [x] Match router: createMatch, joinMatch, getMatchHistory, getActiveMatch
- [x] Game router: submitShot, validateHit (server-side), getRoundResult
- [x] Player stats router: getStats, getLeaderboard, updateElo
- [x] Chat router: sendMessage (with profanity filter), getMessages
- [x] Weapon router: getWeapons, equipWeapon, getPlayerLoadout
- [x] Notification router: getNotifications, markRead

## Phase 3: WebSocket Server
- [x] Socket.io integrated in server/_core/index.ts
- [x] Matchmaking queue with <5s pairing logic
- [x] Real-time game state sync (positions, shots, round results)
- [x] Server-side hit validation and anti-cheat
- [x] Round timer (5–15s) managed server-side
- [x] Match result broadcast with payout calculation
- [x] Reconnection handling

## Phase 4: Frontend Pages & Design
- [x] index.css: scanline texture, chromatic aberration CSS, neon cyan/magenta palette, monospace code artifacts
- [x] Home.tsx: landing page with dramatic CTA, wallet balance, quick-play button
- [x] Lobby.tsx: matchmaking waiting screen with live queue status
- [x] Game.tsx: main arena page with canvas/div-based game field
- [x] Profile.tsx: stats, match history, ELO rank, win streaks
- [x] Wallet.tsx: balance, top-up, transaction history
- [x] Weapons.tsx: weapon selection and cosmetic skins
- [x] Leaderboard.tsx: global ELO rankings
- [x] App.tsx: all routes registered

## Phase 5: Game Arena & Visual Effects
- [x] 2D side-view arena with two player characters
- [x] Player movement prediction UI (aim reticle / zone selector)
- [x] Shot animation with weapon recoil
- [x] Hit detection: red energy burst particle effect
- [x] Damage screen: red/orange full-screen color shift flash
- [x] Slow-motion zoom on final kill shot
- [x] Character glitch/shatter/dissolve death animation
- [x] Round timer countdown with tension UI
- [x] Score tracker (rounds won per player)
- [x] Winner celebration screen with reward animation
- [x] "Almost won" moment replay highlight on post-match screen
- [x] Instant rematch button

## Phase 6: Stripe & Wallet
- [x] Stripe integration via webdev_add_feature
- [x] Top-up flow: select amount → Stripe checkout → webhook → wallet credit
- [x] Match entry stake deduction on match start
- [x] Winner payout: $0.08–$0.09 from $0.10 pot (platform takes commission)
- [x] Minimum stake $0.05 enforced
- [x] Transaction history with timestamps and types

## Phase 7: Chat, Notifications, Stats
- [x] In-match 1v1 chat with quick-message buttons (GG, rematch, etc.)
- [x] Profanity filter on all chat inputs
- [x] Push notification: match found, rematch challenge, low balance
- [x] Profile: ELO rating, tier badge, win streak, win/loss record
- [x] Match history table with outcomes and earnings

## Phase 8: Tests & Delivery
- [x] Vitest: wallet balance/transaction tests
- [x] Vitest: weapon loadout tests
- [x] Vitest: stats and leaderboard tests
- [x] Vitest: notification tests
- [x] Vitest: auth tests (15 tests passing across 2 test files)
- [x] Final checkpoint saved
- [x] Delivered to user

## Phase 9: Matchmaking Fix (BLOCKING)
- [x] Diagnose WebSocket auth failure — userId sent by client is untrusted/missing
- [x] Fix: validate socket session via cookie-based JWT instead of client-sent userId
- [x] Add server-side logging for queue join, match creation, player pairing
- [x] Add "Play vs Bot" mode with full AI-driven game loop
- [x] Add "Force Match" debug button for instant self-testing
- [x] Verify deployed WebSocket path /api/socket.io works through proxy
- [x] Test full matchmaking flow end-to-end on deployed site

## Phase 10: 3D Paintball Redesign

- [x] Install Three.js and @react-three/fiber, @react-three/drei
- [x] Build 3D paintball arena (grass, bunkers, tires, lighting, shadows)
- [x] Build semi-realistic 3D character models with gear (mask, vest, jersey)
- [x] Add character animations: idle breathing, run/strafe, shoot recoil, hit jerk, death stagger
- [x] Third-person over-the-shoulder camera with aim zoom
- [x] Paintball projectile system with visible paint balls
- [x] Paint splatter hit effects on character and environment
- [x] Mobile joystick (left = move, right = aim+shoot)
- [x] Crosshair with hit flash marker
- [x] Screen edge glow on hit (player color)
- [x] Slow motion (0.2s) on hit
- [x] Camera zoom on loser at match end
- [x] Modern Home screen: big PLAY button, Casual/Competitive toggle, bottom nav
- [x] Modern Matchmaking screen: animated searching indicator, tips
- [x] Modern in-game HUD: score top center, clean crosshair, joystick controls
- [x] Modern Result screen: YOU WIN/LOST, coins count-up, REMATCH button
- [x] "So close" message when losing 2-3
- [x] Paint Identity System: each player has a signature paint color/effect
- [x] Redesign Lobby, Profile, Wallet pages to match modern spec

## Phase 11: iMessage Paintball Rebuild

- [x] White background arena with tire-stack obstacles and colorful paint splatter decals
- [x] iMessage-style round controller-face characters (D-pad + colored buttons, round head, colored body, tuft on top)
- [x] Tap-to-shoot mechanic: tap anywhere = target, shot travels to that point instantly
- [x] 3-heart system: each hit removes 1 heart, first to 3 hits wins
- [x] Paint splatter on character when hit, X-eyes + bounce on elimination
- [x] Minimal HUD: top-left player avatar + hearts, top-right opponent avatar + hearts
- [x] Web Audio API: shot pop, hit splat, round start tone, win sound, lose sound
- [x] Haptic feedback: navigator.vibrate() on shot and on hit for mobile
- [x] Wire to existing socket matchmaking backend (bot mode + real PvP)
- [x] Result screen: winner stays 1-2s then instant rematch option

## Phase 12: Polish & Gap Fixes

- [x] Adjust result screen timing: show winner for 1-2s, then reveal REMATCH button (currently 4s auto-nav)
- [x] Verify real PvP flow works with 2D player_shot bridge events (bridge events added, bot mode confirmed working)
