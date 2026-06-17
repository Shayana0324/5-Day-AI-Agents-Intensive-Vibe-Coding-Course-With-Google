# BigQuery Release Notes Hub 🚀

A premium, interactive web application built with **Python Flask** and **Vanilla HTML, CSS, and JavaScript**. This application lets you fetch, search, filter, and share Google Cloud BigQuery release notes instantly.

---

## 🎨 Main Features

*   **Live XML Fetching**: Connects directly to Google Cloud's official BigQuery feed (`docs.cloud.google.com/feeds/bigquery-release-notes.xml`) to retrieve real-time announcements.
*   **Granular Update Splitting**: Automatically splits day-level release entries by their category headers (`<h3>` tags) to separate individual features, announcements, changes, breaking updates, and issues.
*   **Stats Dashboard**: Displays totals for days indexed, total updates parsed, and the latest release note timestamp.
*   **Robust Filter & Fuzzy Search**: Live-filters dates, titles, and body content text.
*   **Custom X (Twitter) Composer**: 
    *   Draft individual updates pre-formatted with tags and links.
    *   **Bulk Selection Bar**: Select multiple updates to draft sequential threads (`[1/N]`, `[2/N]`) or a consolidated summary post.
    *   Features an SVG character counting circle indicating Twitter's 280-character boundary limits.
*   **Theme Engine**: Fluid transition between dark and light themes (state saved in `localStorage`).

---

## 📁 Directory Structure

```
bigquery_viewer/
├── app.py                      # Flask Application Entrypoint
├── README.md                   # Project Overview & Quickstart Guide
├── implementation_plan.md      # System Architecture & Development Phases
├── architecture_overview.md    # Detail on Client/Server communication flows
├── task.md                     # Tracker log for implemented items
├── .gitignore                  # Git exclusion configuration
├── templates/
│   └── index.html              # Main HTML Structure
└── static/
    ├── css/
    │   └── style.css           # CSS Variable Themes & Timeline Styling
    └── js/
        └── main.js             # State Controller & X/Twitter Composer Engine
```

---

## 🛠️ Architecture

*   **Server (Python/Flask)**: Proxies requests to Google Cloud XML feed, parses XML elements on-the-fly, and maps them to clean JSON payloads.
*   **Client (JavaScript/DOM)**: Feeds API array results, extracts granular HTML segments using browser `DOMParser`, and binds dynamic UI events (selection checklists, filtering, modals).

---

## 🚀 Setup & Running Instructions

### Step 1: Clone & Navigate
Ensure you are inside the project folder:
```powershell
cd "C:\Self-learning\5-Day AI Agents - Intensive Vibe Coding Course With Google\agy2-projects\bigquery_viewer"
```

### Step 2: Start the Web App
Execute the server using your Python 3.12 environment (where `flask` is installed):
```powershell
python app.py
```
*(If Python is not in your system path, run using the absolute path: `C:\Users\shaya\AppData\Local\Programs\Python\Python312\python.exe app.py`)*

### Step 3: View the Dashboard
Open your web browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📜 Documentation Links

Additional design docs are saved locally within this repository:
*   Detailed Flow & Sequence Charts: [Architecture Overview](architecture_overview.md)
*   System Architecture & Details: [Implementation Plan](implementation_plan.md)
*   Implementation Tracker Log: [Task Log](task.md)
