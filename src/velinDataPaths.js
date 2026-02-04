// Firestore data path helpers for Velin
// Usage: getPublicDataPath(appId), getPrivateDataPath(appId, userId)

export function getPublicDataPath(appId) {
  return `artifacts/${appId}/public/data`;
}

export function getPrivateDataPath(appId, userId) {
  return `/artifacts/${appId}/users/${userId}/`;
}
