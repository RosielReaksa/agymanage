import 'reflect-metadata';
import { logger } from '@/shared/logging/logger';
import { initDatabase } from '@/modules/account/public';
import { CloudAccountRepo } from '@/modules/cloud-account/persistence/cloudHandler';
import { ConfigManager } from '@/modules/config/ipc/manager';
import { bootstrapNestServer } from '@/server/main';
import { localAccountImportCoordinator } from '@/modules/cloud-account/local-import/local-account-import-coordinator.service';
import { CloudMonitorService } from '@/modules/cloud-account/services/CloudMonitorService';

async function startWebServer(): Promise<void> {
  process.env.WEB_SERVER_MODE = '1';
  logger.info('Starting Antigravity Manager Web Server...');

  // Initialize storage & accounts
  initDatabase();
  await CloudAccountRepo.init();
  localAccountImportCoordinator.openAdmission();

  // Load configuration
  const config = ConfigManager.loadConfig();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : config.proxy.port || 8045;
  config.proxy.port = port;

  // Start NestJS / Fastify server with embedded Web UI, oRPC, and API Gateway
  const result = await bootstrapNestServer(config.proxy);
  if (!result.success) {
    logger.error(`Failed to start web server: ${result.message}`);
    process.exit(1);
  }

  // Start account quota background monitoring
  try {
    CloudMonitorService.openAdmission();
    CloudMonitorService.syncSchedule();
  } catch (err) {
    logger.warn('Could not sync monitor schedule:', err);
  }

  const url = `http://localhost:${result.port}`;
  console.log('\n======================================================');
  console.log(`🚀 Antigravity Manager Web is running!`);
  console.log(`🌐 Website Dashboard: ${url}`);
  console.log(`🤖 API Proxy Gateway:  ${url}/v1`);
  console.log('======================================================\n');
}

startWebServer().catch((err) => {
  logger.error('Fatal error starting web server:', err);
  process.exit(1);
});
