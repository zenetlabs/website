import type { ReactDoctorConfig } from 'react-doctor/api';

export default {
  ignore: {
    files: [
      '**/dist/**',
      'dist/**',
      '**/.output/**',
      '**/.wrangler/**',
      '**/build/**',
      '**/coverage/**',
      '**/.vite/**',
      '**/.lighthouseci/**',
      '**/playwright-report/**',
    ],
  },
} satisfies ReactDoctorConfig;
