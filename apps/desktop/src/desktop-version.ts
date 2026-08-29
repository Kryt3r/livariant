const DESKTOP_RC_VERSION = /^(\d+\.\d+\.\d+)-rc\.(\d+)$/;

export const formatDesktopVersion = (version: string) => {
  const match = DESKTOP_RC_VERSION.exec(version.trim());
  if (match) return `Desktop Preview ${match[2]}`;
  return `Desktop ${version}`;
};
