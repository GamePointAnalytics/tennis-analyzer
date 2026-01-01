# Backend (Google Apps Script)

This directory contains the server-side logic for the **Tennis Analyzer** app. It handles data processing, statistics calculation, and spreadsheet management.

## 📂 Source Code (`src/Code.js`)

The main script `Code.js` contains the following key functions:

### ⚡ Core Triggers
These functions are likely called by AppSheet bots or spreadsheet triggers:
- **`onPointChange(matchIndex)`**: Recalculates statistics when point data is modified.
- **`addNewAnalysis(user, matchIndex, ...)`**: Initializes a new analysis row when a match is created.
- **`deleteAnalysis(matchIndex)`**: Cleans up analysis rows and point data when a match is deleted.
- **`updateMatchInfo(...)`**: Updates metadata (players, date, tournament) for a specific match.

### 🧮 Statistical Logic
- **`updateStatistics(rows, matchIndex)`**: The heavy lifter. Iterates through point data to calculate:
  - Serve percentages
  - Break points
  - High-pressure points
- **`isHighPressurePoint(row)`**: Determines if a point is critical (e.g., 30-30, Deuce).
- **`isGameOrBreakPoint(row)`**: Identifies game or break point opportunities.

## 🛠️ Setup & workflows

### Prerequisite
- **Node.js** and **CLASP** installed globally.

### Syncing
This project is linked to the Apps Script project:
- **Script ID**: `1VmWhEVY68tM_EDLlvhYDxX5PbvmzFXEdiEkkMGm3I9eP-DEia-ABLhIM`

#### Commands
1.  **Login**:
    ```bash
    clasp login
    ```
2.  **Pull latest code** (if you edited in the browser):
    ```bash
    clasp pull
    ```
3.  **Push local changes** (after editing VS Code):
    ```bash
    clasp push
    ```

> **Note**: `src/appsscript.json` contains the project manifest and timezone settings.
