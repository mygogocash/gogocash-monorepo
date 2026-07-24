type QuestRecord = Record<string, any>;
type QuestDocumentLike = QuestRecord & {
  toObject?: () => QuestRecord;
};

/**
 * Admin Quest responses expose editable/auditable campaign fields, never
 * command idempotency material, actor identifiers, or object-storage ownership
 * metadata. Those fields remain server-side for CAS, replay, and cleanup.
 */
export function sanitizeAdminQuestRecord(
  quest: QuestDocumentLike,
): QuestRecord {
  const record =
    typeof quest?.toObject === 'function' ? quest.toObject() : quest;
  const {
    revision_request_key: _revisionRequestKey,
    revision_payload_hash: _revisionPayloadHash,
    publish_request_key: _publishRequestKey,
    publish_payload_hash: _publishPayloadHash,
    revision_created_by: _revisionCreatedBy,
    published_by: _publishedBy,
    banner_assets: _bannerAssets,
    media_command_key: _mediaCommandKey,
    media_attempt_token: _mediaAttemptToken,
    qa_marker: _qaMarker,
    legacy_payout_config_checksum: _legacyPayoutConfigChecksum,
    legacy_payout_resolution_command_key: _legacyPayoutResolutionCommandKey,
    legacy_payout_resolution_plan_checksum: _legacyPayoutResolutionPlanChecksum,
    ...adminQuest
  } = record;
  return adminQuest;
}
