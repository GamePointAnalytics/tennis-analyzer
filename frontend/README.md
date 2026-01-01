# AppSheet Frontend Documentation

Direct export of AppSheet logic is not supported by the current editor.

**Recommendation for complex apps:**
1.  **Screenshots**: Take screenshots of your Data > Columns tab and save them in the `screenshots/` folder.
2.  **Print to PDF**: Open the "Columns" or "Slices" tab in your browser and press `Ctrl+P` -> Save as PDF. Save it in this directory.
3.  **Key Logic Only**: Use the sections below to text-searchable formulas for only your *most critical* calculations (e.g. Win Rate, Match Status).

## Editor Link
[Open AppSheet Editor](https://www.appsheet.com/template/AppDef?appName=TennisMicroAnalyzerFree-951054841&appId=3d2e670b-8bc7-4bf0-af4a-cf4108cfc997&quickStart=False&nonce=0.35289627417473923#Data.Columns.analyses)

## 1. Core Views
*(What screens do users see?)*

### 🏠 Dashboard
- **Type**: Dashboard
- **Content**: Shows `Recently Analyzed` (Deck View) and `Win Probability Estimates` (Chart).
- **Display Logic**: Show only if `UserRole` context is valid.

### 🎾 Match Input
- **Type**: Form
- **Source Table**: `Matches`
- **Key Behavior**: Captures point-by-point data or final scores.

### 📊 Player Stats
- **Type**: Detail View
- **Source Table**: `Players`
- **Actions**: "Compare Players", "View Head-to-Head"

## 2. Key Data Slices
*(How do we filter data?)*

- **`Slice_MyMatches`**:
  - Filter: `[UserEmail] = USEREMAIL()`
  - Used in: "My Analysis" View

- **`Slice_RecentCompleted`**:
  - Filter: `AND([Status] = "Completed", [Date] > (TODAY() - 30))`

## 3. Important Formulas (Virtual Columns)
*(Complex logic that calculates on the fly)*

### Table: `Matches`
- **`Column: Winner Name`**:
  ```excel
  LOOKUP([WinnerID], "Players", "PlayerID", "Name")
  ```
- **`Column: Win Rate`**:
  ```excel
  [Wins] / ([Wins] + [Losses])
  ```

## 4. Automation (Bots)
- **Bot Name**: `Generate Analysis Report`
- **Trigger**: Adds/Updates to `Analyses` table.
- **Action**: Calls Apps Script `generateReport()` or creates PDF.

