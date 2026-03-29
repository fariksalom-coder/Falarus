import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessVocabularySubtopicRoute,
  isVocabularyTopicLockedForUser,
} from '../src/utils/vocabularyAccess.ts';

const freeAccess = {
  lessons_free_limit: 3,
  vocabulary_free_topic: 1,
  vocabulary_free_subtopic: 1,
  subscription_active: false,
  patent_course_active: false,
  vnzh_course_active: false,
  vocabulary_free_topic_id: 'kundalik-hayot',
  vocabulary_free_subtopic_id: 'salomlashish-xayrlashish-odob',
};

test('free user can open only configured free topic/subtopic pair', () => {
  assert.equal(
    isVocabularyTopicLockedForUser(freeAccess, 'kundalik-hayot'),
    false
  );
  assert.equal(
    isVocabularyTopicLockedForUser(freeAccess, 'oqish-va-ish'),
    true
  );
  assert.equal(
    canAccessVocabularySubtopicRoute(
      freeAccess,
      'kundalik-hayot',
      'salomlashish-xayrlashish-odob'
    ),
    true
  );
  assert.equal(
    canAccessVocabularySubtopicRoute(freeAccess, 'kundalik-hayot', 'oila'),
    false
  );
});

test('paid user can access any vocabulary route', () => {
  assert.equal(
    canAccessVocabularySubtopicRoute(
      { ...freeAccess, subscription_active: true },
      'oqish-va-ish',
      'ish-ofis'
    ),
    true
  );
});
