import React from 'react';

interface DatabaseScheduleBannerProps {
  onDatabaseSwitched?: () => void;
  currentUser?: {
    name?: string;
    username?: string;
    role?: string;
  } | null;
}

export const DatabaseScheduleBanner: React.FC<DatabaseScheduleBannerProps> = () => {
  return null;
};
