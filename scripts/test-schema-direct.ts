#!/usr/bin/env tsx
/**
 * Supabase 스키마 검증 스크립트 (직접 URL 사용)
 * 네이밍 법칙이 제대로 적용되었는지 확인
 */

import { createClient } from "@supabase/supabase-js"

// Supabase 연결 정보 (명령줄 인자 또는 환경 변수에서 가져오기)
const SUPABASE_URL = process.argv[2] || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yqfvlgwfqclsutjtluja.supabase.co"
const SUPABASE_ANON_KEY = process.argv[3] || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Supabase ANON_KEY가 필요합니다!")
  console.error("\n사용 방법:")
  console.error("  1. 환경 변수 설정:")
  console.error("     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key npm run db:test")
  console.error("  2. 명령줄 인자 사용:")
  console.error("     npm run db:test:direct <url> <anon-key>")
  console.error("\nANON_KEY 확인 방법:")
  console.error("  Supabase Dashboard → Settings → API → anon public 키")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testSchema() {
  console.log("🔍 Supabase 스키마 검증 시작...")
  console.log(`📍 URL: ${SUPABASE_URL}\n`)

  // 1. 테이블 목록 확인
  console.log("1️⃣ 테이블 존재 여부 확인")
  const expectedTables = [
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

  const missingTables: string[] = []
  const existingTables: string[] = []

  for (const tableName of expectedTables) {
    try {
      // 간단한 쿼리로 테이블 존재 확인
      const { error } = await supabase.from(tableName).select("f_id").limit(1)
      
      if (error) {
        if (error.code === "42P01" || error.message.includes("does not exist")) {
          // 테이블이 존재하지 않음
          missingTables.push(tableName)
          console.log(`  ❌ ${tableName} - 테이블이 존재하지 않습니다`)
        } else {
          // 다른 오류 (RLS 정책 등) - 테이블은 존재함
          existingTables.push(tableName)
          console.log(`  ✅ ${tableName} - 존재함`)
        }
      } else {
        existingTables.push(tableName)
        console.log(`  ✅ ${tableName} - 존재함`)
      }
    } catch (err: any) {
      missingTables.push(tableName)
      console.log(`  ❌ ${tableName} - 확인 실패: ${err.message}`)
    }
  }

  console.log(`\n📊 결과: ${existingTables.length}/${expectedTables.length} 테이블 존재`)
  
  if (missingTables.length > 0) {
    console.log(`\n⚠️ 누락된 테이블:`)
    missingTables.forEach((t) => console.log(`   - ${t}`))
  }

  // 2. 주요 테이블의 컬럼 구조 확인
  console.log("\n2️⃣ 주요 테이블 컬럼 구조 확인")
  
  const testTables = ["t_users", "t_missions1", "t_missions2"]
  
  for (const tableName of testTables) {
    if (!existingTables.includes(tableName)) {
      console.log(`  ⏭️ ${tableName} - 스킵 (테이블이 존재하지 않음)`)
      continue
    }

    try {
      // 첫 번째 행 조회하여 컬럼명 확인
      const { data, error } = await supabase.from(tableName).select("*").limit(1)
      
      if (error) {
        // RLS 정책 때문에 데이터가 없을 수 있지만, 컬럼 구조는 확인 가능
        // information_schema를 직접 조회하는 대신, 에러 메시지에서 힌트를 얻거나
        // 빈 테이블이라도 구조는 확인 가능
        console.log(`  ⚠️ ${tableName} - 데이터 조회 실패: ${error.message}`)
        console.log(`     (테이블은 존재하지만 RLS 정책 또는 데이터 부재로 컬럼 확인 불가)`)
        continue
      }

      if (data && data.length > 0) {
        const columns = Object.keys(data[0])
        const fColumns = columns.filter((c) => c.startsWith("f_"))
        const nonFColumns = columns.filter((c) => !c.startsWith("f_"))

        console.log(`  ✅ ${tableName}`)
        console.log(`     - 총 컬럼 수: ${columns.length}`)
        console.log(`     - f_ 접두사 컬럼: ${fColumns.length}개`)
        
        if (nonFColumns.length > 0) {
          console.log(`     ⚠️ f_ 접두사 없는 컬럼: ${nonFColumns.join(", ")}`)
        } else {
          console.log(`     ✅ 모든 컬럼이 f_ 접두사를 사용합니다`)
        }
        console.log(`     - 컬럼 목록: ${columns.join(", ")}`)
      } else {
        // 테이블이 비어있어도 구조는 확인 가능
        console.log(`  ✅ ${tableName} - 테이블 존재 (데이터 없음)`)
        console.log(`     ⚠️ 데이터가 없어 컬럼 구조를 확인할 수 없습니다`)
        console.log(`     💡 Supabase Dashboard → Table Editor에서 확인하세요`)
      }
    } catch (err: any) {
      console.log(`  ❌ ${tableName} - 확인 실패: ${err.message}`)
    }
  }

  // 3. SQL로 직접 컬럼 구조 확인 (PostgreSQL information_schema 사용)
  console.log("\n3️⃣ SQL 쿼리로 컬럼 구조 확인")
  
  try {
    // RPC 함수를 통해 직접 SQL 실행 (Supabase에서는 제한적)
    // 대신 각 테이블의 구조를 추론
    console.log("  💡 SQL Editor에서 다음 쿼리를 실행하세요:")
    console.log("     SELECT column_name FROM information_schema.columns")
    console.log("     WHERE table_name = 't_users' AND table_schema = 'public'")
    console.log("     ORDER BY ordinal_position;")
  } catch (err: any) {
    console.log(`  ⚠️ SQL 쿼리 실행 불가: ${err.message}`)
  }

  // 4. 간단한 쿼리 테스트
  console.log("\n4️⃣ 기본 쿼리 테스트")
  
  if (existingTables.includes("t_users")) {
    try {
      // SELECT 테스트
      const { error: selectError } = await supabase.from("t_users").select("f_id").limit(1)
      if (selectError) {
        if (selectError.code === "PGRST116" || selectError.message.includes("No rows")) {
          console.log("  ✅ SELECT 쿼리 정상 작동 (데이터 없음)")
        } else {
          console.log(`  ⚠️ SELECT 쿼리 오류: ${selectError.message}`)
          console.log(`     (RLS 정책 또는 권한 문제일 수 있습니다)`)
        }
      } else {
        console.log("  ✅ SELECT 쿼리 정상 작동")
      }
    } catch (err: any) {
      console.log(`  ❌ SELECT 테스트 실패: ${err.message}`)
    }
  }

  // 최종 요약
  console.log("\n" + "=".repeat(60))
  console.log("📋 검증 요약")
  console.log("=".repeat(60))
  console.log(`✅ 생성된 테이블: ${existingTables.length}/${expectedTables.length}`)
  
  if (existingTables.length === expectedTables.length) {
    console.log("🎉 모든 테이블이 정상적으로 생성되었습니다!")
  } else {
    console.log("⚠️ 일부 테이블이 누락되었습니다. SQL 스키마를 다시 실행하세요.")
  }
  
  console.log("\n💡 추가 확인 방법:")
  console.log("   1. Supabase Dashboard → Table Editor에서 테이블 구조 확인")
  console.log("   2. SQL Editor에서 scripts/verify-schema.sql 실행")
  console.log("   3. 각 테이블의 컬럼이 f_ 접두사를 사용하는지 확인")
}

// 실행
testSchema().catch((err) => {
  console.error("❌ 스크립트 실행 오류:", err)
  process.exit(1)
})








