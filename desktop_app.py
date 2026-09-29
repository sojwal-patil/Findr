import sys
import os
import threading
import time
import socket
import uvicorn
import webview  # type: ignore

# Get base directory (handles PyInstaller temp folder or normal directory cleanly for linters)
base_dir = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))

if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

from app import app

class DesktopBridgeApi:
    def __init__(self):
        self._window = None

    def set_window(self, window):
        self._window = window

    def save_csv(self, content: str, default_filename: str = "products_with_matching_images.csv"):
        if not self._window:
            return {"success": False, "error": "No window"}
        
        default_dir = os.path.join(os.path.expanduser("~"), "Downloads")
        if not os.path.exists(default_dir):
            default_dir = os.path.expanduser("~")

        try:
            dialog_type = getattr(webview.FileDialog, 'SAVE', webview.SAVE_DIALOG)
            file_types = ('CSV Files (*.csv)', 'All files (*.*)')
            save_path = self._window.create_file_dialog(
                dialog_type,
                directory=default_dir,
                save_filename=default_filename,
                file_types=file_types
            )

            if not save_path:
                return {"success": False, "cancelled": True}

            final_path = save_path if isinstance(save_path, str) else save_path[0]
            if not final_path.lower().endswith('.csv'):
                final_path += '.csv'

            with open(final_path, 'w', encoding='utf-8-sig', newline='') as f:
                f.write(content)

            return {"success": True, "path": final_path}
        except Exception as e:
            return {"success": False, "error": str(e)}

def find_free_port(start_port=8000):
    for port in range(start_port, start_port + 50):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', port))
                return port
        except OSError:
            continue
    return start_port

def run_uvicorn(port):
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")

if __name__ == "__main__":
    port = find_free_port(8000)
    
    # Start backend server in daemon background thread
    server_thread = threading.Thread(target=run_uvicorn, args=(port,), daemon=True)
    server_thread.start()
    
    # Wait briefly for server startup
    time.sleep(0.8)
    
    # Create native Windows Desktop Window with JS API Bridge
    api = DesktopBridgeApi()
    window = webview.create_window(
        title="Findr - Product Image Finder & CSV Enricher",
        url=f"http://127.0.0.1:{port}/",
        js_api=api,
        width=1240,
        height=820,
        min_size=(900, 600),
        resizable=True,
        text_select=True,
        background_color="#0B0F19"
    )
    api.set_window(window)
    
    # Start native window loop (blocks until user closes the window)
    webview.start()
    
    # Clean exit on window close
    sys.exit(0)
