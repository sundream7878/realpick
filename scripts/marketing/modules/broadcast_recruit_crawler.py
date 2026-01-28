"""
방송국 모집 공고 크롤러 모듈
각 방송사 게시판에서 모집 공고를 수집합니다.
"""

import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
from datetime import datetime
import re


class BroadcastRecruitCrawler:
    """방송국 모집 공고 크롤링 클래스"""
    
    def __init__(self):
        """초기화"""
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    
    def crawl_mbc_recruit(self, max_pages: int = 5) -> List[Dict]:
        """
        MBC 모집 공고 크롤링
        Args:
            max_pages: 최대 페이지 수
        Returns:
            크롤링한 공고 리스트
        """
        results = []
        # TODO: MBC 게시판 URL 및 크롤링 로직 구현
        return results
    
    def crawl_sbs_recruit(self, max_pages: int = 5) -> List[Dict]:
        """
        SBS 모집 공고 크롤링
        Args:
            max_pages: 최대 페이지 수
        Returns:
            크롤링한 공고 리스트
        """
        results = []
        # TODO: SBS 게시판 URL 및 크롤링 로직 구현
        return results
    
    def crawl_kbs_recruit(self, max_pages: int = 5) -> List[Dict]:
        """
        KBS 모집 공고 크롤링
        Args:
            max_pages: 최대 페이지 수
        Returns:
            크롤링한 공고 리스트
        """
        results = []
        # TODO: KBS 게시판 URL 및 크롤링 로직 구현
        return results
    
    def crawl_tvn_recruit(self, max_pages: int = 5) -> List[Dict]:
        """
        tvN 모집 공고 크롤링
        Args:
            max_pages: 최대 페이지 수
        Returns:
            크롤링한 공고 리스트
        """
        results = []
        # TODO: tvN 게시판 URL 및 크롤링 로직 구현
        return results
    
    def crawl_all(self, max_pages_per_site: int = 5) -> List[Dict]:
        """
        모든 방송사 모집 공고 크롤링
        Args:
            max_pages_per_site: 사이트당 최대 페이지 수
        Returns:
            크롤링한 공고 리스트
        """
        all_results = []
        
        # 각 방송사 크롤링 (병렬 처리 가능하지만 현재는 순차)
        all_results.extend(self.crawl_mbc_recruit(max_pages_per_site))
        all_results.extend(self.crawl_sbs_recruit(max_pages_per_site))
        all_results.extend(self.crawl_kbs_recruit(max_pages_per_site))
        all_results.extend(self.crawl_tvn_recruit(max_pages_per_site))
        
        return all_results
    
    def extract_text_from_html(self, html: str) -> str:
        """
        HTML에서 텍스트 추출
        Args:
            html: HTML 문자열
        Returns:
            추출된 텍스트
        """
        soup = BeautifulSoup(html, 'html.parser')
        
        # 스크립트와 스타일 제거
        for script in soup(["script", "style"]):
            script.decompose()
        
        # 텍스트 추출
        text = soup.get_text()
        
        # 공백 정리
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        return text
    
    def extract_images_from_html(self, html: str) -> List[str]:
        """
        HTML에서 이미지 URL 추출
        Args:
            html: HTML 문자열
        Returns:
            이미지 URL 리스트
        """
        soup = BeautifulSoup(html, 'html.parser')
        images = []
        
        for img in soup.find_all('img'):
            src = img.get('src') or img.get('data-src')
            if src:
                # 상대 경로를 절대 경로로 변환 (필요시)
                if src.startswith('http'):
                    images.append(src)
        
        return images
