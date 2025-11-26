"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Badge } from "@/components/c-ui/badge"
import { Clock } from "lucide-react"
import { Button } from "@/components/c-ui/button"
import Image from "next/image"

export default function DesignPreviewPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">마감된 미션 디자인 옵션</h1>
        <p className="text-gray-600 mb-8">4가지 옵션 중에서 선택해주세요!</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* 옵션 1: 골든/트로피 */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-amber-600">옵션 1: 골든/트로피 🏆</h2>
            <p className="text-sm text-gray-600">성취감, 보상, 가치있는 결과</p>
            
            <Card className="flex flex-col h-[240px] bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200 opacity-80">
              <CardHeader className="pb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="font-medium bg-green-100 text-green-700 border-green-200">
                      다수픽
                    </Badge>
                    <Badge className="bg-purple-100 text-purple-600">29기</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="w-3.5 h-3.5" />
                    <span>마감됨</span>
                  </div>
                </div>
                
                <CardTitle className="text-base text-gray-900 font-semibold line-clamp-2 h-[3rem]">
                  [29기] 가장 매력있는 여자 출연자는
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0 pb-3 flex flex-col flex-1">
                <div className="flex items-center justify-between h-10 mb-2">
                  <div className="text-sm text-gray-600">
                    <span className="text-gray-900 font-semibold">127</span>명 참여
                  </div>

                  {/* 옵션 1: 골드 그라데이션 도표 */}
                  <div className="flex items-end gap-1 h-full">
                    <div className="w-5 rounded-t-md bg-gradient-to-t from-amber-400 to-amber-500 shadow-lg" style={{ height: "100%" }} />
                    <div className="w-5 rounded-t-md bg-gradient-to-t from-yellow-400 to-yellow-500 shadow-md" style={{ height: "70%" }} />
                    <div className="w-5 rounded-t-md bg-gradient-to-t from-amber-300 to-yellow-400" style={{ height: "50%" }} />
                    <div className="w-5 rounded-t-md bg-gradient-to-t from-amber-200 to-yellow-300" style={{ height: "40%" }} />
                  </div>
                </div>

                <div className="mt-auto">
                  <Button className="w-full bg-purple-100 border-purple-200 text-purple-600 hover:bg-purple-200 border" variant="outline">
                    최종 결과보기
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* D-Day 박스 예시 */}
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm font-medium mb-2">마감 후 공개 D-Day 박스:</p>
              <div className="bg-gradient-to-br from-amber-100 to-yellow-100 rounded-md px-2 py-1 border border-amber-300 inline-flex items-center gap-1.5 shadow-md">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 shadow-lg">
                  <span className="text-white text-sm font-bold">🏆</span>
                </div>
                <div className="flex flex-col">
                  <div className="text-amber-700 font-bold text-xs leading-tight">투표완료</div>
                  <div className="text-[9px] text-amber-600 font-medium whitespace-nowrap leading-tight">결과 확인</div>
                </div>
              </div>
            </div>
          </div>

          {/* 옵션 2: 축하 컨셉 */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-green-600">옵션 2: 축하 컨셉 🎉</h2>
            <p className="text-sm text-gray-600">긍정적, 완료의 기쁨, 활기참</p>
            
            <Card className="flex flex-col h-[240px] bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200 opacity-80">
              <CardHeader className="pb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="font-medium bg-green-100 text-green-700 border-green-200">
                      다수픽
                    </Badge>
                    <Badge className="bg-purple-100 text-purple-600">29기</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="w-3.5 h-3.5" />
                    <span>마감됨</span>
                  </div>
                </div>
                
                <CardTitle className="text-base text-gray-900 font-semibold line-clamp-2 h-[3rem]">
                  [29기] 가장 매력있는 여자 출연자는
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0 pb-3 flex flex-col flex-1">
                <div className="flex items-center justify-between h-10 mb-2">
                  <div className="text-sm text-gray-600">
                    <span className="text-gray-900 font-semibold">127</span>명 참여
                  </div>

                  {/* 옵션 2: 그린 그라데이션 도표 */}
                  <div className="flex items-end gap-1 h-full">
                    <div className="w-5 rounded-t-md bg-gradient-to-t from-green-400 to-emerald-500" style={{ height: "100%" }} />
                    <div className="w-5 rounded-t-md bg-gradient-to-t from-green-300 to-emerald-400" style={{ height: "70%" }} />
                    <div className="w-5 rounded-t-md bg-gradient-to-t from-green-200 to-emerald-300" style={{ height: "50%" }} />
                    <div className="w-5 rounded-t-md bg-gradient-to-t from-green-100 to-emerald-200" style={{ height: "40%" }} />
                  </div>
                </div>

                <div className="mt-auto">
                  <Button className="w-full bg-purple-100 border-purple-200 text-purple-600 hover:bg-purple-200 border" variant="outline">
                    최종 결과보기
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* D-Day 박스 예시 */}
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm font-medium mb-2">마감 후 공개 D-Day 박스:</p>
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-md px-2 py-1 border border-green-300 inline-flex items-center gap-1.5">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 shadow-md">
                  <span className="text-white text-sm font-bold">🎉</span>
                </div>
                <div className="flex flex-col">
                  <div className="text-green-700 font-bold text-xs leading-tight">투표완료!</div>
                  <div className="text-[9px] text-green-600 font-medium whitespace-nowrap leading-tight">결과 보러가기</div>
                </div>
              </div>
            </div>
          </div>

          {/* 옵션 3: 연한 보라/핑크 */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-purple-600">옵션 3: 연한 보라/핑크 💜</h2>
            <p className="text-sm text-gray-600">브랜드 일관성, 부드러운 차별화</p>
            
            <Card className="flex flex-col h-[240px] bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200 opacity-80">
              <CardHeader className="pb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="font-medium bg-green-100 text-green-700 border-green-200">
                      다수픽
                    </Badge>
                    <Badge className="bg-purple-100 text-purple-600">29기</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="w-3.5 h-3.5" />
                    <span>마감됨</span>
                  </div>
                </div>
                
                <CardTitle className="text-base text-gray-900 font-semibold line-clamp-2 h-[3rem]">
                  [29기] 가장 매력있는 여자 출연자는
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0 pb-3 flex flex-col flex-1">
                <div className="flex items-center justify-between h-10 mb-2">
                  <div className="text-sm text-gray-600">
                    <span className="text-gray-900 font-semibold">127</span>명 참여
                  </div>

                  {/* 옵션 3: 연한 보라/핑크 도표 */}
                  <div className="flex items-end gap-1 h-full">
                    <div className="w-5 rounded-t-md bg-gradient-to-t from-purple-200 to-purple-300 opacity-70" style={{ height: "100%" }} />
                    <div className="w-5 rounded-t-md bg-gradient-to-t from-pink-200 to-pink-300 opacity-70" style={{ height: "70%" }} />
                    <div className="w-5 rounded-t-md bg-gradient-to-t from-purple-100 to-pink-200 opacity-70" style={{ height: "50%" }} />
                    <div className="w-5 rounded-t-md bg-gradient-to-t from-purple-100 to-pink-100 opacity-70" style={{ height: "40%" }} />
                  </div>
                </div>

                <div className="mt-auto">
                  <Button className="w-full bg-purple-100 border-purple-200 text-purple-600 hover:bg-purple-200 border" variant="outline">
                    최종 결과보기
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* D-Day 박스 예시 */}
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm font-medium mb-2">마감 후 공개 D-Day 박스:</p>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-md px-2 py-1 border border-purple-200 inline-flex items-center gap-1.5">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-purple-300 to-pink-300">
                  <span className="text-white text-sm font-bold">✨</span>
                </div>
                <div className="flex flex-col">
                  <div className="text-purple-600 font-bold text-xs leading-tight">결과 공개</div>
                  <div className="text-[9px] text-purple-500 font-medium whitespace-nowrap leading-tight">확인하기</div>
                </div>
              </div>
            </div>
          </div>

          {/* 옵션 4: 캐릭터 + 팻말 */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-pink-600">옵션 4: 리얼픽 캐릭터 💕 (추천!)</h2>
            <p className="text-sm text-gray-600">친근하고 브랜드 정체성 강화, 긍정적</p>
            
            <Card className="flex flex-col h-[240px] bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200 opacity-80">
              <CardHeader className="pb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="font-medium bg-green-100 text-green-700 border-green-200">
                      다수픽
                    </Badge>
                    <Badge className="bg-purple-100 text-purple-600">29기</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="w-3.5 h-3.5" />
                    <span>마감됨</span>
                  </div>
                </div>
                
                <CardTitle className="text-base text-gray-900 font-semibold line-clamp-2 h-[3rem]">
                  [29기] 가장 매력있는 여자 출연자는
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0 pb-3 flex flex-col flex-1">
                <div className="flex items-center justify-between h-10 mb-2">
                  <div className="text-sm text-gray-600">
                    <span className="text-gray-900 font-semibold">127</span>명 참여
                  </div>

                  {/* 옵션 4: 캐릭터 */}
                  <div className="relative">
                    <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg px-3 py-2 border-2 border-pink-300 inline-flex items-center gap-2 shadow-lg">
                      <div className="w-10 h-10 relative">
                        <Image 
                          src="/images/realpick-mascot.png" 
                          alt="리얼픽 캐릭터"
                          width={40}
                          height={40}
                          className="object-contain"
                        />
                      </div>
                      <div className="flex flex-col">
                        <div className="text-pink-700 font-bold text-xs leading-tight">투표완료!</div>
                        <div className="text-[9px] text-pink-600 font-medium whitespace-nowrap leading-tight">결과 확인하기</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto">
                  <Button className="w-full bg-purple-100 border-purple-200 text-purple-600 hover:bg-purple-200 border" variant="outline">
                    최종 결과보기
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 캐릭터 박스 예시 */}
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm font-medium mb-2">리얼픽 캐릭터 버전:</p>
              <div className="space-y-3">
                {/* 버전 1: 큰 캐릭터 */}
                <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-3 border-2 border-pink-200 inline-flex items-center gap-3 shadow-lg">
                  <div className="relative">
                    <div className="w-14 h-14 relative animate-bounce">
                      <Image 
                        src="/images/realpick-mascot.png" 
                        alt="리얼픽 캐릭터"
                        width={56}
                        height={56}
                        className="object-contain drop-shadow-lg"
                      />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white text-[10px] font-bold">✓</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-md px-3 py-2 shadow-sm border border-pink-200">
                    <div className="text-pink-700 font-bold text-sm">투표완료!</div>
                    <div className="text-[10px] text-pink-600 font-medium">결과 확인하러 가요 💜</div>
                  </div>
                </div>
                
                {/* 버전 2: 작은 캐릭터 */}
                <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg px-3 py-2 border-2 border-pink-300 inline-flex items-center gap-2 shadow-md">
                  <div className="w-10 h-10 relative">
                    <Image 
                      src="/images/realpick-mascot.png" 
                      alt="리얼픽 캐릭터"
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                  <div className="flex flex-col">
                    <div className="text-pink-700 font-bold text-xs leading-tight">투표완료!</div>
                    <div className="text-[9px] text-pink-600 font-medium whitespace-nowrap leading-tight">결과 확인하기</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 옵션 5: 결과 강조 */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-blue-600">옵션 5: 결과 강조 📊</h2>
            <p className="text-sm text-gray-600">데이터/결과 중심, 신뢰감, 전문적</p>
            
            <Card className="flex flex-col h-[240px] bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200 opacity-80">
              <CardHeader className="pb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="font-medium bg-green-100 text-green-700 border-green-200">
                      다수픽
                    </Badge>
                    <Badge className="bg-purple-100 text-purple-600">29기</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="w-3.5 h-3.5" />
                    <span>마감됨</span>
                  </div>
                </div>
                
                <CardTitle className="text-base text-gray-900 font-semibold line-clamp-2 h-[3rem]">
                  [29기] 가장 매력있는 여자 출연자는
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0 pb-3 flex flex-col flex-1">
                <div className="flex items-center justify-between h-10 mb-2">
                  <div className="text-sm text-gray-600">
                    <span className="text-gray-900 font-semibold">127</span>명 참여
                  </div>

                  {/* 옵션 5: 블루 그라데이션 도표 */}
                  <div className="flex items-end gap-1 h-full">
                    <div className="w-5 rounded-t-md bg-gradient-to-t from-blue-400 to-indigo-500" style={{ height: "100%" }} />
                    <div className="w-5 rounded-t-md bg-gradient-to-t from-blue-300 to-indigo-400" style={{ height: "70%" }} />
                    <div className="w-5 rounded-t-md bg-gradient-to-t from-blue-200 to-indigo-300" style={{ height: "50%" }} />
                    <div className="w-5 rounded-t-md bg-gradient-to-t from-blue-100 to-indigo-200" style={{ height: "40%" }} />
                  </div>
                </div>

                <div className="mt-auto">
                  <Button className="w-full bg-purple-100 border-purple-200 text-purple-600 hover:bg-purple-200 border" variant="outline">
                    최종 결과보기
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* D-Day 박스 예시 */}
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm font-medium mb-2">마감 후 공개 D-Day 박스:</p>
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-md px-2 py-1 border border-blue-300 inline-flex items-center gap-1.5">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 shadow-md">
                  <span className="text-white text-sm font-bold">📊</span>
                </div>
                <div className="flex flex-col">
                  <div className="text-blue-700 font-bold text-xs leading-tight">집계완료</div>
                  <div className="text-[9px] text-blue-600 font-medium whitespace-nowrap leading-tight">결과보기</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 설명 */}
        <div className="mt-12 bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-bold mb-4">각 옵션의 특징</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <strong className="text-amber-600">옵션 1 (골든/트로피):</strong> 가장 긍정적이고 보상 느낌. 결과가 가치있다는 느낌을 줌
            </div>
            <div>
              <strong className="text-green-600">옵션 2 (축하):</strong> 밝고 활기참. 투표 완료를 축하하는 느낌
            </div>
            <div>
              <strong className="text-purple-600">옵션 3 (연한 보라/핑크):</strong> 브랜드 컬러 유지. 가장 일관성있고 부드러움
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <strong className="text-pink-600">옵션 4 (캐릭터):</strong> 가장 친근하고 브랜드 아이덴티티 강화. 긍정적이고 완료감을 줌. <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-xs font-bold ml-1">추천!</span>
            </div>
            <div>
              <strong className="text-blue-600">옵션 5 (블루):</strong> 전문적이고 신뢰감. 데이터/결과 중심
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

