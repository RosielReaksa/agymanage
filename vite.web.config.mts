import path from 'node:path';
import { defineConfig } from 'vite';

const root = process.cwd();

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
      kafkajs: path.resolve(root, 'src/mocks/empty.ts'),
      mqtt: path.resolve(root, 'src/mocks/empty.ts'),
      amqplib: path.resolve(root, 'src/mocks/empty.ts'),
      'amqp-connection-manager': path.resolve(root, 'src/mocks/empty.ts'),
      nats: path.resolve(root, 'src/mocks/empty.ts'),
      ioredis: path.resolve(root, 'src/mocks/empty.ts'),
      '@fastify/static': path.resolve(root, 'src/mocks/empty.ts'),
      '@fastify/view': path.resolve(root, 'src/mocks/empty.ts'),
      '@nestjs/microservices': path.resolve(root, 'src/mocks/nestjs-microservices'),
      '@nestjs/websockets': path.resolve(root, 'src/mocks/nestjs-websockets'),
    },
  },
  build: {
    target: 'node22',
    ssr: true,
    outDir: 'dist/web',
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        server: 'src/web/main.ts',
        'traffic-audit.worker': 'src/modules/proxy-gateway/audit/traffic-audit.worker.ts',
        'thought-store.worker': 'src/modules/proxy-gateway/thought-store/thought-store.worker.ts',
      },
      external: [
        'better-sqlite3',
        'keytar',
        'koffi',
        '@napi-rs/keyring',
        'bufferutil',
        'utf-8-validate',
      ],
      output: {
        format: 'cjs',
        entryFileNames: (chunk) => (chunk.name === 'server' ? 'server.cjs' : '[name].js'),
        chunkFileNames: '[name]-[hash].cjs',
      },
    },
  },
});
