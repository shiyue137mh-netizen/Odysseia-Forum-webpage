import json
import os
import ssl
import sys
import urllib.request

script_dir = os.path.dirname(os.path.abspath(__file__))
webpage_dir = os.path.abspath(os.path.join(script_dir, '../'))
output_path = os.path.join(webpage_dir, 'openapi.json')

backend_url = os.environ.get('VITE_BACKEND_URL', 'https://forum.shimmerday.top').rstrip('/')
remote_openapi_url = f"{backend_url}/openapi.json"

# 优先尝试从在线后端获取
try:
    print(f"Attempting to fetch openapi.json from {remote_openapi_url}...")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        remote_openapi_url,
        headers={'User-Agent': 'Odysseia-Web-Build/1.0'}
    )
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        if resp.status == 200:
            openapi_data = json.loads(resp.read().decode('utf-8'))
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(openapi_data, f, indent=2, ensure_ascii=False)
            print(f"Successfully fetched and exported openapi.json to {output_path}")
            sys.exit(0)
except Exception as err:
    print(f"Remote fetch failed: {err}. Falling back to local backend module...")

# 回退方案：从本地后端仓库导入
root_dir = os.path.abspath(os.path.join(webpage_dir, '../Odysseia-Forum'))
if os.path.exists(root_dir):
    os.chdir(root_dir)
    sys.path.append(os.path.join(root_dir, 'src'))
    try:
        from api.main import app
        print(f"Successfully imported app from api.main (Root: {root_dir})")
        openapi_data = app.openapi()
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(openapi_data, f, indent=2, ensure_ascii=False)
        print(f"Successfully exported openapi.json to {output_path}")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error exporting from local backend: {e}")
        sys.exit(1)
else:
    print(f"Error: Could neither fetch from {remote_openapi_url} nor find local backend at {root_dir}")
    sys.exit(1)

