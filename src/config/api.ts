const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_URL não configurada.',
  );
}

export const API_BASE_URL =
  apiUrl.replace(/\/+$/, '');
