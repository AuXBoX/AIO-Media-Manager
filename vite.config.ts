import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  // Use relative paths for assets so they work in both web and Electron
  base: './',
  
  plugins: [
    react(),
    electron([
      {
        // Main process entry point
        entry: 'electron/main.js',
        onstart(options) {
          // Only auto-start in production build, not in dev mode
          if (process.env.NODE_ENV === 'production') {
            options.startup();
          }
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: [
                'electron',
                'music-metadata',
                'node-id3',
                'ffmetadata',
                'strtok3',
                'token-types',
                'file-type',
                'peek-readable',
              ],
              output: {
                format: 'cjs', // Use CommonJS for Electron main process
              },
            },
          },
        },
      },
      {
        // Preload script entry point
        entry: 'electron/preload.js',
        onstart(options) {
          // Reload preload script on change
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs', // Use CommonJS for preload script
                entryFileNames: 'preload.js',
              },
            },
          },
        },
      },
    ]),
    renderer(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.png', 'offline.html'],
      manifest: {
        name: 'AIO Media Manager',
        short_name: 'AIO Media',
        description: 'View and edit metadata for movies, TV shows, and music in Plex Media Server libraries',
        theme_color: '#3b82f6',
        background_color: '#1a1a1a',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['entertainment', 'utilities']
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            // Cache static assets (JS, CSS, fonts)
            urlPattern: /^https?:\/\/.*\.(js|css|woff|woff2|ttf|otf)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache images with stale-while-revalidate
            urlPattern: /^https?:\/\/.*\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache Plex artwork/thumbnails with stale-while-revalidate
            urlPattern: /\/photo\/.*\/transcode/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'plex-artwork',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 14 * 24 * 60 * 60, // 14 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Network-first for API requests with fallback
            urlPattern: /\/library\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'plex-api',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Network-first for other API endpoints
            urlPattern: /^https?:\/\/.*\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api/, /^\/library/],
      },
      devOptions: {
        enabled: false, // Disable in development to avoid conflicts
        type: 'module',
      },
    }),
  ],

  // Path aliases matching tsconfig.json
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/managers': path.resolve(__dirname, './src/managers'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/api': path.resolve(__dirname, './src/api'),
      '@/db': path.resolve(__dirname, './src/db'),
    },
  },

  // Development server configuration
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    hmr: {
      overlay: true,
    },
  },

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Optimized manual chunks for better caching and code splitting
        manualChunks: (id) => {
          // Vendor libraries - group by size and update frequency
          if (id.includes('node_modules/')) {
            // Core React libraries - changes infrequently
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
              return 'react-core';
            }
            
            // React Router
            if (id.includes('/react-router') || id.includes('/@remix-run/router')) {
              return 'react-router';
            }
            
            // TanStack Query
            if (id.includes('/@tanstack/react-query') || id.includes('/@tanstack/query-core')) {
              return 'tanstack-query';
            }
            
            // TanStack Virtual
            if (id.includes('/@tanstack/react-virtual') || id.includes('/@tanstack/virtual-core')) {
              return 'tanstack-virtual';
            }
            
            // State management
            if (id.includes('/zustand/')) {
              return 'zustand';
            }
            
            // HTTP client
            if (id.includes('/axios/')) {
              return 'axios';
            }
            
            // Database
            if (id.includes('/dexie')) {
              return 'dexie';
            }
            
            // XML parsing
            if (id.includes('/fast-xml-parser/')) {
              return 'xml-parser';
            }
            
            // Music metadata (large, rarely used)
            if (id.includes('/music-metadata') || id.includes('/node-id3')) {
              return 'music-metadata';
            }
            
            // Date utilities
            if (id.includes('/date-fns/')) {
              return 'date-fns';
            }
            
            // All other vendor code
            return 'vendor-other';
          }
          
          // Application code chunking
          // Pages - route-based splitting
          if (id.includes('/src/pages/')) {
            if (id.includes('AuthenticationPage')) return 'page-auth';
            if (id.includes('ServerSelectionPage')) return 'page-servers';
            if (id.includes('LibraryView')) return 'page-library';
            if (id.includes('MetadataDetailView')) return 'page-metadata';
            if (id.includes('BulkEditView')) return 'page-bulk-edit';
            if (id.includes('SettingsView')) return 'page-settings';
          }
          
          // Heavy modals - lazy loaded
          if (id.includes('/src/components/')) {
            if (id.includes('/external/ExternalSearchModal')) return 'modal-external-search';
            if (id.includes('/match/MatchCandidatesModal')) return 'modal-match-candidates';
            if (id.includes('/offline/ConflictResolutionModal')) return 'modal-conflict-resolution';
            if (id.includes('/artwork/ArtworkUploadModal')) return 'modal-artwork-upload';
            if (id.includes('/batch/OperationProgressModal')) return 'modal-operation-progress';
            if (id.includes('/artwork/ArtworkGallery')) return 'component-artwork-gallery';
            if (id.includes('/library/Virtual')) return 'component-virtual-scroll';
          }
          
          // Managers - group by functionality
          if (id.includes('/src/managers/')) {
            if (id.includes('AuthenticationManager') || id.includes('ServerManager')) {
              return 'managers-auth';
            }
            if (id.includes('LibraryManager') || id.includes('MetadataManager')) {
              return 'managers-library';
            }
            if (id.includes('CacheManager')) {
              return 'managers-cache';
            }
            return 'managers-other';
          }
          
          // External providers
          if (id.includes('/src/providers/')) {
            return 'providers-external';
          }
        },
        
        // Optimize chunk file names for better caching
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name;
          if (name.startsWith('page-')) {
            return 'assets/pages/[name]-[hash].js';
          }
          if (name.startsWith('modal-')) {
            return 'assets/modals/[name]-[hash].js';
          }
          if (name.includes('vendor') || name.includes('react') || name.includes('tanstack') || name.includes('axios') || name.includes('dexie')) {
            return 'assets/vendor/[name]-[hash].js';
          }
          return 'assets/[name]-[hash].js';
        },
        
        entryFileNames: 'assets/[name]-[hash].js',
        
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          if (name.endsWith('.css')) {
            return 'assets/css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    
    target: 'es2020',
    chunkSizeWarningLimit: 600,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      format: {
        comments: false,
      },
    },
  },

  // Environment variables prefix
  envPrefix: 'VITE_',

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'zustand',
      'axios',
      'dexie',
      'dexie-react-hooks',
    ],
  },

  // CSS configuration
  css: {
    devSourcemap: true,
  },
});
