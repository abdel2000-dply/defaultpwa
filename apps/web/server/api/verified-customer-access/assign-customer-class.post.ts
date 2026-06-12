import { defineEventHandler, getRequestHeader, readBody, setResponseStatus } from 'h3';
import { useRuntimeConfig } from '#imports';

const plentyIdCookie = 'plentyID';
const pwaSessionIdCookie = 'pwa-session-id';

const getNumericSuffix = (cookieName: string, baseName: string) => {
  if (cookieName === baseName) return '';

  const suffix = cookieName.replace(baseName, '');
  return /^\d+$/.test(suffix) ? suffix : '';
};

const matchesCookiePattern = (cookieName: string, pattern: string) => {
  if (cookieName === pattern) return true;

  const suffix = cookieName.replace(pattern, '');
  return /^\d+$/.test(suffix);
};

const changeCookieName = (cookieHeader: string, oldName: string, newName: string) =>
  cookieHeader
    .split(';')
    .map((cookie) => {
      const trimmedCookie = cookie.trim();
      const [cookieName = ''] = trimmedCookie.split('=');

      if (!cookieName || matchesCookiePattern(cookieName, newName)) return '';

      if (matchesCookiePattern(cookieName, oldName)) {
        const suffix = getNumericSuffix(cookieName, oldName);
        return trimmedCookie.replace(`${cookieName}=`, `${newName}${suffix}=`);
      }

      return trimmedCookie;
    })
    .filter(Boolean)
    .join('; ');

const parseResponseBody = (text: string) => {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const runtimeConfig = useRuntimeConfig();
  const apiEndpoint = runtimeConfig.public.apiEndpoint;

  if (!apiEndpoint) {
    setResponseStatus(event, 500);
    return {
      success: false,
      message: 'Missing API endpoint configuration.',
    };
  }

  const cookie = getRequestHeader(event, 'cookie');
  const csrfToken = getRequestHeader(event, 'x-csrf-token');
  const locale = getRequestHeader(event, 'locale');
  const forwardedCookie = cookie ? changeCookieName(cookie, pwaSessionIdCookie, plentyIdCookie) : '';
  const targetUrl = `${apiEndpoint}/rest/verified-customer-access/assign-customer-class`;

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-config-id': String(runtimeConfig.public.configId || ''),
      'x-security-token': process.env.API_SECURITY_TOKEN || '',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      ...(locale ? { locale } : {}),
      ...(forwardedCookie ? { cookie: forwardedCookie } : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  setResponseStatus(event, response.status);

  return parseResponseBody(text);
});
