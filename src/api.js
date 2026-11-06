import { Capacitor } from '@capacitor/core';

// På nett kalles API-et relativt. I Android-appen ligger web-filene lokalt, så API-et må nås via full adresse.
const BASE = import.meta.env.VITE_API_BASE
  || (Capacitor.isNativePlatform() ? 'https://www.melkeruten.no' : '');

export const api = (path) => `${BASE}${path}`;
