import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';
import type { ShareEventDoc, ShareCountsDailyDoc } from './types';

export const SHARE_EVENTS_COLLECTION = 'shareEvents';
export const SHARE_COUNTS_DAILY_COLLECTION = 'shareCountsDaily';

export function shareEventsCollection(db: Firestore): CollectionReference<ShareEventDoc> {
  return collection(db, SHARE_EVENTS_COLLECTION) as CollectionReference<ShareEventDoc>;
}

export function shareCountsDailyCollection(
  db: Firestore,
): CollectionReference<ShareCountsDailyDoc> {
  return collection(db, SHARE_COUNTS_DAILY_COLLECTION) as CollectionReference<ShareCountsDailyDoc>;
}

export function shareCountsDailyDoc(
  db: Firestore,
  yyyymmdd: string,
  urlHashId: string,
): DocumentReference<ShareCountsDailyDoc> {
  return doc(db, SHARE_COUNTS_DAILY_COLLECTION, `${yyyymmdd}_${urlHashId}`) as DocumentReference<ShareCountsDailyDoc>;
}
