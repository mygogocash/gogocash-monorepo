import {
  Equals,
  IsIn,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export const POLICY_QA_FAILURE_POINT =
  'after-media-put-before-db-commit' as const;

class PolicyQaFailureInjectionIdentityDto {
  @IsIn(['dev', 'staging'])
  environment: 'dev' | 'staging';

  @Matches(/^[a-f0-9]{40}$/)
  candidate_sha: string;

  @Matches(/^policy-qa-(dev|staging)-[a-z0-9-]{3,96}$/)
  marker: string;

  @IsString()
  @Length(10, 180)
  @Matches(/^[a-z0-9][a-z0-9:-]+$/)
  request_key: string;
}

export class PolicyQaFailureInjectionDto extends PolicyQaFailureInjectionIdentityDto {
  @Equals(POLICY_QA_FAILURE_POINT)
  failure_point: typeof POLICY_QA_FAILURE_POINT;

  @IsInt()
  @Min(1)
  @Max(60)
  ttl_seconds: number;

  @Equals(true)
  one_shot: true;
}

export class PolicyQaFailureInjectionDisarmDto extends PolicyQaFailureInjectionIdentityDto {}
