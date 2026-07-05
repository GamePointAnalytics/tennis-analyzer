$files = @(
  'App.js','index.js',
  'src/screens/PointEditorScreen.js','src/screens/MatchDetailScreen.js',
  'src/screens/MatchEditorScreen.js','src/screens/MatchesScreen.js',
  'src/screens/AnalysisScreen.js','src/screens/SettingsScreen.js',
  'src/components/Card.js','src/components/HapticButton.js',
  'src/components/RallySelector.js','src/components/SegmentedControl.js',
  'src/database/db.js','src/utils/api.js',
  'src/utils/scoreCalculator.js','src/utils/settings.js',
  'src/utils/syncManager.js'
)
$errors = @()
foreach ($f in $files) {
  $r = node --check $f 2>&1
  if ($LASTEXITCODE -ne 0) {
    $errors += "FAIL: $f`n$r"
  } else {
    Write-Host "OK: $f"
  }
}
if ($errors.Count -eq 0) {
  Write-Host "`nALL SYNTAX OK"
} else {
  Write-Host "`nERRORS FOUND:"
  $errors | ForEach-Object { Write-Host $_ }
}
