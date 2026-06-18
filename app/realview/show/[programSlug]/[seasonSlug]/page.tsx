'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { mockPrograms, mockSeasons, mockCastMembers } from '../../../mockData';
import { CastMember } from '../../../types';
import AdBanner from '../../../components/AdBanner';
import Header from '../../../components/Header';

interface PageProps {
  params: {
    programSlug: string;
    seasonSlug: string;
  };
}

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function SeasonDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { programSlug, seasonSlug } = params;

  // States
  const [program, setProgram] = useState<{ id: string; title: string; slug: string } | null>(null);
  const [season, setSeason] = useState<{ id: string; title: string; slug: string } | null>(null);
  const [casts, setCasts] = useState<CastMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCast, setSelectedCast] = useState<CastMember | null>(null);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionText, setCorrectionText] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // 1. Fetch Program from Supabase
        const { data: prog, error: progErr } = await supabase
          .from('programs')
          .select('*')
          .eq('slug', programSlug)
          .single();
        
        if (progErr || !prog) {
          throw new Error('Program not found on Supabase');
        }

        // 2. Fetch Season from Supabase
        const { data: seas, error: seasErr } = await supabase
          .from('seasons')
          .select('*')
          .eq('program_id', prog.id)
          .eq('slug', seasonSlug)
          .single();

        if (seasErr || !seas) {
          throw new Error('Season not found on Supabase');
        }

        // 3. Fetch Cast Members
        const { data: rawCasts, error: castsErr } = await supabase
          .from('cast_members')
          .select('*')
          .eq('season_id', seas.id)
          .eq('publish_status', 'published');

        if (castsErr || !rawCasts) {
          throw new Error('Cast members not found on Supabase');
        }

        // 4. Fetch Content Blocks for these casts
        const castIds = rawCasts.map(c => c.id);
        let blocks: any[] = [];
        if (castIds.length > 0) {
          const { data: rawBlocks, error: blocksErr } = await supabase
            .from('content_blocks')
            .select('*')
            .in('cast_member_id', castIds)
            .order('sort_order', { ascending: true });
          
          if (!blocksErr && rawBlocks) {
            blocks = rawBlocks;
          }
        }

        // Map data to local CastMember format
        const mappedCasts: CastMember[] = rawCasts.map(cast => {
          const castBlocks = blocks
            .filter(b => b.cast_member_id === cast.id)
            .map(b => ({
              title: b.title,
              items: b.items
            }));

          return {
            id: cast.id,
            seasonId: cast.season_id,
            displayName: cast.display_name,
            genderGroup: cast.gender_group,
            profileImageUrl: cast.profile_image_url || '/images/default-profile.png',
            oneLineSummary: cast.one_line_summary || '',
            contentBlocks: castBlocks.length > 0 ? castBlocks : [
              { title: '자기소개 카드', items: ['정보 없음'] }
            ]
          };
        });

        // Order mapping matching traditional Solo order
        const nameOrder = ['영수', '영호', '영식', '영철', '광수', '상철', '경수', '영숙', '정숙', '순자', '영자', '옥순', '현숙', '정희'];
        mappedCasts.sort((a, b) => {
          const indexA = nameOrder.indexOf(a.displayName);
          const indexB = nameOrder.indexOf(b.displayName);
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return a.displayName.localeCompare(b.displayName);
        });

        setProgram({ id: prog.id, title: prog.title, slug: prog.slug });
        setSeason({ id: seas.id, title: seas.title, slug: seas.slug });
        setCasts(mappedCasts);
      } catch (err: any) {
        console.warn('Supabase fetch failed. Falling back to mockData.', err.message);
        
        // Fallback to local mockData
        const localProg = mockPrograms.find((p) => p.slug === programSlug);
        const localSeas = mockSeasons.find(
          (s) => s.programId === localProg?.id && s.slug === seasonSlug
        );

        if (localProg && localSeas) {
          setProgram({ id: localProg.id, title: localProg.title, slug: localProg.slug });
          setSeason({ id: localSeas.id, title: localSeas.title, slug: localSeas.slug });
          
          const localCasts = mockCastMembers.filter((c) => c.seasonId === localSeas.id);
          setCasts(localCasts);
        } else {
          // If even fallback fails, set nulls so notFound() triggers
          setProgram(null);
          setSeason(null);
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [programSlug, seasonSlug]);

  if (loading) {
    return (
      <div className="bg-[#f6fafe] text-[#171c1f] min-h-screen flex flex-col justify-center items-center font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#b90538]"></div>
        <p className="text-xs text-[#575e70] font-bold mt-4">데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (!program || !season) {
    notFound();
  }

  const maleCasts = casts.filter((c) => c.genderGroup === 'male');
  const femaleCasts = casts.filter((c) => c.genderGroup === 'female');

  const handleCloseDetail = () => {
    setSelectedCast(null);
    setShowCorrectionForm(false);
    setCorrectionText('');
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionText.trim() || !selectedCast) return;

    try {
      // Send correction request to Supabase
      const { error } = await supabase
        .from('correction_requests')
        .insert({
          target_type: 'cast_member',
          target_id: selectedCast.id,
          requester_type: 'viewer',
          request_text: correctionText,
          status: 'pending'
        });

      if (error) throw error;
      alert('정보 수정 요청이 안전하게 접수되었습니다. 검수 후 신속히 반영하겠습니다!');
    } catch (err: any) {
      console.error('Failed to submit correction:', err.message);
      // Fallback alert
      alert('정보 수정 요청이 접수되었습니다. (로컬모드)');
    }

    setShowCorrectionForm(false);
    setCorrectionText('');
  };

  // Icon mapping helper
  const getBentoIcon = (title: string) => {
    const t = title.trim();
    if (t.includes('나이')) return 'cake';
    if (t.includes('직업')) return 'work';
    if (t.includes('거주지') || t.includes('지역')) return 'location_on';
    return 'sports_tennis';
  };

  return (
    <div className="bg-[#f6fafe] text-[#171c1f] min-h-screen relative pb-[160px] font-sans antialiased max-w-[480px] mx-auto">
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>

      {/* Unified Header */}
      <Header onToggleProgram={() => router.push('/realview')} />

      {/* Hero Section */}
      <div className="p-4 bg-[#f0f4f8] border-b border-[#dfe3e7] text-center">
        <div className="flex justify-center gap-1.5 mb-1">
          <span className="bg-[#FDF2F8] text-[#b90538] text-[9px] font-semibold px-2 py-0.5 rounded-full border border-pink-100">
            자기소개 기준
          </span>
          <span className="bg-[#f0f4f8] text-[#5b4041] text-[9px] font-semibold px-2 py-0.5 rounded-full border border-[#dfe3e7]">
            스포일러 없음
          </span>
        </div>
        <h2 className="text-xl font-black text-[#171c1f]">{season.title}</h2>
      </div>

      {/* 2-Column Side-by-Side Gender Layout */}
      <main className="p-4 bg-white border-b border-[#dfe3e7]">
        
        {/* Table/Layout Header */}
        <div className="grid grid-cols-2 text-center border-b border-[#dfe3e7] pb-2 mb-4">
          <div className="text-xs font-bold text-[#575e70] uppercase tracking-wider">남자</div>
          <div className="text-xs font-bold text-[#575e70] uppercase tracking-wider">여자</div>
        </div>

        <div className="grid grid-cols-2 gap-x-4">
          {/* Left Column: Male Casts */}
          <div className="space-y-4">
            {maleCasts.map((cast) => (
              <div
                key={cast.id}
                onClick={() => setSelectedCast(cast)}
                className="flex items-center gap-3 p-2 hover:bg-[#f6fafe] rounded-2xl cursor-pointer transition-all active:scale-97 group border border-transparent hover:border-[#dfe3e7]"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#dfe3e7] shrink-0 bg-slate-100 group-hover:border-[#b90538]/50 transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cast.profileImageUrl}
                    alt={cast.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#171c1f] group-hover:text-[#b90538] transition-colors">
                    {cast.displayName}
                  </h4>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Female Casts */}
          <div className="space-y-4">
            {femaleCasts.map((cast) => (
              <div
                key={cast.id}
                onClick={() => setSelectedCast(cast)}
                className="flex items-center gap-3 p-2 hover:bg-[#f6fafe] rounded-2xl cursor-pointer transition-all active:scale-97 group border border-transparent hover:border-[#dfe3e7]"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#dfe3e7] shrink-0 bg-slate-100 group-hover:border-[#b90538]/50 transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cast.profileImageUrl}
                    alt={cast.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#171c1f] group-hover:text-[#b90538] transition-colors">
                    {cast.displayName}
                  </h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Detail Modal/Overlay */}
      {selectedCast && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center">
          <div className="bg-[#f6fafe] w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl border-t border-[#dfe3e7] max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp relative pb-20">
            
            {/* Header in Modal */}
            <div className="sticky top-0 bg-[#f6fafe]/95 backdrop-blur-md border-b border-[#dfe3e7]/50 px-4 py-3.5 flex justify-between items-center z-10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#b90538]">badge</span>
                <span className="text-xs font-bold text-[#b90538]">{program.title} {season.title}</span>
              </div>
              <button
                onClick={handleCloseDetail}
                className="text-slate-500 hover:text-black font-semibold text-xs py-1 px-3 bg-slate-100 rounded-full"
              >
                ✕ 닫기
              </button>
            </div>

            {/* Main Image Banner */}
            <div className="relative w-full aspect-[4/5] bg-[#dfe3e7] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedCast.profileImageUrl}
                alt={selectedCast.displayName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
              <div className="absolute bottom-0 left-0 w-full p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="bg-[#FDF2F8] text-[#b90538] px-2 py-0.5 rounded-full text-[9px] font-bold">
                    {season.title}
                  </span>
                  <span className="bg-[#FDF2F8] text-[#b90538] px-2 py-0.5 rounded-full text-[9px] font-bold">
                    {selectedCast.displayName}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white drop-shadow-md">{selectedCast.displayName}</h2>
              </div>
            </div>

            {/* Bento Grid & Details */}
            <div className="p-4 flex flex-col gap-5">
              
              {/* Bento Grid Stats */}
              <div className="grid grid-cols-2 gap-3">
                {selectedCast.contentBlocks[0]?.items.map((stat, sIdx) => {
                  const [label, val] = stat.split(':');
                  if (!label || !val) return null;
                  return (
                    <div key={sIdx} className="bg-white p-3 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-[#dfe3e7]/50 flex items-center gap-3">
                      <div className="bg-[#FDF2F8] p-2 rounded-full flex-shrink-0 text-[#b90538] flex items-center justify-center">
                        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {getBentoIcon(label.trim())}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#5b4041] uppercase tracking-wider">{label.trim()}</p>
                        <p className="text-xs text-[#171c1f] font-bold mt-0.5">{val.trim()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Other Info Blocks (Bento Style) */}
              {selectedCast.contentBlocks.slice(1).map((block, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-[#dfe3e7]/50">
                  <h3 className="text-xs font-bold text-[#171c1f] mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#b90538] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                      format_quote
                    </span>
                    {block.title}
                  </h3>
                  <div className="space-y-1.5">
                    {block.items.map((item, itemIdx) => (
                      <p key={itemIdx} className="text-xs text-[#5b4041] leading-relaxed">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              ))}

              {/* Actions */}
              <div className="flex flex-col gap-2.5 mt-2">
                {!showCorrectionForm ? (
                  <button
                    onClick={() => setShowCorrectionForm(true)}
                    className="w-full bg-[#d9dff5] text-[#404758] py-2.5 rounded-full text-xs font-semibold hover:bg-[#c0c6db] transition-all flex items-center justify-center gap-2 active:scale-98"
                  >
                    <span className="material-symbols-outlined text-sm">edit_note</span>
                    정보 수정 요청
                  </button>
                ) : (
                  <form
                    onSubmit={handleSubmitCorrection}
                    className="bg-white border border-[#dfe3e7] p-4 rounded-2xl space-y-3 animate-fadeIn text-left"
                  >
                    <h5 className="text-xs font-bold text-[#171c1f]">정보 수정 요청</h5>
                    <textarea
                      required
                      value={correctionText}
                      onChange={(e) => setCorrectionText(e.target.value)}
                      placeholder="잘못된 나이, 직업 등 정정 요청 사유를 상세히 적어주세요."
                      rows={3}
                      className="w-full bg-[#f6fafe] border border-[#dfe3e7] rounded-xl p-2.5 text-xs text-[#171c1f] focus:outline-none focus:border-[#b90538]"
                    />
                    <div className="flex gap-2 justify-end text-xs">
                      <button
                        type="button"
                        onClick={handleCloseDetail}
                        className="px-3 py-1.5 text-slate-400 font-semibold"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="bg-[#b90538] hover:bg-[#92002a] text-white px-4 py-1.5 font-bold rounded-lg transition-colors"
                      >
                        제출
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ad Sticky Footer */}
      <AdBanner />
    </div>
  );
}

