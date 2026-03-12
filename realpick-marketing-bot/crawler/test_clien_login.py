
import os
import sys
from pathlib import Path
from dotenv import load_dotenv, dotenv_values

# .env.local 로드
bot_root = Path(__file__).parent.parent
env_path = bot_root / '.env.local'

if env_path.exists():
    print(f"Reading .env.local from {env_path}")
    config = dotenv_values(env_path)
    print("Parsed config:", config)
    
    load_dotenv(dotenv_path=env_path, override=True)
else:
    print(f"Could not find .env.local at {env_path}")

from modules.auto_commenter import AutoCommenter

def test_clien_login():
    clien_id = os.getenv('CLIEN_ID')
    clien_pw = os.getenv('CLIEN_PW')
    
    print(f"CLIEN_ID raw: {repr(clien_id)}")
    print(f"CLIEN_PW raw: {repr(clien_pw)}")
    
    if not clien_id or not clien_pw:
        print("Error: CLIEN_ID or CLIEN_PW not found in environment variables.")
        print("Available keys starting with CLIEN:", [k for k in os.environ.keys() if k.startswith('CLIEN')])
        print("All keys:", list(os.environ.keys()))
        return

    print(f"Testing login for Clien ID: {clien_id}")
    
    commenter = AutoCommenter(headless=False) # Headless False to see the browser
    if not commenter.start_browser():
        print("Failed to start browser")
        return

    try:
        # Try login
        commenter._login_clien(clien_id, clien_pw)
        
        # Check if login was successful (cookies saved)
        # _login_clien calls save_cookies on success
        cookie_path = commenter._cookie_path('clien')
        if os.path.exists(cookie_path):
            print(f"Login successful! Cookies saved at {cookie_path}")
        else:
            print("Login might have failed. Cookie file not found.")
            
    except Exception as e:
        print(f"Error during login test: {e}")
    finally:
        print("Closing browser in 5 seconds...")
        import time
        time.sleep(5)
        commenter.close()

if __name__ == "__main__":
    test_clien_login()
