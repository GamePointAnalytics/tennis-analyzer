# Tennis Analyzer — Frequently Asked Questions

This FAQ describes the current Tennis Analyzer mobile app. It records matches point by point, saves data locally first, synchronizes with the cloud, and produces statistical and optional AI-powered reports.

## Table of Contents

- [General questions](#general-questions)
- [Matches](#matches)
- [Charting points](#charting-points)
- [Analysis and insights](#analysis-and-insights)
- [Data, sync, and privacy](#data-sync-and-privacy)

## General questions

### 1. What is Tennis Analyzer?

The app lets you capture detailed point-by-point data such as serve direction, serve outcome, last-shot type, last-shot hand, rally length, point outcome, shot classification, winner, score, and notes. This detailed data supports more in-depth analysis of serve patterns, rallies, errors, winners, pressure points, and other match performance factors.

You can also send the match statistics to a supported AI model to generate additional insights, including strengths and weaknesses, performance diagnoses, and training recommendations.

The app is useful for coaches, friends, or family members who want to chart a match in real time and provide immediate feedback or on-court coaching when the rules allow it. Players can use it to understand their own strengths and weaknesses, track progress across matches, identify patterns under pressure, and research an opponent's serve, rally, and scoring tendencies. Reviewing the data after a match can also help turn general impressions into specific practice goals and more focused coaching conversations.

### 2. Do I need an account or login?

No. The app creates an eight-character hexadecimal User ID on the device. No username, password, or sign-in is required.

### 3. How do I start using the app?

1. On **Matches**, tap **+**.
2. Enter both player names. Tournament, date, venue, scoring format, and notes are optional.
3. Tap **Save Match**, open the match, and tap **Chart Points**.
4. Enter the point information and tap **Save Point**.
5. From **Match Detail**, choose **View Stats** or **AI Insights**.

### 4. What can I enter for a point?

You can record the serving player; first- and second-serve direction (**Wide**, **Body**, **T**) and outcome (**In**, **Out**, **Net**, **Let**, **Ace**); rally length; last-shot hand; last-shot type (**Serve**, **Volley**, **Slice**, **Smash**, **Drop**, **Lob**, **Pass**); shot result; classification (**Winner**, **Unforced Error**, **Forced Error**); and notes. The point winner is required; the other fields are optional.

### 5. Where should I stand while charting?

An elevated position behind one player is usually best because it makes serve direction easier to judge. Choose a location where you can concentrate and see the court clearly.

## Matches

### 6. How do I create or edit a match?

Tap **+** to create a match. Player 1 and Player 2 are required. Tap the pencil icon on an existing match to edit it. **Advantage (Ad)** scoring is the default; switch it off for **No-Advantage (No-Ad)** scoring.

### 7. How do I delete a match?

Tap the trash icon and confirm. The local match, its points, and the cloud record are removed when the cloud is reachable. Local deletion still occurs if the cloud is temporarily unavailable.

### 8. Can I record doubles matches?

The app has two player fields and is designed primarily for singles. It can track a doubles score, but its player-by-player statistics are not designed for four players.

### 9. Can I analyze several matches together?

Yes. On **Matches**, tap the selection icon, select the matches, and tap **Analyze**. This opens a combined AI Insights report.

## Charting points

### 10. Are scores calculated automatically?

Yes. The app calculates point, game, set, and match scores from the selected winner and scoring format. It also carries the calculated server into the next point.

### 11. What if I missed points or the score is wrong?

Tap the blue score banner in the point editor, choose **Adjust Match Score**, edit set, game, point, or tiebreak state, and tap **Apply Changes**. The adjustment becomes the starting score for the point you save.

### 12. Do I need to select the server every time?

Usually not. Change **Serving Player** manually when the automatic choice is wrong, especially after missed points or a score adjustment.

### 13. How do I record an ace or double fault?

For an ace, set the serve outcome to **Ace**. The app treats it as a one-shot point and selects the server as winner.

For a double fault, set the first serve to **Out** or **Net**, then set the second serve to **Out** or **Net**. The app records a zero-shot rally and assigns the point to the receiver. Review the inferred winner before saving.

### 14. How do I record an unreturnable serve?

Count the serve as shot 1 and the unsuccessful return as shot 2. Set last-shot type to **Serve** and normally classify the result as a **Forced Error** when the serve caused the miss.

### 15. How should I classify forced and unforced errors?

Use your best judgment. An error made with time and balance is generally unforced; an error caused by opponent pressure is generally forced. For a forced error, record the shot that caused the error—usually the point winner’s last shot—rather than the losing player’s miss.

### 16. How should I count rally length?

Count the serve as shot 1. An ace is one shot and an unreturnable serve is normally two shots. Use this convention consistently because rally length feeds the analysis.

### 17. How do I record a tiebreak?

When detected, the point editor shows **Tiebreak Active**. Choose **7-Point** or **10-Point (Super)**. If the history is incomplete, use **Tap to Adjust Score** to activate the tiebreak and set its starting score.

### 18. How do I correct or undo a point?

Tap a point in **Point History**, edit it, and tap **Update Point**. **Delete Point** removes it and recalculates subsequent scores. While adding points, the undo icon deletes the last charted point after confirmation.

## Analysis and insights

### 19. What is the Analysis Report?

**View Stats** opens the statistical report for one match. It includes calculated score, points won/lost, serve performance and patterns, rally and return statistics, high-pressure points, errors, winners, and histograms where available. Sections are expandable: **Overview & Match Score**, **Serve Performance**, **Rally & Return Stats**, **High Pressure Points**, and **Errors & Winners**.

### 20. When is the Analysis Report updated?

It is generated by the cloud analysis service from synchronized point data. After adding or editing points, tap the report’s refresh icon. The report may be unavailable until synchronization completes.

### 21. How do I share a statistical report?

Open **View Stats**, wait for it to load, and tap the share icon. The app creates a PDF and opens the device share sheet for supported apps such as email, messaging, or cloud storage.

### 22. What is AI Insights?

**AI Insights** analyzes one or more matches for a selected player. It can show serve patterns, strengths and weaknesses, baseline performance, net play, momentum and consistency, high-pressure performance, a win/loss diagnosis, and training recommendations. For one match, use the player toggle to switch between Player 1 and Player 2. Sections can be expanded or collapsed, and the report can be shared as a PDF.

### 23. What are the AI Insights modes?

Configure **Settings → Analysis & Insights**:

- **Rules**: deterministic, instant, offline, and no API key required.
- **Hybrid**: structured statistics plus AI-written diagnosis and recommendations; this is the default.
- **LLM**: an AI-generated narrative report.

Without a key, Hybrid and LLM modes show the rules-based report and explain how to configure AI.

### 24. Which AI providers are supported?

Claude (Anthropic), GPT (OpenAI), Gemini (Google), and OpenRouter are supported. Choose a provider, enter its API key, select a listed model or enter a custom model identifier, and tap **Save AI Configuration**. Keys are stored in device secure storage and sent directly to the selected provider; they are not sent to the Tennis Analyzer cloud service.

### 25. How do I set up AI analysis with an API key?

1. Open **Settings** from the Matches screen.
2. Under **Analysis & Insights**, select **Hybrid** or **LLM** as the **Report Mode**.
3. Choose an **AI Provider**: Claude, GPT, Gemini, or OpenRouter.
4. Enter an API key issued by that provider.
5. Select a listed model, or choose **Custom...** and enter the provider’s model identifier.
6. Tap **Save AI Configuration** and wait for the saved confirmation.
7. Return to a match and open **AI Insights**.

Keys are saved in the device’s local secure storage. The app does not issue provider keys, and your AI provider may charge for API usage. If no key is configured, use **Rules** mode for an offline, rules-based report.

### 26. How does the AI analysis work?

When you open AI Insights, the app requests structured match insights from the Tennis Analyzer cloud service. It can analyze one match or several selected matches for the selected player, including serve direction, serve effectiveness, errors and winners, net play, momentum, consistency, and high-pressure performance.

In **Rules** mode, the app displays deterministic findings from those statistics and does not call an AI provider. In **Hybrid** mode, the structured findings are retained and the selected provider writes the diagnosis and recommendations. In **LLM** mode, the provider writes the full narrative report. Results are cached on the device; use the refresh icon to request updated data.

If AI generation fails or no API key is available, the app falls back to the rules-based report where possible. A small sample can also cause an insight to be labeled insufficient or thin.

### 27. Why is an insight marked insufficient or thin?

Some insights require enough relevant serves, pressure points, net points, or shots. When the sample is too small, the report avoids presenting a misleading conclusion. Chart more complete matches and refresh.

## Data, sync, and privacy

### 28. Where is my data stored?

Match data and points are saved in a local SQLite database first. Pending data is uploaded to the configured Google Apps Script web app, which stores cloud data in Google Sheets and calculates the statistical analysis.

### 29. Do I need internet access?

Not for basic charting. Offline matches and points remain **Pending** until sync succeeds. Internet is required to upload/download cloud data and fetch the Analysis Report. AI Insights needs network access when uncached data or AI text must be retrieved.

The app attempts sync when returning to the foreground, leaving point charting, pull-to-refresh, or tapping **Sync Unsaved Data** in Settings.

### 30. How do I use my data on another device?

Copy the User ID from **Settings** on the original device, enter it on the new device, tap **Save Changes**, then tap **Sync Unsaved Data**. Devices using the same ID share the same cloud match history.

Keep the ID private. **New ID** disconnects the device from the previous ID’s data unless you saved that ID.

### 31. Is my data private?

The app does not require a traditional login. Your User ID acts as the access key for your Tennis Analyzer cloud data, so keep it private and do not put sensitive information in player names, match notes, or point notes. Anyone with the User ID may be able to access the associated cloud data.

Your AI API keys are stored locally on the device in secure storage and are not synchronized with the Tennis Analyzer backend. When you generate an AI report, the selected key is sent directly from the phone to the chosen AI provider over HTTPS for authentication. The Tennis Analyzer backend receives match statistics for analysis but does not receive your AI API key. The selected provider may bill you directly for AI usage.

### 32. What do “Pending” and “Synced” mean?

**Pending** means local changes still need uploading. **Synced** means the latest local match and point data was uploaded successfully. Pull down on the Matches list or use **Sync Unsaved Data** to retry.
