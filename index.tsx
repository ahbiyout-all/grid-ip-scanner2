
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

function isPublicPublishedOrigin(loc: Location): boolean {
  if (loc.protocol !== 'https:') return false;
  const host = loc.hostname.toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
    return false;
  }
  if (/^ais-(dev|pre)-/i.test(host) || /\.run\.app$/i.test(host)) {
    return false;
  }
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
    return false;
  }
  return true;
}

function syncCanonicalAndOgUrl(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!isPublicPublishedOrigin(window.location)) return;

  const cleanPath = window.location.pathname === '/index.html' ? '/' : window.location.pathname || '/';
  const canonicalUrl = `${window.location.origin}${cleanPath}`;

  const canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonicalLink) {
    canonicalLink.href = canonicalUrl;
  }

  const ogUrlMeta = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  if (ogUrlMeta) {
    ogUrlMeta.content = canonicalUrl;
  }
}

syncCanonicalAndOgUrl();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
