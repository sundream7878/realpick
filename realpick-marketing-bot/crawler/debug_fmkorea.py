
import requests
from bs4 import BeautifulSoup
import sys

def debug_fmkorea():
    keyword = "솔로지옥"
    url = "https://www.fmkorea.com/search.php?act=IS&is_keyword=%EC%86%94%EB%A1%9C%EC%A7%80%EC%98%A5&search_target=title_content"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    print(f"Fetching URL: {url}")
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print("Failed to fetch page")
            return

        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 1. Check if we can find the specific text from the screenshot
        target_text = "솔로지옥"
        print(f"\nSearching for text '{target_text}' in HTML...")
        found = soup.find(string=lambda text: target_text in text if text else False)
        if found:
            print(f"Found text! Parent tag: {found.parent.name}")
            print(f"Parent class: {found.parent.get('class')}")
            print(f"Grandparent tag: {found.parent.parent.name}")
            print(f"Grandparent class: {found.parent.parent.get('class')}")
        else:
            print("Text not found in HTML (might be dynamic or blocked)")

        # 2. Test current selectors
        print("\nTesting selectors:")
        
        selectors = [
            'li.li h3.title a', 
            '.search_result_list li a',
            'a.subject_link', 
            '.title a[href*="fmkorea.com"]',
            'ul.search_list li dl dt a' # Another common pattern
        ]
        
        for sel in selectors:
            results = soup.select(sel)
            print(f"Selector '{sel}': {len(results)} matches")
            for i, el in enumerate(results[:3]):
                print(f"  Match {i+1}: {el.get_text(strip=True)} | href={el.get('href')}")

        # 3. Print a snippet of the HTML structure where results might be
        # Look for the "문서" section or list
        result_container = soup.select_one('ul.search_list') or soup.select_one('.search_result_list')
        if result_container:
            print("\nFound result container:")
            print(str(result_container)[:500])
        else:
            print("\nResult container not found. Dumping body start:")
            print(str(soup.body)[:500] if soup.body else "No body tag")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_fmkorea()
