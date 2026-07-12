import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import { ADMOB_INTERSTITIAL_ID, ADS_EVERY_N_GAMES, ADS_GAMES_KEY } from './config';

let initialized = false;
let showing = false;

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

/** Increment match count; show interstitial on 2nd, 4th, 6th… completed games. */
export async function onMatchCompleted(): Promise<void> {
  if (!adsSupported()) return;

  const games = readGamesPlayed() + 1;
  writeGamesPlayed(games);

  if (games % ADS_EVERY_N_GAMES !== 0) return;
  await showInterstitial();
}

async function showInterstitial(): Promise<void> {
  if (!adsSupported() || showing) return;
  showing = true;
  try {
    if (!initialized) await initAds();
    await AdMob.prepareInterstitial({
      adId: ADMOB_INTERSTITIAL_ID,
    });
    await AdMob.showInterstitial();
  } catch (err) {
    console.warn('[ads] interstitial failed', err);
  } finally {
    showing = false;
  }
}
