const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// 1. Firebase Admin SDK 설정
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

/**
 * Supabase CSV 데이터를 Firestore로 마이그레이션하는 유틸리티
 */

// CSV 파일을 읽어서 객체 배열로 반환
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    if (!fs.existsSync(filePath)) {
      resolve(null);
      return;
    }
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

// JSON 배열 처리 (CSV에서 문자열로 된 배열/객체 파싱)
function safeParseJSON(str, defaultValue = []) {
  if (!str || str === 'null') return defaultValue;
  try {
    let cleaned = str.trim();
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
      // Postgres array format {a,b} -> ["a","b"]
      const items = cleaned.substring(1, cleaned.length - 1).split(',');
      return items.map(s => s.trim().replace(/^"|"$/g, ''));
    }
    return JSON.parse(cleaned);
  } catch (e) {
    return defaultValue;
  }
}

// 날짜 변환
function safeDate(dateStr) {
  if (!dateStr || dateStr === 'null') return admin.firestore.FieldValue.serverTimestamp();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? admin.firestore.FieldValue.serverTimestamp() : d;
}

// 불리언 변환
function safeBool(val) {
  return val === 'true' || val === 't' || val === true;
}

// 문자열 변환 ("null" 방지)
function safeStr(val) {
  if (val === undefined || val === null || val === 'null' || val === 'NULL' || val === '') return null;
  return val.trim();
}

// 사용자 마이그레이션
async function migrateUsers(data) {
  console.log(`Migrating ${data.length} users...`);
  const batch = db.batch();
  for (const item of data) {
    const id = item.f_id || item.id;
    if (!id) continue;
    const docRef = db.collection('users').doc(id);
    batch.set(docRef, {
      email: safeStr(item.f_email || item.email),
      nickname: safeStr(item.f_nickname || item.nickname),
      points: parseInt(item.f_points || item.points || 0),
      tier: safeStr(item.f_tier || item.tier || '루키'),
      ageRange: safeStr(item.f_age_range || item.ageRange),
      gender: safeStr(item.f_gender || item.gender),
      role: safeStr(item.f_role || item.role || 'PICKER'),
      createdAt: safeDate(item.f_created_at || item.createdAt),
      updatedAt: safeDate(item.f_updated_at || item.updatedAt),
    });
  }
  await batch.commit();
}

// 미션1 마이그레이션
async function migrateMissions1(data) {
  console.log(`Migrating ${data.length} missions1...`);
  for (const item of data) {
    const id = item.f_id || item.id;
    if (!id) continue;
    await db.collection('missions1').doc(id).set({
      title: safeStr(item.f_title || item.title),
      kind: safeStr(item.f_kind || item.kind),
      form: safeStr(item.f_form || item.form),
      deadline: safeStr(item.f_deadline || item.deadline),
      revealPolicy: safeStr(item.f_reveal_policy || item.revealPolicy),
      creatorId: safeStr(item.f_creator_id || item.creatorId),
      status: safeStr(item.f_status || item.status || 'open'),
      thumbnailUrl: safeStr(item.f_thumbnail_url || item.thumbnailUrl),
      isLive: safeBool(item.f_is_live || item.isLive),
      showId: safeStr(item.f_show_id || item.showId),
      category: safeStr(item.f_category || item.category),
      seasonType: safeStr(item.f_season_type || item.seasonType),
      seasonNumber: item.f_season_number ? parseInt(item.f_season_number) : (item.seasonNumber ? parseInt(item.seasonNumber) : null),
      participants: parseInt(item.f_participants || item.participants || 0),
      options: safeParseJSON(item.f_options || item.options),
      submissionType: safeStr(item.f_submission_type || item.submissionType || 'selection'),
      requiredAnswerCount: parseInt(item.f_required_answer_count || item.requiredAnswerCount || 1),
      optionVoteCounts: safeParseJSON(item.f_option_vote_counts || item.optionVoteCounts, {}),
      createdAt: safeDate(item.f_created_at || item.createdAt),
      updatedAt: safeDate(item.f_updated_at || item.updatedAt),
      referenceUrl: safeStr(item.f_reference_url || item.referenceUrl),
    });
  }
}

// 미션2 마이그레이션
async function migrateMissions2(data) {
  console.log(`Migrating ${data.length} missions2...`);
  for (const item of data) {
    const id = item.f_id || item.id;
    if (!id) continue;
    await db.collection('missions2').doc(id).set({
      title: safeStr(item.f_title || item.title),
      kind: safeStr(item.f_kind || item.kind),
      form: safeStr(item.f_form || item.form || 'match'),
      deadline: safeStr(item.f_deadline || item.deadline),
      revealPolicy: safeStr(item.f_reveal_policy || item.revealPolicy),
      creatorId: safeStr(item.f_creator_id || item.creatorId),
      status: safeStr(item.f_status || item.status || 'open'),
      thumbnailUrl: safeStr(item.f_thumbnail_url || item.thumbnailUrl),
      isLive: safeBool(item.f_is_live || item.isLive),
      showId: safeStr(item.f_show_id || item.showId),
      category: safeStr(item.f_category || item.category),
      seasonType: safeStr(item.f_season_type || item.seasonType),
      seasonNumber: item.f_season_number ? parseInt(item.f_season_number) : (item.seasonNumber ? parseInt(item.seasonNumber) : null),
      participants: parseInt(item.f_participants || item.participants || 0),
      matchPairs: safeParseJSON(item.f_match_pairs || item.matchPairs, {}),
      totalEpisodes: parseInt(item.f_total_episodes || item.totalEpisodes || 8),
      episodeStatuses: safeParseJSON(item.f_episode_statuses || item.episodeStatuses, {}),
      createdAt: safeDate(item.f_created_at || item.createdAt),
      updatedAt: safeDate(item.f_updated_at || item.updatedAt),
      referenceUrl: safeStr(item.f_reference_url || item.referenceUrl),
    });
  }
}

// 투표 결과1 마이그레이션
async function migratePickResults1(data) {
  console.log(`Migrating ${data.length} pickresults1...`);
  for (const item of data) {
    const uId = item.f_user_id || item.userId;
    const mId = item.f_mission_id || item.missionId;
    if (!uId || !mId) continue;
    const id = `${uId}_${mId}`;
    await db.collection('pickresult1').doc(id).set({
      userId: safeStr(uId),
      missionId: safeStr(mId),
      selectedOption: item.f_selected_option || item.selectedOption || item.choice,
      pointsEarned: parseInt(item.f_points_earned || item.pointsEarned || 0),
      submittedAt: safeDate(item.f_submitted_at || item.f_created_at || item.submittedAt),
      createdAt: safeDate(item.f_created_at || item.createdAt),
    });
  }
}

// 투표 결과2 마이그레이션
async function migratePickResults2(data) {
  console.log(`Migrating ${data.length} pickresults2...`);
  for (const item of data) {
    const uId = item.f_user_id || item.userId;
    const mId = item.f_mission_id || item.missionId;
    if (!uId || !mId) continue;
    const id = `${uId}_${mId}`;
    await db.collection('pickresult2').doc(id).set({
      userId: safeStr(uId),
      missionId: safeStr(mId),
      votes: safeParseJSON(item.f_votes || item.votes, {}),
      updatedAt: safeDate(item.f_updated_at || item.updatedAt),
    });
  }
}

// 댓글 마이그레이션
async function migrateComments(data) {
  console.log(`Migrating ${data.length} comments/replies...`);
  for (const item of data) {
    const id = item.f_id || item.id;
    if (!id) continue;
    const parentId = item.f_parent_id || item.parentId;
    const collectionName = (parentId && parentId !== 'null' && parentId !== 'NULL') ? 'replies' : 'comments';
    
    const payload = {
      missionId: safeStr(item.f_mission_id || item.missionId),
      missionType: safeStr(item.f_mission_type || item.missionType),
      userId: safeStr(item.f_user_id || item.userId),
      content: safeStr(item.f_content || item.content),
      likesCount: parseInt(item.f_likes_count || item.likesCount || 0),
      isDeleted: safeBool(item.f_is_deleted || item.isDeleted),
      createdAt: safeDate(item.f_created_at || item.createdAt),
      updatedAt: safeDate(item.f_updated_at || item.updatedAt),
    };

    if (collectionName === 'comments') {
      payload.repliesCount = parseInt(item.f_replies_count || item.repliesCount || 0);
    } else {
      payload.commentId = safeStr(parentId);
    }

    await db.collection(collectionName).doc(id).set(payload);
  }
}

// 댓글 좋아요 마이그레이션
async function migrateCommentLikes(data) {
  console.log(`Migrating ${data.length} comment likes...`);
  for (const item of data) {
    const uId = item.f_user_id || item.userId;
    const cId = item.f_comment_id || item.commentId;
    if (!uId || !cId) continue;
    const id = `${uId}_${cId}`;
    await db.collection('comment_likes').doc(id).set({
      userId: safeStr(uId),
      commentId: safeStr(cId),
      createdAt: safeDate(item.f_created_at || item.createdAt),
    });
  }
}

// 알림 마이그레이션
async function migrateNotifications(data) {
  console.log(`Migrating ${data.length} notifications...`);
  for (const item of data) {
    const id = item.f_id || item.id;
    if (!id) continue;
    await db.collection('notifications').doc(id).set({
      userId: safeStr(item.f_user_id || item.userId),
      title: safeStr(item.f_title || item.title),
      content: safeStr(item.f_content || item.content),
      type: safeStr(item.f_type || item.type),
      isRead: safeBool(item.f_is_read || item.isRead),
      missionId: safeStr(item.f_mission_id || item.missionId),
      createdAt: safeDate(item.f_created_at || item.createdAt),
    });
  }
}

// 알림 설정 마이그레이션
async function migrateNotificationPreferences(data) {
  console.log(`Migrating ${data.length} notification preferences...`);
  for (const item of data) {
    const id = item.f_user_id || item.userId;
    if (!id) continue;
    await db.collection('notification_preferences').doc(id).set({
      userId: safeStr(id),
      emailEnabled: safeBool(item.f_email_enabled || item.emailEnabled),
      deadlineEmailEnabled: safeBool(item.f_deadline_email_enabled || item.deadlineEmailNotification),
      categories: safeParseJSON(item.f_categories || item.categories),
      updatedAt: safeDate(item.f_updated_at || item.updatedAt),
    });
  }
}

// 포인트 로그 마이그레이션
async function migratePointLogs(data) {
  console.log(`Migrating ${data.length} point logs...`);
  for (const item of data) {
    const id = item.f_id || item.id;
    if (!id) continue;
    await db.collection('pointlogs').doc(id).set({
      userId: safeStr(item.f_user_id || item.userId),
      diff: parseInt(item.f_diff || item.diff || 0),
      reason: safeStr(item.f_reason || item.reason),
      missionId: safeStr(item.f_mission_id || item.missionId),
      missionType: safeStr(item.f_mission_type || item.missionType),
      createdAt: safeDate(item.f_created_at || item.createdAt),
    });
  }
}

async function main() {
  const dataDir = './migration-data';
  if (!fs.existsSync(dataDir)) {
    console.error('Error: migration-data directory not found.');
    return;
  }

  const files = fs.readdirSync(dataDir);
  // 순서 보장을 위해 사용자 먼저 처리 권장
  const sortedFiles = files.sort((a, b) => {
    if (a.includes('user')) return -1;
    if (b.includes('user')) return 1;
    return 0;
  });

  for (const file of sortedFiles) {
    if (!file.endsWith('.csv')) continue;
    
    const filePath = path.join(dataDir, file);
    const data = await readCSV(filePath);
    if (!data) continue;

    console.log(`Processing file: ${file}`);

    if (file.includes('t_user')) await migrateUsers(data);
    else if (file.includes('t_missions1')) await migrateMissions1(data);
    else if (file.includes('t_missions2')) await migrateMissions2(data);
    else if (file.includes('t_pickresult1')) await migratePickResults1(data);
    else if (file.includes('t_pickresult2')) await migratePickResults2(data);
    else if (file.includes('t_comments')) await migrateComments(data);
    else if (file.includes('t_comment_likes')) await migrateCommentLikes(data);
    else if (file.includes('t_notifications') && !file.includes('preferences')) await migrateNotifications(data);
    else if (file.includes('t_notification_preferences')) await migrateNotificationPreferences(data);
    else if (file.includes('t_pointlogs')) await migratePointLogs(data);
    else if (file.includes('t_admin_setting')) await migrateAdminSettings(data);
  }
  
  console.log('Migration finished!');
}

// 어드민 설정 마이그레이션
async function migrateAdminSettings(data) {
  console.log(`Migrating ${data.length} admin settings...`);
  for (const item of data) {
    const key = item.f_key || item.key;
    if (!key) continue;
    await db.collection('admin_settings').doc(key).set({
      value: item.f_value || item.value,
      updatedAt: safeDate(item.f_updated_at || item.updatedAt),
    });
  }
}

main().catch(console.error);
