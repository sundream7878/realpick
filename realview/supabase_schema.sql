-- 1. 프로그램 테이블 (programs)
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    aliases TEXT[] DEFAULT '{}',
    category VARCHAR(50) DEFAULT 'reality_show',
    broadcaster VARCHAR(100),
    official_home_url TEXT,
    official_youtube_url TEXT,
    ott_url TEXT,
    logo_url TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('active', 'inactive', 'draft')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 시즌/기수 테이블 (seasons)
CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    aliases TEXT[] DEFAULT '{}',
    season_number VARCHAR(50),
    start_date DATE,
    end_date DATE,
    description TEXT,
    cover_image_url TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('active', 'inactive', 'draft')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(program_id, slug)
);

-- 3. 회차 테이블 (episodes)
CREATE TABLE episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    episode_number VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    aired_at DATE,
    spoiler_level VARCHAR(20) DEFAULT 'none',
    official_clip_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(season_id, episode_number)
);

-- 4. 출연자 테이블 (cast_members)
CREATE TABLE cast_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    real_name VARCHAR(100),
    gender_group VARCHAR(10) CHECK (gender_group IN ('male', 'female', 'other', 'unknown')),
    profile_image_url TEXT,
    profile_image_source TEXT,
    one_line_summary TEXT,
    first_episode_id UUID REFERENCES episodes(id) ON DELETE SET NULL,
    spoiler_scope TEXT,
    source_note TEXT,
    publish_status VARCHAR(20) DEFAULT 'draft' CHECK (publish_status IN ('draft', 'published', 'hidden')),
    review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
    correction_status VARCHAR(20) DEFAULT 'none' CHECK (correction_status IN ('none', 'requested', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. 동적 콘텐츠 블록 테이블 (content_blocks)
CREATE TABLE content_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cast_member_id UUID REFERENCES cast_members(id) ON DELETE CASCADE,
    episode_id UUID REFERENCES episodes(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    items TEXT[] DEFAULT '{}' NOT NULL,
    source_timestamp VARCHAR(50),
    confidence VARCHAR(10) DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
    spoiler_flag BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. 공식 링크 테이블 (official_links)
CREATE TABLE official_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    episode_id UUID REFERENCES episodes(id) ON DELETE SET NULL,
    cast_member_id UUID REFERENCES cast_members(id) ON DELETE CASCADE,
    link_type VARCHAR(50) CHECK (link_type IN ('official_intro_clip', 'official_highlight', 'ott_replay', 'official_homepage', 'official_preview')),
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    provider VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. OCR 인식 로그 테이블 (ocr_logs)
CREATE TABLE ocr_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_text TEXT,
    matched_program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    matched_season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
    confidence NUMERIC(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. 정보 정정 요청 테이블 (correction_requests)
CREATE TABLE correction_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('program', 'season', 'episode', 'cast_member', 'content_block')),
    target_id UUID NOT NULL,
    requester_type VARCHAR(20) NOT NULL CHECK (requester_type IN ('self', 'official', 'viewer')),
    request_text TEXT NOT NULL,
    contact VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. 광고 관리 테이블 (ads)
CREATE TABLE ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position VARCHAR(50) DEFAULT 'bottom_banner' CHECK (position IN ('bottom_banner', 'side', 'inline')),
    title VARCHAR(255) NOT NULL,
    image_url TEXT,
    link_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. 데이터 수정 시 updated_at 자동 업데이트 트리거 함수 및 바인딩
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_cast_members_updated_at BEFORE UPDATE ON cast_members FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_content_blocks_updated_at BEFORE UPDATE ON content_blocks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
