import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

let cachedAuth: OAuth2Client | null = null;

export function getGoogleAuth() {
  if (cachedAuth) return cachedAuth;

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  cachedAuth = auth;
  return auth;
}

export function getCalendarClient() {
  return google.calendar({ version: 'v3', auth: getGoogleAuth() });
}

export function getGmailClient() {
  return google.gmail({ version: 'v1', auth: getGoogleAuth() });
}
