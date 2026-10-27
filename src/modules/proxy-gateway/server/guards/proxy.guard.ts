import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { getServerConfig } from '../../../../server/server-config';
import { extractApiKeyToken, hasConfiguredApiKey, type RequestHeaders } from './api-key-auth.util';
import { openCodeCredentialService } from '../../opencode-sync/opencode-credentials';
import { buildAuthErrorBody, resolveAuthErrorSurface } from '../common/auth-error-envelope';
import { saasService } from '@/modules/saas/services/saas.service';
import type { ValidateApiKeyResult } from '@/modules/saas/types';

interface ProxyRequest {
  headers: RequestHeaders;
  ip: string;
  url?: string;
  raw?: {
    saasContext?: {
      user: unknown;
      apiKey: unknown;
    };
  };
  saasContext?: {
    user: unknown;
    apiKey: unknown;
  };
}

@Injectable()
export class ProxyGuard implements CanActivate {
  private readonly logger = new Logger(ProxyGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ProxyRequest>();

    const clientToken = extractApiKeyToken(request.headers);

    // 1. Check for SaaS API keys (sk-live-...)
    if (clientToken && clientToken.startsWith('sk-')) {
      let validation: ValidateApiKeyResult = { valid: false };
      try {
        validation = saasService.validateApiKey(clientToken);
      } catch (error) {
        this.logger.warn(
          `SaaS API key lookup failed (${request.ip}): ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      if (!validation.valid || !validation.user || !validation.apiKey) {
        this.logger.warn(`Rejected invalid or revoked SaaS API key from ${request.ip}`);
        const surface = resolveAuthErrorSurface(request);
        throw new UnauthorizedException(buildAuthErrorBody(surface, 'API key validation failed'));
      }

      if (validation.user.balanceUsd <= 0) {
        this.logger.warn(
          `Rejected SaaS request due to insufficient balance ($${validation.user.balanceUsd}) for user ${validation.user.email} (${request.ip})`,
        );
        throw new HttpException(
          {
            error: {
              message: 'Insufficient balance. Please add credits to your account.',
              type: 'billing_error',
              code: 'insufficient_quota',
            },
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      const saasContext = { user: validation.user, apiKey: validation.apiKey };
      if (request.raw) {
        request.raw.saasContext = saasContext;
      }
      request.saasContext = saasContext;
      return true;
    }

    // 2. The OpenCode credential is accepted only by this model-proxy guard.
    // AdminGuard intentionally knows nothing about it, so revocation and scope stay independent.
    // OpenCode is optional: a keyring failure must not block the configured proxy API key.
    try {
      if (openCodeCredentialService.matches(clientToken)) {
        return true;
      }
    } catch (error) {
      this.logger.warn(
        `OpenCode credential check failed; continuing with proxy API key auth (${request.ip})`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    const config = getServerConfig();

    // 3. Check for API Key in config
    const apiKey = config?.api_key;

    // 4. Bypass if no api_key set (Open Mode) or config missing
    if (!hasConfiguredApiKey(apiKey)) {
      return true;
    }

    if (clientToken === apiKey) {
      return true;
    }
    this.logger.warn(`Rejected unauthorized request from ${request.ip}`);

    const surface = resolveAuthErrorSurface(request);
    throw new UnauthorizedException(buildAuthErrorBody(surface, 'API key validation failed'));
  }
}
