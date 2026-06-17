import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    try:
        # Fetch the RSS/Atom feed XML
        req = urllib.request.Request(FEED_URL, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read()
        
        # Parse XML
        root = ET.fromstring(xml_data)
        
        # Atom Namespace mapping
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            title_el = entry.find('atom:title', ns)
            title = title_el.text if title_el is not None else ""
            
            updated_el = entry.find('atom:updated', ns)
            updated = updated_el.text if updated_el is not None else ""
            
            # Find link with rel=alternate or just standard link
            link_el = entry.find("atom:link[@rel='alternate']", ns)
            if link_el is None:
                link_el = entry.find("atom:link", ns)
            link = link_el.attrib.get('href', '') if link_el is not None else ""
            
            content_el = entry.find('atom:content', ns)
            content = content_el.text if content_el is not None else ""
            
            entries.append({
                'title': title,
                'updated': updated,
                'link': link,
                'content': content
            })
            
        return entries, None
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    entries, error = fetch_and_parse_feed()
    if error:
        return jsonify({'success': False, 'error': error}), 500
    return jsonify({'success': True, 'entries': entries})

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
