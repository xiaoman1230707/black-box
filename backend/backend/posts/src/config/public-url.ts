import { getRuntimeEnv } from './env';

const normalizeBaseUrl = (baseUrl: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error('Public media base URL must be a valid http(s) URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Public media base URL must be a valid http(s) URL');
  }

  return baseUrl.replace(/\/+$/, '');
};

const normalizeMediaPath = (relativePath: string): string => {
  const path = relativePath
    .trim()
    .replace(/^\/+/, '')
    .replace(/^uploads\/+/, '');
  if (
    !path ||
    path.includes('..') ||
    /^[a-z][a-z\d+.-]*:/i.test(path) ||
    path.includes('?') ||
    path.includes('#')
  ) {
    throw new Error('Public media path must be a safe uploads-relative path');
  }
  return path;
};

const buildPublicUrl = (relativePath: string, baseUrl: string): string =>
  `${normalizeBaseUrl(baseUrl)}/uploads/${normalizeMediaPath(relativePath)}`;

const publicMediaUrl = (relativePath: string): string =>
  buildPublicUrl(relativePath, getRuntimeEnv().publicBaseUrl);

export { buildPublicUrl, publicMediaUrl };
