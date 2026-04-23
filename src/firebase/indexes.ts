/**
 * Firestore composite indexes used by Caspian Share. v0.4 needs none — the
 * sharded counter only does single-field reads. Indexes will be added in
 * v1.0.0 when the detailed event log lands.
 */
export const CASPIAN_SHARE_FIRESTORE_INDEXES = {
  indexes: [],
  fieldOverrides: [],
} as const;
