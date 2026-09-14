'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/utils/api';

export interface Settings {
  HF_TOKEN: string;
  TRAINING_FOLDER: string;
  DATASETS_FOLDER: string;
  MODELS_PATH: string;
  ZIMAGE_TEXT_ENCODER: string;
  RANKINGS_SEPARATE_ENCODERS: string;
}

export default function useSettings() {
  const [settings, setSettings] = useState({
    HF_TOKEN: '',
    TRAINING_FOLDER: '',
    DATASETS_FOLDER: '',
    MODELS_PATH: '',
    ZIMAGE_TEXT_ENCODER: '',
    RANKINGS_SEPARATE_ENCODERS: 'true',
  });
  const [isSettingsLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    apiClient
      .get('/api/settings')
      .then(res => res.data)
      .then(data => {
        setSettings({
          HF_TOKEN: data.HF_TOKEN || '',
          TRAINING_FOLDER: data.TRAINING_FOLDER || '',
          DATASETS_FOLDER: data.DATASETS_FOLDER || '',
          MODELS_PATH: data.MODELS_PATH || '',
          ZIMAGE_TEXT_ENCODER: data.ZIMAGE_TEXT_ENCODER || '',
          RANKINGS_SEPARATE_ENCODERS: data.RANKINGS_SEPARATE_ENCODERS === 'false' ? 'false' : 'true',
        });
        setIsLoaded(true);
      })
      .catch(error => console.error('Error fetching settings:', error));
  }, []);

  return { settings, setSettings, isSettingsLoaded };
}
