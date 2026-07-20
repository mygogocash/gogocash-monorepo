import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export const ORION_VERSION = 'orion-0.1.0' as const;

export type OrionMode = 'LIVE' | 'DEGRADED' | 'OFF';

export type OrionHealthResponse = {
  status: 'ok' | 'degraded' | 'error';
  mode: OrionMode;
  degraded: boolean;
  mongo: { ok: boolean; latencyMs: number | null };
  vertex: { configured: boolean; ok: boolean };
  tavily: { configured: boolean };
  version: typeof ORION_VERSION;
};

function resolveOrionMode(raw: string | undefined): OrionMode {
  const normalized = String(raw ?? 'DEGRADED')
    .trim()
    .toUpperCase();
  if (normalized === 'LIVE' || normalized === 'OFF') return normalized;
  return 'DEGRADED';
}

function isConfigured(value: string | undefined): boolean {
  const trimmed = String(value ?? '').trim();
  return trimmed.length > 0 && trimmed !== 'PLACEHOLDER';
}

@Injectable()
export class OrionHealthService {
  private readonly logger = new Logger(OrionHealthService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async getHealth(): Promise<OrionHealthResponse> {
    const mode = resolveOrionMode(process.env.ORION_MODE);
    const mongo = await this.pingMongo();
    const vertexConfigured = isConfigured(
      process.env.ORION_VERTEX_PROJECT ?? process.env.VERTEX_API_KEY,
    );
    const tavilyConfigured = isConfigured(process.env.TAVILY_API_KEY);

    // Phase 0: Vertex/Tavily are optional. Default mode is DEGRADED and we do
    // not call external AI providers — report configured flags only.
    // vertex.ok stays false until a later phase wires a real Vertex ping.
    const vertexOk = false;
    const degraded =
      mode === 'DEGRADED' || mode === 'OFF' || !mongo.ok || !vertexOk;

    let status: OrionHealthResponse['status'] = 'ok';
    if (!mongo.ok || mode === 'OFF') {
      status = 'error';
    } else if (degraded) {
      status = 'degraded';
    }

    return {
      status,
      mode,
      degraded,
      mongo,
      vertex: { configured: vertexConfigured, ok: vertexOk },
      tavily: { configured: tavilyConfigured },
      version: ORION_VERSION,
    };
  }

  private async pingMongo(): Promise<{
    ok: boolean;
    latencyMs: number | null;
  }> {
    const db = this.connection?.db;
    if (!db) {
      return { ok: false, latencyMs: null };
    }
    const started = Date.now();
    try {
      await db.admin().command({ ping: 1 });
      return { ok: true, latencyMs: Date.now() - started };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'unknown mongo ping error';
      this.logger.warn(`ORION mongo ping failed: ${message}`);
      return { ok: false, latencyMs: Date.now() - started };
    }
  }
}
