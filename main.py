from app import app
import webbrowser
import threading

def open_browser():
    """Open the default web browser to the Flask app."""
    webbrowser.open_new("http://127.0.0.1:5001")

if __name__ == "__main__":
    # Start a thread to open the browser after the server starts
    threading.Timer(1, open_browser).start()
    app.run(host="0.0.0.0", port=5001, debug=True)
