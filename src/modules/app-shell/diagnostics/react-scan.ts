import { scan } from 'react-scan';

/**
 * Vite injects this before the renderer entry only for an explicitly enabled
 * development session. Keep this module free of application imports so React
 * Scan can install its instrumentation before React mounts.
 */
scan({ enabled: true });
