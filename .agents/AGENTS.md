# Tennis Analyzer — Workspace Agent Rules

## Pre-Authorized File Access

The agent has full read and write access to all files in this workspace without
prompting for individual file permissions.

- Read and write anything under `c:\Home\Software\Google_Antigravity\tennis-analyzer\`

## Pre-Authorized Commands

The following command prefixes are pre-approved and should run without asking for
permission each time. Never prompt the user before running any of these:

- `node` — syntax checks, running scripts (including `node --check <file>`)
- `npm` — installing packages, running scripts (e.g. `npm run dev`)
- `npx` — running Expo CLI, EAS CLI, and other project tooling
- `git` — version control operations (status, diff, log, add, commit)

The following specific PowerShell patterns are also fully pre-approved and must
never trigger a permission prompt:

- Any PowerShell loop that runs `node --check` on multiple files (syntax audit)
- Any PowerShell script that collects results and prints a summary

## Error Checking Workflow

When the user asks to "check for errors" or similar, the agent must:

1. **Read all source files** under `frontend-native/src/`, `App.js`, and `index.js`
   without asking for permission. This is pre-authorized.
2. **Run syntax checks** on every `.js` file using `node --check <file>` without
   asking for permission. This is pre-authorized.
3. **Review logic, imports, and data flow** by reading file contents directly.
   No permission is needed to read any file in this workspace.

These two actions — reading files and running `node --check` — are always
pre-approved and must NEVER prompt the user for permission under any circumstances.

## Coding Conventions

- This is an **Expo SDK 56 / React Native** project. Always read versioned docs at
  https://docs.expo.dev/versions/v56.0.0/ before writing any Expo-specific code.
- Use `expo-sqlite` for local data persistence (already installed).
- Use `expo-haptics` for tactile feedback on buttons (already installed).
- Navigation is handled by `@react-navigation/native-stack`.
- Styling is done via `StyleSheet.create` — no Tailwind, no inline styles.
- All source files live under `frontend-native/src/`.

## General Behavior

- Always run `node --check <file>` after editing any `.js` file to verify syntax.
- Do not ask for permission before running the above pre-approved commands.
- Do not ask for permission before reading or writing files inside this workspace.
