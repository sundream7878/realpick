
import time
import sys
import os
from bs4 import BeautifulSoup
import undetected_chromedriver as uc

def debug_fmkorea_browser():
    url = "https://www.fmkorea.com/search.php?act=IS&is_keyword=%EC%86%94%EB%A1%9C%EC%A7%80%EC%98%A5&search_target=title_content"
    
    print(f"Starting browser to fetch: {url}")
    
    options = uc.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--window-size=1920,1080")
    
    driver = None
    try:
        driver = uc.Chrome(options=options, version_main=145)
        driver.set_page_load_timeout(30)
        
        print("Browser started. Navigating...")
        driver.get(url)
        
        print("Waiting for page load (5s)...")
        time.sleep(5)
        
        print("Scrolling down...")
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight/3);")
        time.sleep(1)
        
        html = driver.page_source
        print(f"Page source retrieved. Length: {len(html)}")
        
        # Save HTML for inspection
        with open('fmkorea_source.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("Saved HTML to fmkorea_source.html")
        
        # Parse
        soup = BeautifulSoup(html, 'html.parser')
        
        print("\n--- Testing Selectors ---")
        
        selectors = [
            'ul.search_list li dl dt a', 
            '.search_list li .title a',
            '.board_list tr td.title a',
            '.bd_lst tr td.title a',
            'li.li h3.title a',
            '.search_result_list li a',
            'a.subject_link'
        ]
        
        found_any = False
        for sel in selectors:
            elements = soup.select(sel)
            print(f"Selector '{sel}': {len(elements)} matches")
            for i, el in enumerate(elements[:3]):
                print(f"  [{i}] Text: {el.get_text(strip=True)}")
                print(f"      Href: {el.get('href')}")
                found_any = True
        
        if not found_any:
            print("\nNo results found with known selectors.")
            print("Dumping first 1000 chars of body text:")
            print(soup.body.get_text(separator=' ', strip=True)[:1000] if soup.body else "No body")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if driver:
            print("Closing driver...")
            try:
                driver.quit()
            except:
                pass

if __name__ == "__main__":
    debug_fmkorea_browser()
