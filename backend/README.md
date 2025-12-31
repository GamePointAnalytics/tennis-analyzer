# Backend (Google Apps Script)

This directory contains the server-side logic for the Tennis Analyzer app.

## Setup with CLASP

We use [CLASP](https://github.com/google/clasp) to manage the code locally.

### Prerequisites
- Node.js installed
- CLASP installed globally: `npm install -g @google/clasp`

### Initialization
1.  Login to Google:
    ```bash
    clasp login
    ```
2.  Clone the existing script (get the Script ID from Project Settings > IDs):
    ```bash
    clasp clone "YOUR_SCRIPT_ID" --rootDir ./backend/src
    ```

### Workflow
- **Pull changes**: `clasp pull`
- **Push changes**: `clasp push`
