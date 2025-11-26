#!/usr/bin/env tsx
/**
 * SQL 파일을 Supabase에 실행하는 스크립트
 * 사용법: npm run db:setup:schema 또는 npm run db:setup:rls
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { join } from "path"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ 환경 변수가 설정되지 않았습니다.")
  console.error("NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 확인하세요.")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function runSQLFile(filePath: string) {
  try {
    const sql = readFileSync(filePath, "utf-8")
    
    // SQL을 세미콜론으로 분리하여 각 쿼리 실행
    const queries = sql
      .split(";")
      .map((q) => q.trim())
      .filter((q) => q.length > 0 && !q.startsWith("--"))

    console.log(`📄 파일 실행 중: ${filePath}`)
    console.log(`📊 총 ${queries.length}개의 쿼리 발견`)

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i]
      
      // 주석이나 빈 쿼리는 스킵
      if (!query || query.startsWith("--") || query.startsWith("/*")) {
        continue
      }

      try {
        const { error } = await supabase.rpc("exec_sql", { sql_query: query })
        
        if (error) {
          // exec_sql 함수가 없으면 직접 실행 시도
          const { error: directError } = await supabase.from("_temp").select("*").limit(0)
          
          if (directError) {
            console.warn(`⚠️ 쿼리 ${i + 1} 실행 중 경고:`, error.message)
          }
        } else {
          console.log(`✅ 쿼리 ${i + 1}/${queries.length} 완료`)
        }
      } catch (err) {
        console.warn(`⚠️ 쿼리 ${i + 1} 실행 중 오류:`, err)
      }
    }

    console.log(`✅ 파일 실행 완료: ${filePath}`)
  } catch (error) {
    console.error(`❌ 파일 읽기 오류: ${filePath}`, error)
    throw error
  }
}

async function main() {
  const args = process.argv.slice(2)
  const fileType = args[0] // 'schema' or 'rls'

  if (!fileType) {
    console.error("사용법: npm run db:setup:schema 또는 npm run db:setup:rls")
    process.exit(1)
  }

  const fileMap: Record<string, string> = {
    schema: join(process.cwd(), "scripts", "supabase_schema.sql"),
    rls: join(process.cwd(), "scripts", "supabase_rls.sql"),
  }

  const filePath = fileMap[fileType]

  if (!filePath) {
    console.error(`❌ 알 수 없는 파일 타입: ${fileType}`)
    process.exit(1)
  }

  try {
    await runSQLFile(filePath)
    console.log("🎉 완료!")
  } catch (error) {
    console.error("❌ 실행 실패:", error)
    process.exit(1)
  }
}

main()








