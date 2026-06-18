import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const log: string[] = [];

  try {
    log.push('Connecting to Supabase...');

    // 1. Ensure "iam-solo" program exists
    let { data: program, error: progErr } = await supabase
      .from('programs')
      .select('*')
      .eq('slug', 'iam-solo')
      .single();

    if (progErr || !program) {
      log.push('Program "iam-solo" not found. Creating...');
      const { data: newProg, error: createProgErr } = await supabase
        .from('programs')
        .insert({
          title: '나는 솔로',
          slug: 'iam-solo',
          category: 'reality_show',
          broadcaster: 'SBS Plus / ENA',
          status: 'active'
        })
        .select()
        .single();

      if (createProgErr) {
        throw new Error(`Failed to create program: ${createProgErr.message}`);
      }
      program = newProg;
      log.push('Program "iam-solo" created successfully.');
    } else {
      log.push('Program "iam-solo" exists.');
    }

    // 2. Ensure "32" season exists
    let { data: season, error: seasErr } = await supabase
      .from('seasons')
      .select('*')
      .eq('program_id', program.id)
      .eq('slug', '32')
      .single();

    if (seasErr || !season) {
      log.push('Season "32" not found. Creating...');
      const { data: newSeas, error: createSeasErr } = await supabase
        .from('seasons')
        .insert({
          program_id: program.id,
          title: '32기',
          slug: '32',
          season_number: '32',
          status: 'active'
        })
        .select()
        .single();

      if (createSeasErr) {
        throw new Error(`Failed to create season: ${createSeasErr.message}`);
      }
      season = newSeas;
      log.push('Season "32" created successfully.');
    } else {
      log.push('Season "32" exists.');
    }

    // 3. Ensure bucket "realpick" exists in Storage
    const bucketName = 'realpick';
    log.push(`Checking Storage bucket "${bucketName}"...`);
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === bucketName);

    if (!bucketExists) {
      log.push(`Bucket "${bucketName}" not found. Attempting to create...`);
      const { error: createBuckErr } = await supabase.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg'],
        fileSizeLimit: 10485760 // 10MB
      });
      if (createBuckErr) {
        log.push(`Bucket creation failed/limited: ${createBuckErr.message}. Will use local fallback URL or pre-existing fallback.`);
      } else {
        log.push(`Bucket "${bucketName}" created successfully.`);
      }
    } else {
      log.push(`Bucket "${bucketName}" already exists.`);
    }

    // 4. Define Cast Members list
    const castMembers = [
      { display_name: '영수', gender_group: 'male', filename: '32_youngsu.png', summary: '32기 남자 출연자 영수' },
      { display_name: '영호', gender_group: 'male', filename: '32_youngho.png', summary: '32기 남자 출연자 영호' },
      { display_name: '영식', gender_group: 'male', filename: '32_youngsik.png', summary: '32기 남자 출연자 영식' },
      { display_name: '영철', gender_group: 'male', filename: '32_youngchul.png', summary: '32기 남자 출연자 영철' },
      { display_name: '광수', gender_group: 'male', filename: '32_kwangsu.png', summary: '32기 남자 출연자 광수' },
      { display_name: '상철', gender_group: 'male', filename: '32_sangchul.png', summary: '32기 남자 출연자 상철' },
      { display_name: '경수', gender_group: 'male', filename: '32_gyeongsu.png', summary: '32기 남자 출연자 경수' },
      { display_name: '영숙', gender_group: 'female', filename: '32_youngsook.png', summary: '32기 여자 출연자 영숙' },
      { display_name: '정숙', gender_group: 'female', filename: '32_jungsook.png', summary: '32기 여자 출연자 정숙' },
      { display_name: '순자', gender_group: 'female', filename: '32_soonja.png', summary: '32기 여자 출연자 순자' },
      { display_name: '영자', gender_group: 'female', filename: '32_youngja.png', summary: '32기 여자 출연자 영자' },
      { display_name: '옥순', gender_group: 'female', filename: '32_oksoon.png', summary: '32기 여자 출연자 옥순' },
      { display_name: '현숙', gender_group: 'female', filename: '32_hyunsook.png', summary: '32기 여자 출연자 현숙' },
      { display_name: '정희', gender_group: 'female', filename: '32_junghee.png', summary: '32기 여자 출연자 정희' }
    ];

    // 5. Insert Cast Members and Upload Images
    for (const cast of castMembers) {
      log.push(`Processing ${cast.display_name}...`);

      // Check if already exists in this season
      let { data: existingCast } = await supabase
        .from('cast_members')
        .select('*')
        .eq('season_id', season.id)
        .eq('display_name', cast.display_name)
        .single();

      let imageUrl = `/images/cast/${cast.filename}`; // Fallback local path
      const localImagePath = path.join(process.cwd(), 'public', 'images', 'cast', cast.filename);

      if (fs.existsSync(localImagePath)) {
        try {
          const fileBuffer = fs.readFileSync(localImagePath);
          const storagePath = `32_${cast.filename}`;

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from(bucketName)
            .upload(storagePath, fileBuffer, {
              contentType: 'image/png',
              upsert: true
            });

          if (uploadErr) {
            log.push(`  Storage upload failed for ${cast.display_name}: ${uploadErr.message}`);
          } else {
            // Get public URL
            const { data: publicUrlData } = supabase.storage
              .from(bucketName)
              .getPublicUrl(storagePath);
            
            if (publicUrlData?.publicUrl) {
              imageUrl = publicUrlData.publicUrl;
              log.push(`  Uploaded image to storage: ${imageUrl}`);
            }
          }
        } catch (imgErr: any) {
          log.push(`  Image processing error for ${cast.display_name}: ${imgErr.message}`);
        }
      } else {
        log.push(`  Local file ${cast.filename} not found in public folder.`);
      }

      if (existingCast) {
        log.push(`  Cast member ${cast.display_name} already exists. Updating image and info...`);
        const { error: updateErr } = await supabase
          .from('cast_members')
          .update({
            profile_image_url: imageUrl,
            one_line_summary: cast.summary,
            publish_status: 'published',
            review_status: 'approved'
          })
          .eq('id', existingCast.id);

        if (updateErr) {
          log.push(`  Failed to update cast ${cast.display_name}: ${updateErr.message}`);
        }
      } else {
        log.push(`  Creating new cast member ${cast.display_name}...`);
        const { data: newCast, error: insertErr } = await supabase
          .from('cast_members')
          .insert({
            season_id: season.id,
            display_name: cast.display_name,
            gender_group: cast.gender_group,
            profile_image_url: imageUrl,
            one_line_summary: cast.summary,
            publish_status: 'published',
            review_status: 'approved'
          })
          .select()
          .single();

        if (insertErr) {
          log.push(`  Failed to insert cast ${cast.display_name}: ${insertErr.message}`);
        } else {
          existingCast = newCast;
        }
      }

      // Add dummy content blocks to make presentation look rich and complete
      if (existingCast) {
        const castId = existingCast.id;
        
        // Check content blocks
        const { data: blocks } = await supabase
          .from('content_blocks')
          .select('*')
          .eq('cast_member_id', castId);

        if (!blocks || blocks.length === 0) {
          log.push(`  Adding default content blocks for ${cast.display_name}...`);
          
          const defaultBlocks = [
            {
              cast_member_id: castId,
              title: '자기소개 카드',
              items: [
                '나이: 30대 초중반 추정 (방송 미공개)',
                '직업: 자기소개 방송 세션 대기 중',
                `성격: 리얼예능 32기 "${cast.display_name}"의 매력 발산 중`
              ],
              confidence: 'high',
              sort_order: 1
            },
            {
              cast_member_id: castId,
              title: '첫인상 & 방송 활약상',
              items: [
                '첫인상 선택: 호감도를 이끌어내는 인상적인 첫 등장',
                '자막 요약: "자기소개를 통해 반전 매력을 드러낼 예정입니다."',
                '특이사항: 사모님이 주목하시는 32기 에이스 멤버!'
              ],
              confidence: 'medium',
              sort_order: 2
            }
          ];

          const { error: blockErr } = await supabase
            .from('content_blocks')
            .insert(defaultBlocks);

          if (blockErr) {
            log.push(`    Failed to insert blocks for ${cast.display_name}: ${blockErr.message}`);
          } else {
            log.push(`    Added content blocks successfully.`);
          }
        }
      }
    }

    log.push('Setup completed successfully!');
    return NextResponse.json({ success: true, log });
  } catch (err: any) {
    log.push(`Fatal Error: ${err.message}`);
    return NextResponse.json({ success: false, log }, { status: 500 });
  }
}
