#!/usr/bin/env tsx
/**
 * Supabase 스키마 검증 스크립트
 * 네이밍 법칙이 제대로 적용되었는지 확인
 */

import { config } from "dotenv"
import { resolve } from "path"

// .env.local 파일 로드
config({ path: resolve(process.cwd(), ".env.local") })

import { createClient } from "../lib/supabase/client"

async function testSchema() {
  const supabase = createClient()

  console.log("🔍 Supabase 스키마 검증 시작...\n")

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
        if (error.code === "42P01") {
          // 테이블이 존재하지 않음
          missingTables.push(tableName)
          console.log(`  ❌ ${tableName} - 테이블이 존재하지 않습니다`)
        } else {
          // 다른 오류 (RLS 정책 등)
          existingTables.push(tableName)
          console.log(`  ✅ ${tableName} - 존재함 (오류: ${error.message})`)
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
        console.log(`  ⚠️ ${tableName} - 컬럼 확인 실패: ${error.message}`)
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
      } else {
        // 테이블이 비어있어도 구조는 확인 가능
        console.log(`  ✅ ${tableName} - 테이블 존재 (데이터 없음)`)
      }
    } catch (err: any) {
      console.log(`  ❌ ${tableName} - 확인 실패: ${err.message}`)
    }
  }

  // 3. 필수 컬럼 확인 (t_users 예시)
  console.log("\n3️⃣ 필수 컬럼 확인 (t_users 예시)")
  const requiredColumns = ["f_id", "f_email", "f_nickname", "f_points", "f_tier", "f_created_at", "f_updated_at"]
  
  if (existingTables.includes("t_users")) {
    try {
      const { data, error } = await supabase.from("t_users").select("*").limit(1)
      
      if (!error && data && data.length > 0) {
        const columns = Object.keys(data[0])
        const missingColumns = requiredColumns.filter((col) => !columns.includes(col))
        
        if (missingColumns.length === 0) {
          console.log("  ✅ 모든 필수 컬럼이 존재합니다")
          requiredColumns.forEach((col) => console.log(`     - ${col}`))
        } else {
          console.log("  ⚠️ 일부 필수 컬럼이 누락되었습니다:")
          missingColumns.forEach((col) => console.log(`     - ${col}`))
        }
      } else {
        console.log("  ⚠️ 테이블이 비어있어 컬럼 구조를 확인할 수 없습니다")
      }
    } catch (err: any) {
      console.log(`  ❌ 확인 실패: ${err.message}`)
    }
  } else {
    console.log("  ⏭️ t_users 테이블이 존재하지 않아 스킵합니다")
  }

  // 4. 간단한 INSERT/UPDATE 테스트 (선택사항)
  console.log("\n4️⃣ 기본 쿼리 테스트")
  
  if (existingTables.includes("t_users")) {
    try {
      // SELECT 테스트
      const { error: selectError } = await supabase.from("t_users").select("f_id").limit(1)
      if (selectError && selectError.code !== "PGRST116") {
        console.log(`  ⚠️ SELECT 쿼리 오류: ${selectError.message}`)
      } else {
        console.log("  ✅ SELECT 쿼리 정상 작동")
      }
    } catch (err: any) {
      console.log(`  ❌ SELECT 테스트 실패: ${err.message}`)
    }
  }

  console.log("\n✅ 스키마 검증 완료!")
  console.log("\n💡 팁:")
  console.log("   - Supabase Dashboard → Table Editor에서 테이블 구조를 시각적으로 확인할 수 있습니다")
  console.log("   - SQL Editor에서 'SELECT * FROM t_users LIMIT 1' 쿼리로 컬럼 구조를 확인할 수 있습니다")
}

// 실행
testSchema().catch((err) => {
  console.error("❌ 스크립트 실행 오류:", err)
  process.exit(1)
})

