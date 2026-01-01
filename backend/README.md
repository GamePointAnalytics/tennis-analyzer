# Backend (Google Apps Script)

This directory contains the server-side logic for the **Tennis Analyzer** app. It handles data processing, statistics calculation, and spreadsheet management.

## Source Code (`src/MicroStats.js`)

The main script `MicroStats.js` contains the following key functions:

### Core Triggers
These functions are called by AppSheet bots or spreadsheet triggers:
- **`onPointChange(matchIndex)`**: Recalculates statistics when point data is modified.
- **`addNewAnalysis(user, matchIndex, ...)`**: Initializes a new analysis row when a match is created.
- **`deleteAnalysis(matchIndex)`**: Cleans up analysis rows and point data when a match is deleted.
- **`updateMatchInfo(...)`**: Updates metadata (players, date, tournament) for a specific match.

### Statistical Logic
- **`updateStatistics(rows, matchIndex)`**: The heavy lifter. Iterates through point data to calculate many statistics:
  - Serve percentages
  - Break points won percentages
  - High-pressure points won percentages
  - Serve direction patterns
  - Shot count
  - Shot type (forehand, backhand, etc.)
  - Shot result (winner, unforced error, forced error)
  - and many more...
- **`isHighPressurePoint(row)`**: Determines if a point is critical point (e.g., 30-30, Deuce).
- **`isGameOrBreakPoint(row)`**: Identifies game or break points.

