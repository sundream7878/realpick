#!/usr/bin/env tsx
/**
 * Supabase 스키마 컬럼 구조 검증 스크립트
 * 네이밍 법칙(f_ 접두사) 확인
 */

import { config } from "dotenv"
import { resolve } from "path"
import { createClient } from "@supabase/supabase-js"

// .env.local 파일 로드
config({ path: resolve(process.cwd(), ".env.local") })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ 환경 변수가 설정되지 않았습니다!")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function checkColumns() {
  console.log("🔍 컬럼 구조 검증 시작...\n")

  // PostgreSQL information_schema를 사용하여 컬럼 정보 조회
  // Supabase는 RPC를 통해 SQL을 실행할 수 있지만, 직접 information_schema 조회는 제한적
  // 대신 각 테이블에 더미 데이터를 삽입해서 구조를 확인하거나
  // 또는 Supabase의 REST API를 통해 확인

  const tables = [
    "t_users",
    "t_missions1",
    "t_missions2",
    "t_episodes",
    "t_pickresult1",
    "t_pickresult2",
    "t_pointlogs",
    "t_mypage",
    "t_comments",
    "t_replies",
    "t_comment_likes",
    "t_reply_likes",
  ]

  console.log("📋 각 테이블의 컬럼 구조 확인\n")

  for (const tableName of tables) {
    try {
      // 테이블에 더미 데이터 삽입 시도 (구조 확인용)
      // 하지만 RLS 정책 때문에 실패할 수 있음
      
      // 대신 테이블의 스키마를 추론하기 위해
      // Supabase의 REST API를 사용하거나
      // 또는 간단한 SELECT로 구조 확인
      
      const { error } = await supabase
        .from(tableName)
        .select("*")
        .limit(0) // 데이터는 가져오지 않고 구조만 확인

      if (error) {
        // 에러 메시지에서 힌트를 얻을 수 있지만, 정확한 컬럼 목록은 어려움
        console.log(`  ⚠️ ${tableName} - 직접 확인 필요`)
        console.log(`     (RLS 정책으로 인해 구조 확인 제한)`)
      } else {
        console.log(`  ✅ ${tableName} - 접근 가능`)
      }
    } catch (err: any) {
      console.log(`  ❌ ${tableName} - 확인 실패: ${err.message}`)
    }
  }

  console.log("\n" + "=".repeat(60))
  console.log("💡 정확한 컬럼 구조 확인 방법")
  console.log("=".repeat(60))
  console.log("\nSupabase Dashboard에서 다음 SQL을 실행하세요:\n")
  console.log("-- 모든 테이블의 컬럼 구조 확인")
  console.log("SELECT")
  console.log("  table_name,")
  console.log("  column_name,")
  console.log("  data_type,")
  console.log("  CASE")
  console.log("    WHEN column_name LIKE 'f_%' THEN '✅'")
  console.log("    ELSE '❌'")
  console.log("  END as naming_status")
  console.log("FROM information_schema.columns")
  console.log("WHERE table_schema = 'public'")
  console.log("  AND table_name LIKE 't_%'")
  console.log("ORDER BY table_name, ordinal_position;\n")
  
  console.log("또는 scripts/verify-schema.sql 파일을 SQL Editor에서 실행하세요.")
}

checkColumns().catch((err) => {
  console.error("❌ 스크립트 실행 오류:", err)
  process.exit(1)
})







