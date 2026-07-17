import {
  ConflictException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';

import {
  POLICY_QA_FAILURE_POINT,
  PolicyQaFailureInjectionDisarmDto,
  PolicyQaFailureInjectionDto,
} from './dto/policy-qa-failure-injection.dto';

const POLICY_QA_FAILURE_INJECTION_CLOCK = Symbol(
  'POLICY_QA_FAILURE_INJECTION_CLOCK',
);

type ArmedFailureInjection = {
  environment: 'dev' | 'staging';
  candidate_sha: string;
  marker: string;
  request_key: string;
  failure_point: typeof POLICY_QA_FAILURE_POINT;
  one_shot: true;
  armed_at_ms: number;
  expires_at_ms: number;
};

export type PolicyQaFailureInjectionConsumeInput = Pick<
  ArmedFailureInjection,
  'environment' | 'candidate_sha' | 'request_key' | 'failure_point'
>;

@Injectable()
export class PolicyQaFailureInjectionHook {
  private readonly armed = new Map<string, ArmedFailureInjection>();

  constructor(
    @Optional()
    @Inject(POLICY_QA_FAILURE_INJECTION_CLOCK)
    private readonly clock: () => number = Date.now,
  ) {}

  armOneShot(input: PolicyQaFailureInjectionDto) {
    const now = this.clock();
    const current = this.armed.get(input.request_key);
    if (current && current.expires_at_ms > now) {
      throw new ConflictException(
        'A failure injection is already armed for this request key',
      );
    }
    const record: ArmedFailureInjection = {
      environment: input.environment,
      candidate_sha: input.candidate_sha,
      marker: input.marker,
      request_key: input.request_key,
      failure_point: POLICY_QA_FAILURE_POINT,
      one_shot: true,
      armed_at_ms: now,
      expires_at_ms: now + input.ttl_seconds * 1_000,
    };
    this.armed.set(record.request_key, record);
    return {
      armed: true as const,
      one_shot: true as const,
      environment: record.environment,
      candidate_sha: record.candidate_sha,
      marker: record.marker,
      request_key: record.request_key,
      failure_point: record.failure_point,
      armed_at: new Date(record.armed_at_ms).toISOString(),
      expires_at: new Date(record.expires_at_ms).toISOString(),
    };
  }

  /**
   * Aggregate integration point. A successful match is deleted before true is
   * returned, so even a throwing caller cannot trigger the same injection twice.
   */
  consumeOnce(input: PolicyQaFailureInjectionConsumeInput): boolean {
    const current = this.armed.get(input.request_key);
    if (!current) return false;
    if (current.expires_at_ms <= this.clock()) {
      this.armed.delete(input.request_key);
      return false;
    }
    if (
      current.environment !== input.environment ||
      current.candidate_sha !== input.candidate_sha ||
      current.failure_point !== input.failure_point
    ) {
      return false;
    }
    this.armed.delete(input.request_key);
    return true;
  }

  disarm(
    input: Pick<PolicyQaFailureInjectionDisarmDto, 'marker' | 'request_key'>,
  ) {
    const current = this.armed.get(input.request_key);
    if (!current || current.marker !== input.marker) return false;
    this.armed.delete(input.request_key);
    return true;
  }
}
