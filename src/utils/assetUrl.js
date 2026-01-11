/**
 * Resuelve una URL de asset (avatar, logo, etc.)
 * Si es una URL absoluta (http/https), la retorna directamente
 * Si es una ruta relativa, la combina con la URL base de la API
 * 
 * @param {string|null} path - Ruta del asset
 * @returns {string|null} - URL completa del asset
 */
export const getAssetUrl = (path) => {
  if (!path) return null;
  
  // Si ya es una URL absoluta, retornarla directamente
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Si es un data URL (base64), retornarlo directamente
  if (path.startsWith('data:')) {
    return path;
  }
  
  // Obtener la URL base de la API y remover /api
  const apiUrl = import.meta.env.VITE_API_URL || 'http://orkela.localhost/api';
  const baseUrl = apiUrl.replace('/api', '');
  
  // Asegurar que la ruta comienza con /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${normalizedPath}`;
};

export default getAssetUrl;
