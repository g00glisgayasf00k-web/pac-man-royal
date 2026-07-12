import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import {
  ADMOB_INTERSTITIAL_ID,
  ADS_EVERY_N_GAMES,
  ADS_GAMES_KEY,
} from './config';

const ADS_PENDING_KEY = 'pacRoyalAdPending';

let initialized = false;
let showing = false;
let prepared = false;

export function adsSupported(): boolean {
  return Capacitor.isNativePlatform();
}

export async function initAds(): Promise<void> {
  if (!adsSupported() || initialized) return;
  try {
    await AdMob.initialize({
      initializeForTesting: false,
    });
    initialized = true;
  } catch (err) {
    console.warn('[ads] init failed', err);
  }
}

function readGamesPlayed(): number {
  try {
    return Math.max(0, Number(localStorage.getItem(ADS_GAMES_KEY)) || 0);
  } catch {
    return 0;
  }
}

function writeGamesPlayed(n: number) {
  try {
    localStorage.setItem(ADS_GAMES_KEY, String(n));
  } catch {
    /* ignore */
  }
}

function isAdPending(): boolean {
  try {
    return localStorage.getItem(ADS_PENDING_KEY) === '1';
  } catch {
    return false;
  }
}

function setAdPending(pending: boolean) {
  try {
    if (pending) localStorage.setItem(ADS_PENDING_KEY, '1');
    else localStorage.removeItem(ADS_PENDING_KEY);
  } catch {
    /* ignore */
  }
}

async function prepareInterstitial(): Promise<void> {
  if (!adsSupported()) return;
  try {
    if (!initialized) await initAds();
    await AdMob.prepareInterstitial({ adId: ADMOB_INTERSTITIAL_ID });
    prepared = true;
  } catch (err) {
    prepared = false;
    console.warn('[ads] prepare failed', err);
  }
}

async function showInterstitial(): Promise<void> {
  if (!adsSupported() || showing) return;
  showing = true;
  try {
    if (!initialized) await initAds();
    if (!prepared) {
      await AdMob.prepareInterstitial({ adId: ADMOB_INTERSTITIAL_ID });
    }
    await AdMob.showInterstitial();
  } catch (err) {
    console.warn('[ads] interstitial failed', err);
  } finally {
    prepared = false;
    showing = false;
  }
}

/**
 * Call when a match ends. Counts the game and, every 2 matches,
 * queues an interstitial for the *next* start (Play Again / Start Game).
 */
export function recordMatchCompleted(): void {
  const games = readGamesPlayed() + 1;
  writeGamesPlayed(games);

  if (games % ADS_EVERY_N_GAMES !== 0) return;
  setAdPending(true);
  if (adsSupported()) void prepareInterstitial();
}

/** Show a queued interstitial before kicking off the next match. */
export async function showPendingAdIfNeeded(): Promise<void> {
  if (!isAdPending()) return;
  setAdPending(false);
  await showInterstitial();
}
