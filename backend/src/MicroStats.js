// For the secure app
// var spreadsheetID = "1ucYiMUDwdBlwKmC6VH_AOctsZrNcdnYWPm_NjcN_2LE";

// For the free app
var spreadsheetID = "1K9altiDxgC3xIL2N8J_5ZelRJjHVKu5UBE8PdcUv-Qs";
var spreadsheet = SpreadsheetApp.openById(spreadsheetID);

// Remember to add 1 when you use the column numbers in getRange().
var matchIndexColumnNumberPoints = getColumnNumber("match index", "points");
var firstServeOutcomeColumnNumberPoints = getColumnNumber("first serve outcome", "points");
var secondServeOutcomeColumnNumberPoints = getColumnNumber("second serve outcome", "points");
var serverColumnNumberPoints = getColumnNumber("server", "points");
var player1ColumnNumberPoints = getColumnNumber("player 1", "points");
var player2ColumnNumberPoints = getColumnNumber("player 2", "points");
var outcomeTypeColumnNumberPoints = getColumnNumber("outcome type", "points");
var outcomeColumnNumberPoints = getColumnNumber("outcome", "points");
var winnerColumnNumberPoints = getColumnNumber("winner", "points");
var rallyLengthColumnNumberPoints = getColumnNumber("rally length", "points");
var firstServeDirColumnNumberPoints = getColumnNumber("first serve direction", "points");
var secondServeDirColumnNumberPoints = getColumnNumber("second serve direction", "points");
var lastShotHandColumnNumberPoints = getColumnNumber("last shot hand", "points");
var lastShotTypeColumnNumberPoints = getColumnNumber("last shot type", "points");
var pointScore1PreColumnNumberPoints = getColumnNumber("point score 1 pre", "points");
var pointScore2PreColumnNumberPoints = getColumnNumber("point score 2 pre", "points");
var tiebreakColumnNumberPoints = getColumnNumber("tiebreak", "points");
var tiebreakScore1PreColumnNumberPoints = getColumnNumber("tiebreak score 1 pre", "points");
var tiebreakScore2PreColumnNumberPoints = getColumnNumber("tiebreak score 2 pre", "points");
var gameScore1PostColumnNumberPoints = getColumnNumber("game score 1 post", "points");
var gameScore2PostColumnNumberPoints = getColumnNumber("game score 2 post", "points");
var gameScore1PreColumnNumberPoints = getColumnNumber("game score 1 pre", "points");
var gameScore2PreColumnNumberPoints = getColumnNumber("game score 2 pre", "points");
var setScore1PreColumnNumberPoints = getColumnNumber("set score 1 pre", "points");
var setScore2PreColumnNumberPoints = getColumnNumber("set score 2 pre", "points");
var adScoringColumnNumberPoints = getColumnNumber("ad scoring", "points");

// Find key column numbers.
// Remember to add 1 when you use the column numbers in getRange().
function getColumnNumber(columnName, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headerRow.indexOf(columnName);
}

// This function is called when the "points" sheet is changed
function onPointChange(matchIndex) {
  // Get the active sheet and range
  var sheet = spreadsheet.getSheetByName("points");
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();

  var selectedRows = []
  for (var i = 1; i < values.length; i++) {
    // Find and save all the rows with the given match ID.
    if (values[i][matchIndexColumnNumberPoints] == matchIndex) {
      selectedRows.push(values[i]);
    }
  }

  if (selectedRows.length > 0) {
    updateStatistics(selectedRows, matchIndex);
  } else {
    // All points deleted — clear stale stats from the analyses sheet
    updateStatistics([], matchIndex);
  }
}

// When a new match is added, add a new row in the analysis sheet
function addNewAnalysis(user, matchIndex, player1, player2, tournament, date, adScoring) {
  var sheet = spreadsheet.getSheetByName("analyses");
  sheet.appendRow([user, matchIndex, player1, player2, tournament, date, adScoring]);
}

// When a match is deleted, delete the corresponding row 
// in the analysis sheet and all the points in the points sheet. 
function deleteAnalysis(matchIndex) {
  Logger.log(matchIndex);

  var sheet = spreadsheet.getSheetByName("analyses");
  var range = sheet.getDataRange();
  var values = range.getValues();

  var matchIndexColumnNumberAnalysis = getColumnNumber("match index", "analyses");

  // Must loop from bottom to top because 
  // when you delete a row, the row blow it will automatically move up.
  for (var i = values.length - 1; i >= 1; i--) {
    if (values[i][matchIndexColumnNumberAnalysis] == matchIndex) {
      // delete the row (add 1 because arrays are zero-indexed)
      sheet.deleteRow(i + 1);
    }
  }

  sheet = spreadsheet.getSheetByName("points");
  range = sheet.getDataRange();
  values = range.getValues();

  // Must loop from bottom to top in this case.
  for (var i = values.length - 1; i >= 1; i--) {
    if (values[i][matchIndexColumnNumberPoints] == matchIndex) {
      // delete the row (add 1 because arrays are zero-indexed)
      sheet.deleteRow(i + 1);
    }
  }
}

function updateMatchInfo(matchIndex, date, player1, player2, tournament, adScoring) {
  // Update the analysis sheet
  var sheet = spreadsheet.getSheetByName("analyses");
  var range = sheet.getDataRange();
  var values = range.getValues();

  var matchIndexColumnNumberAnalysis = getColumnNumber("match index", "analyses");
  var player1ColumnNumberAnalysis = getColumnNumber("player1", "analyses");
  var player2ColumnNumberAnalysis = getColumnNumber("player2", "analyses");
  var dateColumnNumberAnalysis = getColumnNumber("date", "analyses");
  var tournamentColumnNumberAnalysis = getColumnNumber("tournament", "analyses");
  var adScoringColumnNumberAnalysis = getColumnNumber("ad scoring", "analyses");

  for (var i = 0; i < values.length; i++) {
    if (values[i][matchIndexColumnNumberAnalysis] == matchIndex) {
      sheet.getRange(i + 1, player1ColumnNumberAnalysis + 1).setValue(player1);
      sheet.getRange(i + 1, player2ColumnNumberAnalysis + 1).setValue(player2);
      sheet.getRange(i + 1, dateColumnNumberAnalysis + 1).setValue(date);
      sheet.getRange(i + 1, tournamentColumnNumberAnalysis + 1).setValue(tournament);
      sheet.getRange(i + 1, adScoringColumnNumberAnalysis + 1).setValue(adScoring);
    }
  }

  // Update the point sheet
  sheet = spreadsheet.getSheetByName("points");
  range = sheet.getDataRange();
  values = range.getValues();

  var matchIndexColumnNumberPoints = getColumnNumber("match index", "points");
  // In the points sheet, the column title is "player 1" not "player1".
  var player1ColumnNumberPoints = getColumnNumber("player 1", "points");
  var player2ColumnNumberPoints = getColumnNumber("player 2", "points");
  var serverColumnNumberPoints = getColumnNumber("server", "points");
  var winnerColumnNumberPoints = getColumnNumber("winner", "points");
  var adScoringColumnNumberPoints = getColumnNumber("ad scoring", "points");

  var server = 0;
  var winner = 0;
  for (var i = 0; i < values.length; i++) {
    if (values[i][matchIndexColumnNumberPoints] == matchIndex) {

      // Find out who is the server
      if (values[i][serverColumnNumberPoints] == values[i][player1ColumnNumberPoints]) {
        server = 1;
      } else if (values[i][serverColumnNumberPoints] == values[i][player2ColumnNumberPoints]) {
        server = 2;
      } else {
        // unknown server
        server = 0;
      }

      // Find out who is the winner
      if (values[i][winnerColumnNumberPoints] == values[i][player1ColumnNumberPoints]) {
        winner = 1;
      } else if (values[i][winnerColumnNumberPoints] == values[i][player2ColumnNumberPoints]) {
        winner = 2;
      } else {
        // unknown winner
        winner = 0;
      }

      // Update player names
      sheet.getRange(i + 1, player1ColumnNumberPoints + 1).setValue(player1);
      sheet.getRange(i + 1, player2ColumnNumberPoints + 1).setValue(player2);

      // Update server names
      if (server == 1) {
        sheet.getRange(i + 1, serverColumnNumberPoints + 1).setValue(player1);
      } else if (server == 2) {
        sheet.getRange(i + 1, serverColumnNumberPoints + 1).setValue(player2);
      }

      // Update winner names
      if (winner == 1) {
        sheet.getRange(i + 1, winnerColumnNumberPoints + 1).setValue(player1);
      } else if (winner == 2) {
        sheet.getRange(i + 1, winnerColumnNumberPoints + 1).setValue(player2);
      }

      sheet.getRange(i + 1, adScoringColumnNumberPoints + 1).setValue(adScoring);
    }
  }

  // Refresh the statistics report because we have made changes
  onPointChange(matchIndex);
}

function updateStatistics(rows, matchIndex) {

  // *************************
  // Calculate stats
  var player1FirstServeCount = 0;
  var player2FirstServeCount = 0;
  var player1FirstServeInCount = 0;
  var player2FirstServeInCount = 0;
  var player1FirstServeNetCount = 0;
  var player1FirstServeOutCount = 0;
  var player2FirstServeNetCount = 0;
  var player2FirstServeOutCount = 0;
  var player1DeuceFirstServeCount = 0;
  var player2DeuceFirstServeCount = 0;
  var player1AdFirstServeCount = 0;
  var player2AdFirstServeCount = 0;

  var player1ReturnWinnerCount = 0;
  var player1ReturnUnforcedErrorCount = 0;
  var player2ReturnWinnerCount = 0;
  var player2ReturnUnforcedErrorCount = 0;

  var player1FirstServeWideCount = 0;
  var player1FirstServeBodyCount = 0;
  var player1FirstServeTCount = 0;

  var player2FirstServeWideCount = 0;
  var player2FirstServeBodyCount = 0;
  var player2FirstServeTCount = 0;

  var player1SecondServeWideCount = 0;
  var player1SecondServeBodyCount = 0;
  var player1SecondServeTCount = 0;

  var player2SecondServeWideCount = 0;
  var player2SecondServeBodyCount = 0;
  var player2SecondServeTCount = 0;

  var player1FirstServeDeuceNetCount = 0
  var player1FirstServeDeuceOutCount = 0;
  var player1FirstServeAdNetCount = 0;
  var player1FirstServeAdOutCount = 0;

  var player1FirstServeDeuceWideNetCount = 0;
  var player1FirstServeDeuceBodyNetCount = 0;
  var player1FirstServeDeuceTNetCount = 0;
  var player1FirstServeDeuceWideOutCount = 0;
  var player1FirstServeDeuceBodyOutCount = 0;
  var player1FirstServeDeuceTOutCount = 0;
  var player1FirstServeAdWideNetCount = 0;
  var player1FirstServeAdBodyNetCount = 0;
  var player1FirstServeAdTNetCount = 0;
  var player1FirstServeAdWideOutCount = 0;
  var player1FirstServeAdBodyOutCount = 0;
  var player1FirstServeAdTOutCount = 0;

  var player2FirstServeDeuceNetCount = 0
  var player2FirstServeDeuceOutCount = 0;
  var player2FirstServeAdNetCount = 0;
  var player2FirstServeAdOutCount = 0;

  var player2FirstServeDeuceWideNetCount = 0;
  var player2FirstServeDeuceBodyNetCount = 0;
  var player2FirstServeDeuceTNetCount = 0;
  var player2FirstServeDeuceWideOutCount = 0;
  var player2FirstServeDeuceBodyOutCount = 0;
  var player2FirstServeDeuceTOutCount = 0;
  var player2FirstServeAdWideNetCount = 0;
  var player2FirstServeAdBodyNetCount = 0;
  var player2FirstServeAdTNetCount = 0;
  var player2FirstServeAdWideOutCount = 0;
  var player2FirstServeAdBodyOutCount = 0;
  var player2FirstServeAdTOutCount = 0;

  var player1FirstServeWonCount = 0;
  var player2FirstServeWonCount = 0;

  var player1SecondServeCount = 0;
  var player2SecondServeCount = 0;
  var player1SecondServeWonCount = 0;
  var player2SecondServeWonCount = 0;

  var player1AceCount = 0;
  var player2AceCount = 0;

  var player1AceWideCount = 0;
  var player1AceBodyCount = 0;
  var player1AceTCount = 0;
  var player2AceWideCount = 0;
  var player2AceBodyCount = 0;
  var player2AceTCount = 0;

  var player1DoubleFaultCount = 0;
  var player2DoubleFaultCount = 0;
  var player1DoubleFaultNetCount = 0;
  var player1DoubleFaultOutCount = 0;
  var player2DoubleFaultNetCount = 0;
  var player2DoubleFaultOutCount = 0;

  var player1FirstServeDeuceSideInCount = 0;
  var player1FirstServeAdSideInCount = 0;
  var player1FirstServeDeuceSideWonCount = 0;
  var player1FirstServeAdSideWonCount = 0;
  var player2FirstServeDeuceSideInCount = 0;
  var player2FirstServeAdSideInCount = 0;
  var player2FirstServeDeuceSideWonCount = 0;
  var player2FirstServeAdSideWonCount = 0;

  var player1SecondServeDeuceSideCount = 0;
  var player1SecondServeAdSideCount = 0;
  var player1SecondServeDeuceSideWonCount = 0;
  var player1SecondServeAdSideWonCount = 0;
  var player2SecondServeDeuceSideCount = 0;
  var player2SecondServeAdSideCount = 0;
  var player2SecondServeDeuceSideWonCount = 0;
  var player2SecondServeAdSideWonCount = 0;

  var player1AceDeuceSideCount = 0;
  var player1AceAdSideCount = 0;
  var player2AceDeuceSideCount = 0;
  var player2AceAdSideCount = 0;
  var player1DoubleFaultDeuceSideCount = 0;
  var player1DoubleFaultAdSideCount = 0;
  var player2DoubleFaultDeuceSideCount = 0;
  var player2DoubleFaultAdSideCount = 0;
  var player1ReturnWinnerDeuceSideCount = 0;
  var player1ReturnWinnerAdSideCount = 0;
  var player2ReturnWinnerDeuceSideCount = 0;
  var player2ReturnWinnerAdSideCount = 0;
  var player1ReturnUnforcedErrorDeuceSideCount = 0;
  var player1ReturnUnforcedErrorAdSideCount = 0;
  var player2ReturnUnforcedErrorDeuceSideCount = 0;
  var player2ReturnUnforcedErrorAdSideCount = 0;

  var player1FirstServeWideDeuceSideCount = 0;
  var player1FirstServeWideAdSideCount = 0;
  var player2FirstServeWideDeuceSideCount = 0;
  var player2FirstServeWideAdSideCount = 0;
  var player1FirstServeBodyDeuceSideCount = 0;
  var player1FirstServeBodyAdSideCount = 0;
  var player2FirstServeBodyDeuceSideCount = 0;
  var player2FirstServeBodyAdSideCount = 0;
  var player1FirstServeTDeuceSideCount = 0;
  var player1FirstServeTAdSideCount = 0;
  var player2FirstServeTDeuceSideCount = 0;
  var player2FirstServeTAdSideCount = 0;
  var player1SecondServeWideDeuceSideCount = 0;
  var player1SecondServeWideAdSideCount = 0;
  var player2SecondServeWideDeuceSideCount = 0;
  var player2SecondServeWideAdSideCount = 0;
  var player1SecondServeBodyDeuceSideCount = 0;
  var player1SecondServeBodyAdSideCount = 0;
  var player2SecondServeBodyDeuceSideCount = 0;
  var player2SecondServeBodyAdSideCount = 0;
  var player1SecondServeTDeuceSideCount = 0;
  var player1SecondServeTAdSideCount = 0;
  var player2SecondServeTDeuceSideCount = 0;
  var player2SecondServeTAdSideCount = 0;

  var player1FirstServeDeuceSidePattern = "";
  var player1FirstServeAdSidePattern = "";
  var player2FirstServeDeuceSidePattern = "";
  var player2FirstServeAdSidePattern = "";
  var player1SecondServeDeuceSidePattern = "";
  var player1SecondServeAdSidePattern = "";
  var player2SecondServeDeuceSidePattern = "";
  var player2SecondServeAdSidePattern = "";

  var player1ServePlusOneWonCount = 0;
  var player2ServePlusOneWonCount = 0;
  var player1ServeAndVolleyWonCount = 0;
  var player2ServeAndVolleyWonCount = 0;
  var player1ServePlusOneUnforcedErrorCount = 0;
  var player2ServePlusOneUnforcedErrorCount = 0;
  var player1ServeAndVolleyUnforcedErrorCount = 0;
  var player2ServeAndVolleyUnforcedErrorCount = 0;

  var player1UnforcedErrorCount = 0;
  var player2UnforcedErrorCount = 0;

  var player1UnforcedErrorOutCount = 0;
  var player1UnforcedErrorNetCount = 0;
  var player2UnforcedErrorOutCount = 0;
  var player2UnforcedErrorNetCount = 0;

  var player1WinnerForcedErrorCount = 0;
  var player1WinnerCount = 0;
  var player1ForcedErrorCount = 0;

  var player2WinnerForcedErrorCount = 0;
  var player2WinnerCount = 0;
  var player2ForcedErrorCount = 0;

  var player1PointsWonCount = 0;
  var player2PointsWonCount = 0;

  var player1PointsWonByUnforcedErrorsPct = 0;
  var player1PointsWonByWinnersPct = 0;

  var player2PointsWonByUnforcedErrorsPct = 0;
  var player2PointsWonByWinnersPct = 0;

  var rallyLengthSum = 0;
  var pointsWithRallyLength = 0;

  var longestRallyLength = 0;
  var shortPointCount = 0;
  var longerPointCount = 0;
  var veryLongPointCount = 0;
  var player1ShortPointWonCount = 0;
  var player1LongerPointWonCount = 0;
  var player1VeryLongPointWonCount = 0;
  var player2ShortPointWonCount = 0;
  var player2LongerPointWonCount = 0;
  var player2VeryLongPointWonCount = 0;

  var shortPointOnPlayer1ServeCount = 0;
  var shortPointOnPlayer2ServeCount = 0;

  var longerPointOnPlayer1ServeCount = 0;
  var longerPointOnPlayer2ServeCount = 0;

  var veryLongPointOnPlayer1ServeCount = 0;
  var veryLongPointOnPlayer2ServeCount = 0;

  var player1ServeAndWonShortPointCount = 0;
  var player2ServeAndWonShortPointCount = 0;
  var player2ReturnAndWonShortPointCount = 0;
  var player1ReturnAndLostShortPointCount = 0;
  var player2ReturnAndLostShortPointCount = 0;
  var player1ServeAndLostShortPointCount = 0;
  var player2ServeAndLostShortPointCount = 0;
  var player1ReturnAndWonShortPointCount = 0;
  var player1WonShortPointByOpponentUnforcedErrorCount = 0;
  var player2WonShortPointByOpponentUnforcedErrorCount = 0;
  var player1LostShortPointByUnforcedErrorCount = 0;
  var player2LostShortPointByUnforcedErrorCount = 0;
  var player1WonShortPointByWinnerCount = 0;
  var player2WonShortPointByWinnerCount = 0;
  var player1LostShortPointByOpponentWinnerCount = 0;
  var player2LostShortPointByOpponentWinnerCount = 0;

  var shortPointOnPlayer1FirstServeCount = 0;
  var shortPointOnPlayer2FirstServeCount = 0;
  var shortPointOnPlayer1SecondServeCount = 0;
  var shortPointOnPlayer2SecondServeCount = 0;

  var longerPointOnPlayer1FirstServeCount = 0;
  var longerPointOnPlayer2FirstServeCount = 0;
  var longerPointOnPlayer1SecondServeCount = 0;
  var longerPointOnPlayer2SecondServeCount = 0;

  var veryLongPointOnPlayer1FirstServeCount = 0;
  var veryLongPointOnPlayer2FirstServeCount = 0;
  var veryLongPointOnPlayer1SecondServeCount = 0;
  var veryLongPointOnPlayer2SecondServeCount = 0;

  var player1ServeAndWonLongerPointCount = 0;
  var player2ServeAndWonLongerPointCount = 0;
  var player2ReturnAndWonLongerPointCount = 0;
  var player1ReturnAndLostLongerPointCount = 0;
  var player2ReturnAndLostLongerPointCount = 0;
  var player1ServeAndLostLongerPointCount = 0;
  var player2ServeAndLostLongerPointCount = 0;
  var player1ReturnAndWonLongerPointCount = 0;

  var player1WonLongerPointByOpponentUnforcedErrorCount = 0;
  var player2WonLongerPointByOpponentUnforcedErrorCount = 0;
  var player1LostLongerPointByUnforcedErrorCount = 0;
  var player2LostLongerPointByUnforcedErrorCount = 0;
  var player1WonLongerPointByWinnerCount = 0;
  var player2WonLongerPointByWinnerCount = 0;
  var player1LostLongerPointByOpponentWinnerCount = 0;
  var player2LostLongerPointByOpponentWinnerCount = 0;

  var player1WonVeryLongPointByOpponentUnforcedErrorCount = 0;
  var player2WonVeryLongPointByOpponentUnforcedErrorCount = 0;
  var player1LostVeryLongPointByUnforcedErrorCount = 0;
  var player2LostVeryLongPointByUnforcedErrorCount = 0;
  var player1WonVeryLongPointByWinnerCount = 0;
  var player2WonVeryLongPointByWinnerCount = 0;
  var player1LostVeryLongPointByOpponentWinnerCount = 0;
  var player2LostVeryLongPointByOpponentWinnerCount = 0;

  var player1VolleyUnforcedErrorCount = 0;
  var player1OverheadUnforcedErrorCount = 0;
  var player1DropshotUnforcedErrorCount = 0;
  var player1LobUnforcedErrorCount = 0;
  var player1SliceUnforcedErrorCount = 0;
  var player1ForehandSliceUnforcedErrorCount = 0;
  var player1BackhandSliceUnforcedErrorCount = 0;
  var player1PassingShotUnforcedErrorCount = 0;

  var player1ForehandUnforcedErrorCount = 0;
  var player1BackhandUnforcedErrorCount = 0;

  var player2VolleyUnforcedErrorCount = 0;
  var player2OverheadUnforcedErrorCount = 0;
  var player2DropshotUnforcedErrorCount = 0;
  var player2LobUnforcedErrorCount = 0;
  var player2SliceUnforcedErrorCount = 0;
  var player2ForehandSliceUnforcedErrorCount = 0;
  var player2BackhandSliceUnforcedErrorCount = 0;
  var player2PassingShotUnforcedErrorCount = 0;

  var player2ForehandUnforcedErrorCount = 0;
  var player2BackhandUnforcedErrorCount = 0;

  var player1VolleyWinnerCount = 0;
  var player1OverheadWinnerCount = 0;
  var player1DropshotWinnerCount = 0;
  var player1LobWinnerCount = 0;
  var player1SliceWinnerCount = 0;
  var player1ForehandSliceWinnerCount = 0;
  var player1BackhandSliceWinnerCount = 0;
  var player1PassingShotWinnerCount = 0;

  var player1NetPointCount = 0;
  var player2NetPointCount = 0;

  var player1UnreturnableServeCount = 0;
  var player1UnreturnableServeDeuceSideCount = 0;
  var player1UnreturnableServeAdSideCount = 0;

  var player1ForehandWinnerCount = 0;
  var player1BackhandWinnerCount = 0;

  var player2VolleyWinnerCount = 0;
  var player2OverheadWinnerCount = 0;
  var player2DropshotWinnerCount = 0;
  var player2LobWinnerCount = 0;
  var player2SliceWinnerCount = 0;
  var player2ForehandSliceWinnerCount = 0;
  var player2BackhandSliceWinnerCount = 0;
  var player2PassingShotWinnerCount = 0;

  var player2UnreturnableServeCount = 0;
  var player2UnreturnableServeDeuceSideCount = 0;
  var player2UnreturnableServeAdSideCount = 0;

  var player2ForehandWinnerCount = 0;
  var player2BackhandWinnerCount = 0;

  var player1HighPressurePointWonCount = 0;
  var player1HighPressurePointWonByUnforcedErrorCount = 0;
  var player1HighPressurePointWinnerCount = 0;
  var player1HighPressurePointWonOnServeCount = 0;
  var player1HighPressurePointWonOnReturnCount = 0;
  var player1HighPressurePointAceCount = 0;
  var player1HighPressurePointOpponentDoubleFaultCount = 0;
  var player1HighPressurePointWonByUnreturnableServeCount = 0;

  var player1HighPressurePointLostCount = 0;
  var player1HighPressurePointLostByOpponentWinnerCount = 0;
  var player1HighPressurePointLostByUnforcedErrorCount = 0;
  var player1HighPressurePointLostOnServeCount = 0;
  var player1HighPressurePointLostOnReturnCount = 0;
  var player1HighPressurePointDoubleFaultCount = 0;
  var player1HighPressurePointLostByOpponentAceCount = 0;
  var player1HighPressurePointLostByOpponentUnreturnableServeCount = 0;

  var player2HighPressurePointWonCount = 0;
  var player2HighPressurePointWinnerCount = 0;
  var player2HighPressurePointWonByUnforcedErrorCount = 0;
  var player2HighPressurePointWonOnServeCount = 0;
  var player2HighPressurePointWonOnReturnCount = 0;
  var player2HighPressurePointAceCount = 0;
  var player2HighPressurePointOpponentDoubleFaultCount = 0;
  var player2HighPressurePointWonByUnreturnableServeCount = 0;

  var player2HighPressurePointLostCount = 0;
  var player2HighPressurePointLostByOpponentWinnerCount = 0;
  var player2HighPressurePointLostByUnforcedErrorCount = 0;
  var player2HighPressurePointLostOnServeCount = 0;
  var player2HighPressurePointLostOnReturnCount = 0;
  var player2HighPressurePointLostByOpponentAceCount = 0;
  var player2HighPressurePointDoubleFaultCount = 0;
  var player2HighPressurePointLostByOpponentUnreturnableServeCount = 0;

  var player1GamePointDeuceSideFirstServeWideCount = 0;
  var player1GamePointDeuceSideFirstServeBodyCount = 0;
  var player1GamePointDeuceSideFirstServeTCount = 0;
  var player1GamePointAdSideFirstServeWideCount = 0;
  var player1GamePointAdSideFirstServeBodyCount = 0;
  var player1GamePointAdSideFirstServeTCount = 0;

  var player1GamePointDeuceSideSecondServeWideCount = 0;
  var player1GamePointDeuceSideSecondServeBodyCount = 0;
  var player1GamePointDeuceSideSecondServeTCount = 0;
  var player1GamePointAdSideSecondServeWideCount = 0;
  var player1GamePointAdSideSecondServeBodyCount = 0;
  var player1GamePointAdSideSecondServeTCount = 0;

  var player2GamePointDeuceSideFirstServeWideCount = 0;
  var player2GamePointDeuceSideFirstServeBodyCount = 0;
  var player2GamePointDeuceSideFirstServeTCount = 0;
  var player2GamePointAdSideFirstServeWideCount = 0;
  var player2GamePointAdSideFirstServeBodyCount = 0;
  var player2GamePointAdSideFirstServeTCount = 0;

  var player2GamePointDeuceSideSecondServeWideCount = 0;
  var player2GamePointDeuceSideSecondServeBodyCount = 0;
  var player2GamePointDeuceSideSecondServeTCount = 0;
  var player2GamePointAdSideSecondServeWideCount = 0;
  var player2GamePointAdSideSecondServeBodyCount = 0;
  var player2GamePointAdSideSecondServeTCount = 0;

  var player1HighPressurePointServedCount = 0;
  var player1HighPressurePointFirstServeInCount = 0;
  var player1HighPressurePointFirstServeWideCount = 0;
  var player1HighPressurePointFirstServeBodyCount = 0;
  var player1HighPressurePointFirstServeTCount = 0;

  var player1HighPressurePointFirstServeDeuceWideCount = 0;
  var player1HighPressurePointFirstServeDeuceBodyCount = 0;
  var player1HighPressurePointFirstServeDeuceTCount = 0;
  var player1HighPressurePointFirstServeAdWideCount = 0;
  var player1HighPressurePointFirstServeAdBodyCount = 0;
  var player1HighPressurePointFirstServeAdTCount = 0;

  var player1HighPressurePointSecondServeDeuceWideCount = 0;
  var player1HighPressurePointSecondServeDeuceBodyCount = 0;
  var player1HighPressurePointSecondServeDeuceTCount = 0;
  var player1HighPressurePointSecondServeAdWideCount = 0;
  var player1HighPressurePointSecondServeAdBodyCount = 0;
  var player1HighPressurePointSecondServeAdTCount = 0;

  var player2HighPressurePointSecondServeDeuceWideCount = 0;
  var player2HighPressurePointSecondServeDeuceBodyCount = 0;
  var player2HighPressurePointSecondServeDeuceTCount = 0;
  var player2HighPressurePointSecondServeAdWideCount = 0;
  var player2HighPressurePointSecondServeAdBodyCount = 0;
  var player2HighPressurePointSecondServeAdTCount = 0;

  var player2HighPressurePointServedCount = 0;
  var player2HighPressurePointFirstServeInCount = 0;
  var player2HighPressurePointFirstServeWideCount = 0;
  var player2HighPressurePointFirstServeBodyCount = 0;
  var player2HighPressurePointFirstServeTCount = 0;

  var player2HighPressurePointFirstServeDeuceWideCount = 0;
  var player2HighPressurePointFirstServeDeuceBodyCount = 0;
  var player2HighPressurePointFirstServeDeuceTCount = 0;
  var player2HighPressurePointFirstServeAdWideCount = 0;
  var player2HighPressurePointFirstServeAdBodyCount = 0;
  var player2HighPressurePointFirstServeAdTCount = 0;

  var player1GamePointCount = 0;
  var player1GamePointWonCount = 0;
  var player1GamePointLostCount = 0;
  var player1BreakPointCount = 0;
  var player1BreakPointWonCount = 0;
  var player1BreakPointLostCount = 0;

  var player2GamePointCount = 0;
  var player2GamePointWonCount = 0;
  var player2GamePointLostCount = 0;
  var player2BreakPointCount = 0;
  var player2BreakPointWonCount = 0;
  var player2BreakPointLostCount = 0;

  var finishedGameScore = "";
  var currentGameScore = "";

  var newGame = true;
  var newSet = true;
  var gameCount = 0;

  var player1WinnerHistogram = [];
  var player1UnforcedErrorHistogram = [];
  var player1AceHistogram = [];
  var player1DoubleFaultHistogram = [];
  var player1FirstServeFaultHistogram = [];
  var player1HighPressurePointHistogram = [];
  var player1GameAndBreakPointHistogram = [];
  var player1PointsWonHistogram = [];
  var player1PointsLostHistogram = [];

  var player2WinnerHistogram = [];
  var player2UnforcedErrorHistogram = [];
  var player2AceHistogram = [];
  var player2DoubleFaultHistogram = [];
  var player2FirstServeFaultHistogram = [];
  var player2GameAndBreakPointHistogram = [];
  var player2HighPressurePointHistogram = [];
  var player2PointsWonHistogram = [];
  var player2PointsLostHistogram = [];

  if (rows.length > 0) {
    finishedGameScore = rows[0][player1ColumnNumberPoints] + "-" + rows[0][player2ColumnNumberPoints] + ": ";
  }

  for (var i = 0; i < rows.length; i++) {

    if (i > 0) {
      // Identify the start of a new game.

      if ((rows[i][gameScore1PreColumnNumberPoints] != rows[i - 1][gameScore1PreColumnNumberPoints]) ||
        (rows[i][gameScore2PreColumnNumberPoints] != rows[i - 1][gameScore2PreColumnNumberPoints])) {
        newGame = true;
      } else {
        newGame = false;
      }

      // Identify the start of a new set
      if ((rows[i][setScore1PreColumnNumberPoints] != rows[i - 1][setScore1PreColumnNumberPoints]) ||
        (rows[i][setScore2PreColumnNumberPoints] != rows[i - 1][setScore2PreColumnNumberPoints])) {
        newSet = true;
      } else {
        newSet = false;
      }
    }

    // Detect end of set and calculate game scores
    currentGameScore = String(rows[i][gameScore1PostColumnNumberPoints]) + "-" + String(rows[i][gameScore2PostColumnNumberPoints]);
    var player1GameScore = rows[i][gameScore1PostColumnNumberPoints];
    var player2GameScore = rows[i][gameScore2PostColumnNumberPoints];
    var isEndOfSet = false;
    var player1GameScorePre = rows[i][gameScore1PreColumnNumberPoints];
    var player2GameScorePre = rows[i][gameScore2PreColumnNumberPoints];
    // Only fire on the exact point where the game score transitions (the set-clinching point).
    // Without this guard, isEndOfSet would be true for every point in the final game
    // because post-game-score doesn't change mid-game.
    if (player1GameScore != player1GameScorePre || player2GameScore != player2GameScorePre) {
      if ((player1GameScore == 7) || (player2GameScore == 7)) {
        // 7-5 or 7-6
        isEndOfSet = true;
      } else if ((player1GameScore == 6) || (player2GameScore == 6)) {
        if ((player1GameScore + player2GameScore) < 11) {
          // Covers 6-4, 6-3, etc.
          isEndOfSet = true;
        }
      }
    }

    // Count the number games that have been played in this set so far, including the current one.
    gameCount = rows[i][gameScore1PreColumnNumberPoints] + rows[i][gameScore2PreColumnNumberPoints] + 1;

    // Count frequencies for every 4 games
    if (newSet || (newGame && (gameCount % 4) == 1)) {
      player1WinnerHistogram.push(0);
      player1UnforcedErrorHistogram.push(0);
      player1AceHistogram.push(0);
      player1DoubleFaultHistogram.push(0);
      player1FirstServeFaultHistogram.push(0);
      player1HighPressurePointHistogram.push(0);
      player1GameAndBreakPointHistogram.push(0);
      player1PointsWonHistogram.push(0);
      player1PointsLostHistogram.push(0);

      player2WinnerHistogram.push(0);
      player2UnforcedErrorHistogram.push(0);
      player2AceHistogram.push(0);
      player2DoubleFaultHistogram.push(0);
      player2FirstServeFaultHistogram.push(0);
      player2GameAndBreakPointHistogram.push(0);
      player2HighPressurePointHistogram.push(0);
      player2PointsWonHistogram.push(0);
      player2PointsLostHistogram.push(0);
    }

    // Get serve side: 1 is duece side and 2 is ad side
    var serveSide = 0;
    var isTiebreakPoint = (rows[i][tiebreakColumnNumberPoints] == "7-point") || (rows[i][tiebreakColumnNumberPoints] == "10-point");
    if (!isTiebreakPoint) {
      serveSide = getServeSide(rows[i][pointScore1PreColumnNumberPoints],
        rows[i][pointScore2PreColumnNumberPoints], false);
    } else {
      serveSide = getServeSide(rows[i][tiebreakScore1PreColumnNumberPoints],
        rows[i][tiebreakScore2PreColumnNumberPoints], true);
    }

    // Calculate first serve %
    if ((rows[i][firstServeOutcomeColumnNumberPoints] == "in") ||
      (rows[i][firstServeOutcomeColumnNumberPoints] == "ace")) {
      // First serve is in
      if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
        player1FirstServeInCount++;

        if (serveSide == 1) {
          player1FirstServeDeuceSideInCount++;
        } else if (serveSide == 2) {
          player1FirstServeAdSideInCount++;
        }

        if (rows[i][winnerColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
          // Player1 is the server and winner
          player1FirstServeWonCount++;

          if (serveSide == 1) {
            player1FirstServeDeuceSideWonCount++;
          } else if (serveSide == 2) {
            player1FirstServeAdSideWonCount++;
          }

        }
      } else if (rows[i][serverColumnNumberPoints] == rows[i][player2ColumnNumberPoints]) {
        player2FirstServeInCount++;

        if (serveSide == 1) {
          player2FirstServeDeuceSideInCount++;
        } else if (serveSide == 2) {
          player2FirstServeAdSideInCount++;
        }

        if (rows[i][winnerColumnNumberPoints] == rows[i][player2ColumnNumberPoints]) {
          // Player2 is the server and winner
          player2FirstServeWonCount++;

          if (serveSide == 1) {
            player2FirstServeDeuceSideWonCount++;
          } else if (serveSide == 2) {
            player2FirstServeAdSideWonCount++;
          }
        }
      }
    } else {
      // first serve fault
      if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
        // Player1 was serving
        player1SecondServeCount++;

        player1FirstServeFaultHistogram[player1FirstServeFaultHistogram.length - 1]++;

        if (serveSide == 1) {
          player1SecondServeDeuceSideCount++;
        } else if (serveSide == 2) {
          player1SecondServeAdSideCount++;
        }

        if (rows[i][winnerColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
          // Player1 was the server and winner
          player1SecondServeWonCount++;

          if (serveSide == 1) {
            player1SecondServeDeuceSideWonCount++;
          } else if (serveSide == 2) {
            player1SecondServeAdSideWonCount++;
          }
        }

        if (rows[i][firstServeOutcomeColumnNumberPoints] === "net") {
          player1FirstServeNetCount++;

          if (serveSide == 1) {
            player1FirstServeDeuceNetCount++;

            if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
              player1FirstServeDeuceWideNetCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
              player1FirstServeDeuceBodyNetCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
              player1FirstServeDeuceTNetCount++;
            }

          } else if (serveSide == 2) {
            player1FirstServeAdNetCount++;

            if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
              player1FirstServeAdWideNetCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
              player1FirstServeAdBodyNetCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
              player1FirstServeAdTNetCount++;
            }
          }
        } else if (rows[i][firstServeOutcomeColumnNumberPoints] === "out") {
          player1FirstServeOutCount++;

          if (serveSide == 1) {
            player1FirstServeDeuceOutCount++;

            if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
              player1FirstServeDeuceWideOutCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
              player1FirstServeDeuceBodyOutCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
              player1FirstServeDeuceTOutCount++;
            }

          } else if (serveSide == 2) {
            player1FirstServeAdOutCount++;

            if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
              player1FirstServeAdWideOutCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
              player1FirstServeAdBodyOutCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
              player1FirstServeAdTOutCount++;
            }
          }
        }
      } else {
        // Player2 was serving
        player2SecondServeCount++;

        player2FirstServeFaultHistogram[player2FirstServeFaultHistogram.length - 1]++;

        if (serveSide == 1) {
          player2SecondServeDeuceSideCount++;
        } else if (serveSide == 2) {
          player2SecondServeAdSideCount++;
        }

        if (rows[i][winnerColumnNumberPoints] == rows[i][player2ColumnNumberPoints]) {
          // Player1 was the server and winner
          player2SecondServeWonCount++;

          if (serveSide == 1) {
            player2SecondServeDeuceSideWonCount++;
          } else if (serveSide == 2) {
            player2SecondServeAdSideWonCount++;
          }
        }

        if (rows[i][firstServeOutcomeColumnNumberPoints] === "net") {
          player2FirstServeNetCount++;

          if (serveSide == 1) {
            player2FirstServeDeuceNetCount++;

            if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
              player2FirstServeDeuceWideNetCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
              player2FirstServeDeuceBodyNetCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
              player2FirstServeDeuceTNetCount++;
            }

          } else if (serveSide == 2) {
            player2FirstServeAdNetCount++;

            if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
              player2FirstServeAdWideNetCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
              player2FirstServeAdBodyNetCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
              player2FirstServeAdTNetCount++;
            }
          }

        } else if (rows[i][firstServeOutcomeColumnNumberPoints] === "out") {
          player2FirstServeOutCount++;

          if (serveSide == 1) {
            player2FirstServeDeuceOutCount++;

            if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
              player2FirstServeDeuceWideOutCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
              player2FirstServeDeuceBodyOutCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
              player2FirstServeDeuceTOutCount++;
            }

          } else if (serveSide == 2) {
            player2FirstServeAdOutCount++;

            if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
              player2FirstServeAdWideOutCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
              player2FirstServeAdBodyOutCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
              player2FirstServeAdTOutCount++;
            }
          }
        }
      }
    }

    if ((rows[i][firstServeOutcomeColumnNumberPoints] === "ace") ||
      (rows[i][secondServeOutcomeColumnNumberPoints] === "ace")) {
      if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
        player1AceCount++;

        player1AceHistogram[player1AceHistogram.length - 1]++;

        if (serveSide == 1) {
          player1AceDeuceSideCount++;
        } else if (serveSide == 2) {
          player1AceAdSideCount++;
        }

        if (rows[i][firstServeOutcomeColumnNumberPoints] === "ace") {
          if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
            player1AceWideCount++;
          } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
            player1AceBodyCount++;
          } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
            player1AceTCount++;
          }
        } else if (rows[i][secondServeOutcomeColumnNumberPoints] === "ace") {
          if (rows[i][secondServeDirColumnNumberPoints] == "wide") {
            player1AceWideCount++;
          } else if (rows[i][secondServeDirColumnNumberPoints] == "body") {
            player1AceBodyCount++;
          } else if (rows[i][secondServeDirColumnNumberPoints] == "t") {
            player1AceTCount++;
          }
        }
      } else {
        player2AceCount++;

        player2AceHistogram[player2AceHistogram.length - 1]++;

        if (serveSide == 1) {
          player2AceDeuceSideCount++;
        } else if (serveSide == 2) {
          player2AceAdSideCount++;
        }

        if (rows[i][firstServeOutcomeColumnNumberPoints] === "ace") {
          if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
            player2AceWideCount++;
          } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
            player2AceBodyCount++;
          } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
            player2AceTCount++;
          }
        } else if (rows[i][secondServeOutcomeColumnNumberPoints] === "ace") {
          if (rows[i][secondServeDirColumnNumberPoints] == "wide") {
            player2AceWideCount++;
          } else if (rows[i][secondServeDirColumnNumberPoints] == "body") {
            player2AceBodyCount++;
          } else if (rows[i][secondServeDirColumnNumberPoints] == "t") {
            player2AceTCount++;
          }
        }
      }
    }

    if (((rows[i][firstServeOutcomeColumnNumberPoints] == "out") ||
      (rows[i][firstServeOutcomeColumnNumberPoints] == "net")) &&
      ((rows[i][secondServeOutcomeColumnNumberPoints] == "out") ||
        (rows[i][secondServeOutcomeColumnNumberPoints] == "net"))) {
      if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
        player1DoubleFaultCount++;

        player1DoubleFaultHistogram[player1DoubleFaultHistogram.length - 1]++;

        if (serveSide == 1) {
          player1DoubleFaultDeuceSideCount++;
        } else if (serveSide == 2) {
          player1DoubleFaultAdSideCount++;
        }

        if (rows[i][secondServeOutcomeColumnNumberPoints] == "net") {
          player1DoubleFaultNetCount++;
        } else if (rows[i][secondServeOutcomeColumnNumberPoints] == "out") {
          player1DoubleFaultOutCount++;
        }
      } else {
        player2DoubleFaultCount++;

        player2DoubleFaultHistogram[player2DoubleFaultHistogram.length - 1]++;

        if (serveSide == 1) {
          player2DoubleFaultDeuceSideCount++;
        } else if (serveSide == 2) {
          player2DoubleFaultAdSideCount++;
        }

        if (rows[i][secondServeOutcomeColumnNumberPoints] == "net") {
          player2DoubleFaultNetCount++;
        } else if (rows[i][secondServeOutcomeColumnNumberPoints] == "out") {
          player2DoubleFaultOutCount++;
        }
      }
    }

    // Return performance
    if (rows[i][rallyLengthColumnNumberPoints] == 2) {

      var player1Serving = false;
      if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
        player1Serving = true;
      }

      // Return winner or error
      if (rows[i][outcomeTypeColumnNumberPoints] == "winner") {
        // return winner
        if (player1Serving) {
          // Player1 is serving
          player2ReturnWinnerCount++;

          if (serveSide == 1) {
            player2ReturnWinnerDeuceSideCount++;
          } else if (serveSide == 2) {
            player2ReturnWinnerAdSideCount++;
          }
        } else {
          // Player2 is serving
          player1ReturnWinnerCount++;

          if (serveSide == 1) {
            player1ReturnWinnerDeuceSideCount++;
          } else if (serveSide == 2) {
            player1ReturnWinnerAdSideCount++;
          }
        }
      } else if (rows[i][outcomeTypeColumnNumberPoints] == "unforced error") {
        if (player1Serving) {
          player2ReturnUnforcedErrorCount++;

          if (serveSide == 1) {
            player2ReturnUnforcedErrorDeuceSideCount++;
          } else if (serveSide == 2) {
            player2ReturnUnforcedErrorAdSideCount++;
          }
        } else {
          player1ReturnUnforcedErrorCount++;

          if (serveSide == 1) {
            player1ReturnUnforcedErrorDeuceSideCount++;
          } else if (serveSide == 2) {
            player1ReturnUnforcedErrorAdSideCount++;
          }
        }
      }
    }

    if (rows[i][rallyLengthColumnNumberPoints] == 3) {

      var player1Serving = false;
      if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
        player1Serving = true;
      }

      // Return winner or error
      if (rows[i][outcomeTypeColumnNumberPoints] == "forced error") {
        // return that forced the serve to make an error
        if (player1Serving) {
          // Player1 is serving
          player2ReturnWinnerCount++;

          if (serveSide == 1) {
            player2ReturnWinnerDeuceSideCount++;
          } else if (serveSide == 2) {
            player2ReturnWinnerAdSideCount++;
          }

        } else {
          // Player2 is serving
          player1ReturnWinnerCount++;

          if (serveSide == 1) {
            player1ReturnWinnerDeuceSideCount++;
          } else if (serveSide == 2) {
            player1ReturnWinnerAdSideCount++;
          }
        }
      }
    }

    if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
      player1FirstServeCount++;

      if (serveSide == 1) {
        player1DeuceFirstServeCount++;
      } else if (serveSide == 2) {
        player1AdFirstServeCount++;
      }
    } else {
      player2FirstServeCount++;

      if (serveSide == 1) {
        player2DeuceFirstServeCount++;
      } else if (serveSide == 2) {
        player2AdFirstServeCount++;
      }
    }

    if (newGame && (gameCount > 2)) {
      if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
        // Player1 is serving this new game.
        player1FirstServeDeuceSidePattern += ", ";
        player1FirstServeAdSidePattern += ", ";
        player1SecondServeDeuceSidePattern += ", ";
        player1SecondServeAdSidePattern += ", ";
      } else if (rows[i][serverColumnNumberPoints] == rows[i][player2ColumnNumberPoints]) {
        // Player2 is serving this game. 
        player2FirstServeDeuceSidePattern += ", ";
        player2FirstServeAdSidePattern += ", ";
        player2SecondServeDeuceSidePattern += ", ";
        player2SecondServeAdSidePattern += ", ";
      }
    }

    if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
      if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
        player1FirstServeWideCount++;

        if (serveSide == 1) {
          player1FirstServeWideDeuceSideCount++;

          player1FirstServeDeuceSidePattern += "W";
        } else if (serveSide == 2) {
          player1FirstServeWideAdSideCount++;

          player1FirstServeAdSidePattern += "W";
        }

      } else {
        player2FirstServeWideCount++;

        if (serveSide == 1) {
          player2FirstServeWideDeuceSideCount++;

          player2FirstServeDeuceSidePattern += "W";
        } else if (serveSide == 2) {
          player2FirstServeWideAdSideCount++;

          player2FirstServeAdSidePattern += "W";
        }
      }
    } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
      if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
        player1FirstServeBodyCount++;

        if (serveSide == 1) {
          player1FirstServeBodyDeuceSideCount++;

          player1FirstServeDeuceSidePattern += "B";
        } else if (serveSide == 2) {
          player1FirstServeBodyAdSideCount++;

          player1FirstServeAdSidePattern += "B";
        }

      } else {
        player2FirstServeBodyCount++;

        if (serveSide == 1) {
          player2FirstServeBodyDeuceSideCount++;

          player2FirstServeDeuceSidePattern += "B";
        } else if (serveSide == 2) {
          player2FirstServeBodyAdSideCount++;

          player2FirstServeAdSidePattern += "B";
        }

      }
    } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
      if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
        player1FirstServeTCount++;

        if (serveSide == 1) {
          player1FirstServeTDeuceSideCount++;

          player1FirstServeDeuceSidePattern += "T";
        } else if (serveSide == 2) {
          player1FirstServeTAdSideCount++;

          player1FirstServeAdSidePattern += "T";
        }

      } else {
        player2FirstServeTCount++;

        if (serveSide == 1) {
          player2FirstServeTDeuceSideCount++;

          player2FirstServeDeuceSidePattern += "T";
        } else if (serveSide == 2) {
          player2FirstServeTAdSideCount++;

          player2FirstServeAdSidePattern += "T";
        }
      }
    }

    if (rows[i][secondServeDirColumnNumberPoints] == "wide") {
      if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
        player1SecondServeWideCount++;

        if (serveSide == 1) {
          player1SecondServeWideDeuceSideCount++;

          player1SecondServeDeuceSidePattern += "W";
        } else if (serveSide == 2) {
          player1SecondServeWideAdSideCount++;

          player1SecondServeAdSidePattern += "W";
        }

      } else {
        player2SecondServeWideCount++;

        if (serveSide == 1) {
          player2SecondServeWideDeuceSideCount++;

          player2SecondServeDeuceSidePattern += "W";
        } else if (serveSide == 2) {
          player2SecondServeWideAdSideCount++;

          player2SecondServeAdSidePattern += "W";
        }
      }
    } else if (rows[i][secondServeDirColumnNumberPoints] == "body") {
      if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
        player1SecondServeBodyCount++;

        if (serveSide == 1) {
          player1SecondServeBodyDeuceSideCount++;

          player1SecondServeDeuceSidePattern += "B";
        } else if (serveSide == 2) {
          player1SecondServeBodyAdSideCount++;

          player1SecondServeAdSidePattern += "B";
        }

      } else {
        player2SecondServeBodyCount++;

        if (serveSide == 1) {
          player2SecondServeBodyDeuceSideCount++;

          player2SecondServeDeuceSidePattern += "B";
        } else if (serveSide == 2) {
          player2SecondServeBodyAdSideCount++;

          player2SecondServeAdSidePattern += "B";
        }
      }
    } else if (rows[i][secondServeDirColumnNumberPoints] == "t") {
      if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
        player1SecondServeTCount++;

        if (serveSide == 1) {
          player1SecondServeTDeuceSideCount++;

          player1SecondServeDeuceSidePattern += "T";
        } else if (serveSide == 2) {
          player1SecondServeTAdSideCount++;

          player1SecondServeAdSidePattern += "T";
        }
      } else {
        player2SecondServeTCount++;

        if (serveSide == 1) {
          player2SecondServeTDeuceSideCount++;

          player2SecondServeDeuceSidePattern += "T";
        } else if (serveSide == 2) {
          player2SecondServeTAdSideCount++;

          player2SecondServeAdSidePattern += "T";
        }
      }
    }

    // Serve+1 and serve-and-volley
    if (rows[i][serverColumnNumberPoints] == rows[i][winnerColumnNumberPoints]) {
      // Server is winner
      if (((rows[i][rallyLengthColumnNumberPoints] == 3) && (rows[i][outcomeTypeColumnNumberPoints] == "winner")) ||
        ((rows[i][rallyLengthColumnNumberPoints] == 4) && (rows[i][outcomeTypeColumnNumberPoints] == "forced error"))) {
        // The server won the point on the third shot
        if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
          player1ServePlusOneWonCount++;

          if ((rows[i][lastShotTypeColumnNumberPoints] == "volley") || (rows[i][lastShotTypeColumnNumberPoints] == "overhead")) {
            player1ServeAndVolleyWonCount++;
          }
        } else {
          player2ServePlusOneWonCount++;

          if ((rows[i][lastShotTypeColumnNumberPoints] == "volley") || (rows[i][lastShotTypeColumnNumberPoints] == "overhead")) {
            player2ServeAndVolleyWonCount++;
          }
        }
      }
    } else {
      // The server lost the point
      if ((rows[i][rallyLengthColumnNumberPoints] == 3) && (rows[i][outcomeTypeColumnNumberPoints] == "unforced error")) {
        if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
          player1ServePlusOneUnforcedErrorCount++;

          if ((rows[i][lastShotTypeColumnNumberPoints] == "volley") || (rows[i][lastShotTypeColumnNumberPoints] == "overhead")) {
            player1ServeAndVolleyUnforcedErrorCount++;
          }
        } else {
          player2ServePlusOneUnforcedErrorCount++;

          if ((rows[i][lastShotTypeColumnNumberPoints] == "volley") || (rows[i][lastShotTypeColumnNumberPoints] == "overhead")) {
            player2ServeAndVolleyUnforcedErrorCount++;
          }
        }
      }
    }

    // Calculate unforced error count
    if (rows[i][outcomeTypeColumnNumberPoints] === "unforced error") {
      if (rows[i][winnerColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
        // If player 1 is the winner, then it's player2's unforced error. 
        player2UnforcedErrorCount++;

        player2UnforcedErrorHistogram[player2UnforcedErrorHistogram.length - 1]++;

        if (rows[i][outcomeColumnNumberPoints] == "out") {
          player2UnforcedErrorOutCount++;
        } else if (rows[i][outcomeColumnNumberPoints] == "net") {
          player2UnforcedErrorNetCount++;
        }
      } else {
        // If player2 is the winner, then it's player1's unforced error.
        player1UnforcedErrorCount++;

        player1UnforcedErrorHistogram[player1UnforcedErrorHistogram.length - 1]++;

        if (rows[i][outcomeColumnNumberPoints] == "out") {
          player1UnforcedErrorOutCount++;
        } else if (rows[i][outcomeColumnNumberPoints] == "net") {
          player1UnforcedErrorNetCount++;
        }
      }
    }

    if ((rows[i][outcomeTypeColumnNumberPoints] === "forced error") ||
      (rows[i][outcomeTypeColumnNumberPoints] === "winner")) {

      if (rows[i][lastShotTypeColumnNumberPoints] != "serve") {
        // Don't count unreturnable serves as forced errors. 
        // Will count it in a separate variable.
        if (rows[i][winnerColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
          player1WinnerForcedErrorCount++;

          player1WinnerHistogram[player1WinnerHistogram.length - 1]++;

          if (rows[i][outcomeTypeColumnNumberPoints] === "winner") {
            player1WinnerCount++;
          } else if (rows[i][outcomeTypeColumnNumberPoints] === "forced error") {
            player1ForcedErrorCount++;
          }
        } else {
          player2WinnerForcedErrorCount++;

          player2WinnerHistogram[player2WinnerHistogram.length - 1]++;

          if (rows[i][outcomeTypeColumnNumberPoints] === "winner") {
            player2WinnerCount++;
          } else if (rows[i][outcomeTypeColumnNumberPoints] === "forced error") {
            player2ForcedErrorCount++;
          }
        }
      }
    }

    // Calculate points won
    if (rows[i][winnerColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
      player1PointsWonCount++;

      player1PointsWonHistogram[player1PointsWonHistogram.length - 1]++;
      player2PointsLostHistogram[player2PointsLostHistogram.length - 1]++;
    } else {
      player2PointsWonCount++;

      player2PointsWonHistogram[player2PointsWonHistogram.length - 1]++;
      player1PointsLostHistogram[player1PointsLostHistogram.length - 1]++;
    }

    // Calculate how points are won for player1
    if (player1PointsWonCount > 0) {
      // The % of points won by opponent's unforced errors
      player1PointsWonByUnforcedErrorsPct = Math.round(((player2UnforcedErrorCount + player2DoubleFaultCount) / player1PointsWonCount) * 100);

      // The % of points won by winners and opponent's forced errors
      player1PointsWonByWinnersPct = Math.round(((player1WinnerForcedErrorCount + player1AceCount) / player1PointsWonCount) * 100);
    }

    // Do the same for player2
    if (player2PointsWonCount > 0) {
      player2PointsWonByUnforcedErrorsPct = Math.round(((player1UnforcedErrorCount + player1DoubleFaultCount) / player2PointsWonCount) * 100);
      player2PointsWonByWinnersPct = Math.round(((player2WinnerForcedErrorCount + player2AceCount) / player2PointsWonCount) * 100);
    }

    // Calculate rally length
    if (!isNaN(rows[i][rallyLengthColumnNumberPoints])) {

      var rallyLength = rows[i][rallyLengthColumnNumberPoints];

      // for calculating average rally length
      rallyLengthSum += rallyLength;
      pointsWithRallyLength++;

      if (rallyLength > longestRallyLength) {
        longestRallyLength = rallyLength;
      }

      // Determine the server
      var server = 0;
      if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
        // player1 is serving
        server = 1;
      } else if (rows[i][serverColumnNumberPoints] == rows[i][player2ColumnNumberPoints]) {
        server = 2;
      }

      if (rallyLength <= 5) {
        shortPointCount++;

        if (server == 1) {
          // player1 is serving
          shortPointOnPlayer1ServeCount++;

          if (rows[i][firstServeOutcomeColumnNumberPoints] == "in" ||
              rows[i][firstServeOutcomeColumnNumberPoints] == "ace") {
            shortPointOnPlayer1FirstServeCount++;
          } else if (rows[i][secondServeOutcomeColumnNumberPoints] == "in") {
            shortPointOnPlayer1SecondServeCount++;
          }
        } else if (server == 2) {
          shortPointOnPlayer2ServeCount++;

          if (rows[i][firstServeOutcomeColumnNumberPoints] == "in" ||
              rows[i][firstServeOutcomeColumnNumberPoints] == "ace") {
            shortPointOnPlayer2FirstServeCount++;
          } else if (rows[i][secondServeOutcomeColumnNumberPoints] == "in") {
            shortPointOnPlayer2SecondServeCount++;
          }
        }

        if (rows[i][winnerColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
          // Player1 won the point          
          player1ShortPointWonCount++;

          if (server == 1) {
            player1ServeAndWonShortPointCount++;
            player2ReturnAndLostShortPointCount++;
          } else if (server == 2) {
            player2ServeAndLostShortPointCount++;
            player1ReturnAndWonShortPointCount++;
          }

          if (rows[i][outcomeTypeColumnNumberPoints] == "unforced error") {
            player1WonShortPointByOpponentUnforcedErrorCount++;
            player2LostShortPointByUnforcedErrorCount++;
          } else if ((rows[i][outcomeTypeColumnNumberPoints] == "winner") ||
            (rows[i][outcomeTypeColumnNumberPoints] == "forced error")) {
            player1WonShortPointByWinnerCount++;
            player2LostShortPointByOpponentWinnerCount++;
          }

        } else {
          // Player2 won the point
          player2ShortPointWonCount++;

          if (server == 1) {
            player1ServeAndLostShortPointCount++;
            player2ReturnAndWonShortPointCount++;
          } else if (server == 2) {
            player2ServeAndWonShortPointCount++;
            player1ReturnAndLostShortPointCount++;
          }

          if (rows[i][outcomeTypeColumnNumberPoints] == "unforced error") {
            player1LostShortPointByUnforcedErrorCount++;
            player2WonShortPointByOpponentUnforcedErrorCount++;
          } else if ((rows[i][outcomeTypeColumnNumberPoints] == "winner") ||
            (rows[i][outcomeTypeColumnNumberPoints] == "forced error")) {
            player1LostShortPointByOpponentWinnerCount++;
            player2WonShortPointByWinnerCount++;
          }
        }
      } else if (rallyLength <= 9) {
        longerPointCount++;

        if (server == 1) {
          // player1 is serving
          longerPointOnPlayer1ServeCount++;

          if (rows[i][firstServeOutcomeColumnNumberPoints] == "in" ||
              rows[i][firstServeOutcomeColumnNumberPoints] == "ace") {
            longerPointOnPlayer1FirstServeCount++;
          } else if (rows[i][secondServeOutcomeColumnNumberPoints] == "in") {
            longerPointOnPlayer1SecondServeCount++;
          }
        } else if (server == 2) {
          longerPointOnPlayer2ServeCount++;

          if (rows[i][firstServeOutcomeColumnNumberPoints] == "in" ||
              rows[i][firstServeOutcomeColumnNumberPoints] == "ace") {
            longerPointOnPlayer2FirstServeCount++;
          } else if (rows[i][secondServeOutcomeColumnNumberPoints] == "in") {
            longerPointOnPlayer2SecondServeCount++;
          }
        }

        if (rows[i][winnerColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
          // Player1 won this point
          player1LongerPointWonCount++;

          if (server == 1) {
            player1ServeAndWonLongerPointCount++;
            player2ReturnAndLostLongerPointCount++;
          } else if (server == 2) {
            player2ServeAndLostLongerPointCount++;
            player1ReturnAndWonLongerPointCount++;
          }

          if (rows[i][outcomeTypeColumnNumberPoints] == "unforced error") {
            player1WonLongerPointByOpponentUnforcedErrorCount++;
            player2LostLongerPointByUnforcedErrorCount++;
          } else if ((rows[i][outcomeTypeColumnNumberPoints] == "winner") ||
            (rows[i][outcomeTypeColumnNumberPoints] == "forced error")) {
            player1WonLongerPointByWinnerCount++;
            player2LostLongerPointByOpponentWinnerCount++;
          }

        } else {
          // Player2 won this point
          player2LongerPointWonCount++;

          if (server == 1) {
            player1ServeAndLostLongerPointCount++;
            player2ReturnAndWonLongerPointCount++;
          } else if (server == 2) {
            player2ServeAndWonLongerPointCount++;
            player1ReturnAndLostLongerPointCount++;
          }

          if (rows[i][outcomeTypeColumnNumberPoints] == "unforced error") {
            player1LostLongerPointByUnforcedErrorCount++;
            player2WonLongerPointByOpponentUnforcedErrorCount++;
          } else if ((rows[i][outcomeTypeColumnNumberPoints] == "winner") ||
            (rows[i][outcomeTypeColumnNumberPoints] == "forced error")) {
            player1LostLongerPointByOpponentWinnerCount++;
            player2WonLongerPointByWinnerCount++;
          }
        }

      } else {
        veryLongPointCount++;

        if (server == 1) {
          // player1 is serving
          veryLongPointOnPlayer1ServeCount++;

          if (rows[i][firstServeOutcomeColumnNumberPoints] == "in" ||
              rows[i][firstServeOutcomeColumnNumberPoints] == "ace") {
            veryLongPointOnPlayer1FirstServeCount++;
          } else if (rows[i][secondServeOutcomeColumnNumberPoints] == "in") {
            veryLongPointOnPlayer1SecondServeCount++;
          }
        } else if (server == 2) {
          veryLongPointOnPlayer2ServeCount++;

          if (rows[i][firstServeOutcomeColumnNumberPoints] == "in" ||
              rows[i][firstServeOutcomeColumnNumberPoints] == "ace") {
            veryLongPointOnPlayer2FirstServeCount++;
          } else if (rows[i][secondServeOutcomeColumnNumberPoints] == "in") {
            veryLongPointOnPlayer2SecondServeCount++;
          }
        }

        if (rows[i][winnerColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
          // Player1 won this point
          player1VeryLongPointWonCount++;

          if (rows[i][outcomeTypeColumnNumberPoints] == "unforced error") {
            player1WonVeryLongPointByOpponentUnforcedErrorCount++;
            player2LostVeryLongPointByUnforcedErrorCount++;
          } else if ((rows[i][outcomeTypeColumnNumberPoints] == "winner") ||
            (rows[i][outcomeTypeColumnNumberPoints] == "forced error")) {
            player1WonVeryLongPointByWinnerCount++;
            player2LostVeryLongPointByOpponentWinnerCount++;
          }

        } else {
          player2VeryLongPointWonCount++;

          if (rows[i][outcomeTypeColumnNumberPoints] == "unforced error") {
            player1LostVeryLongPointByUnforcedErrorCount++;
            player2WonVeryLongPointByOpponentUnforcedErrorCount++;
          } else if ((rows[i][outcomeTypeColumnNumberPoints] == "winner") ||
            (rows[i][outcomeTypeColumnNumberPoints] == "forced error")) {
            player1LostVeryLongPointByOpponentWinnerCount++;
            player2WonVeryLongPointByWinnerCount++;
          }
        }
      }
    }

    // Count different unforced errors to identify technical weaknesses
    if (rows[i][winnerColumnNumberPoints] == rows[i][player2ColumnNumberPoints]) {
      if (rows[i][outcomeTypeColumnNumberPoints] == "unforced error") {
        // player 1 made an unforced error
        var lastShotType = rows[i][lastShotTypeColumnNumberPoints];
        var lastShotHand = rows[i][lastShotHandColumnNumberPoints];

        if (lastShotType == "volley") {
          player1VolleyUnforcedErrorCount++;
        } else if (lastShotType == "overhead") {
          player1OverheadUnforcedErrorCount++;
        } else if (lastShotType == "dropshot") {
          player1DropshotUnforcedErrorCount++;
        } else if (lastShotType == "lob") {
          player1LobUnforcedErrorCount++;
        } else if (lastShotType == "slice") {
          player1SliceUnforcedErrorCount++;
          if (lastShotHand == "forehand") {
            player1ForehandSliceUnforcedErrorCount++;
          } else if (lastShotHand == "backhand") {
            player1BackhandSliceUnforcedErrorCount++;
          }
        } else if (lastShotType == "passing") {
          player1PassingShotUnforcedErrorCount++;
        } else if (lastShotType == "") {
          if (lastShotHand == "forehand") {
            player1ForehandUnforcedErrorCount++;
          } else if (lastShotHand == "backhand") {
            player1BackhandUnforcedErrorCount++;
          }
        }
      }
    } else {
      if (rows[i][outcomeTypeColumnNumberPoints] == "unforced error") {
        // player 2 made an unforced error
        var lastShotType = rows[i][lastShotTypeColumnNumberPoints];
        var lastShotHand = rows[i][lastShotHandColumnNumberPoints];

        if (lastShotType == "volley") {
          player2VolleyUnforcedErrorCount++;
        } else if (lastShotType == "overhead") {
          player2OverheadUnforcedErrorCount++;
        } else if (lastShotType == "dropshot") {
          player2DropshotUnforcedErrorCount++;
        } else if (lastShotType == "lob") {
          player2LobUnforcedErrorCount++;
        } else if (lastShotType == "slice") {
          player2SliceUnforcedErrorCount++;
          if (lastShotHand == "forehand") {
            player2ForehandSliceUnforcedErrorCount++;
          } else if (lastShotHand == "backhand") {
            player2BackhandSliceUnforcedErrorCount++;
          }
        } else if (lastShotType == "passing") {
          player2PassingShotUnforcedErrorCount++;
        } else if (lastShotType == "") {
          if (lastShotHand == "forehand") {
            player2ForehandUnforcedErrorCount++;
          } else if (lastShotHand == "backhand") {
            player2BackhandUnforcedErrorCount++;
          }
        }
      }
    }

    // Count different winners and opponent forced errors to identify strengths
    if (rows[i][winnerColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
      if ((rows[i][outcomeTypeColumnNumberPoints] === "winner") ||
        (rows[i][outcomeTypeColumnNumberPoints] === "forced error")) {
        // player 1 hit a winner
        var lastShotType = rows[i][lastShotTypeColumnNumberPoints];
        var lastShotHand = rows[i][lastShotHandColumnNumberPoints];

        if (lastShotType == "volley") {
          player1VolleyWinnerCount++;
        } else if (lastShotType == "overhead") {
          player1OverheadWinnerCount++;
        } else if (lastShotType == "dropshot") {
          player1DropshotWinnerCount++;
        } else if (lastShotType == "lob") {
          player1LobWinnerCount++;
        } else if (lastShotType == "slice") {
          player1SliceWinnerCount++;
          if (lastShotHand == "forehand") {
            player1ForehandSliceWinnerCount++;
          } else if (lastShotHand == "backhand") {
            player1BackhandSliceWinnerCount++;
          }
        } else if (lastShotType == "serve") {
          player1UnreturnableServeCount++;

          player1AceHistogram[player1AceHistogram.length - 1]++;

          if (serveSide == 1) {
            player1UnreturnableServeDeuceSideCount++;
          } else if (serveSide == 2) {
            player1UnreturnableServeAdSideCount++;
          }

          if (rows[i][firstServeOutcomeColumnNumberPoints] === "in") {
            // If the unreturnable serve is the first serve
            if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
              player1AceWideCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
              player1AceBodyCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
              player1AceTCount++;
            }
          } else if (rows[i][secondServeOutcomeColumnNumberPoints] === "in") {
            // The unreturnable serve is the second serve
            if (rows[i][secondServeDirColumnNumberPoints] == "wide") {
              player1AceWideCount++;
            } else if (rows[i][secondServeDirColumnNumberPoints] == "body") {
              player1AceBodyCount++;
            } else if (rows[i][secondServeDirColumnNumberPoints] == "t") {
              player1AceTCount++;
            }
          }
        } else if (lastShotType == "passing") {
          player1PassingShotWinnerCount++;
        } else if (lastShotType == "") {
          if (lastShotHand == "forehand") {
            player1ForehandWinnerCount++;
          } else if (lastShotHand == "backhand") {
            player1BackhandWinnerCount++;
          }
        }
      }
    } else {
      if ((rows[i][outcomeTypeColumnNumberPoints] === "winner") ||
        (rows[i][outcomeTypeColumnNumberPoints] === "forced error")) {
        // player 2 hit a winner
        var lastShotType = rows[i][lastShotTypeColumnNumberPoints];
        var lastShotHand = rows[i][lastShotHandColumnNumberPoints];

        if (lastShotType == "volley") {
          player2VolleyWinnerCount++;
        } else if (lastShotType == "overhead") {
          player2OverheadWinnerCount++;
        } else if (lastShotType == "dropshot") {
          player2DropshotWinnerCount++;
        } else if (lastShotType == "lob") {
          player2LobWinnerCount++;
        } else if (lastShotType == "slice") {
          player2SliceWinnerCount++;
          if (lastShotHand == "forehand") {
            player2ForehandSliceWinnerCount++;
          } else if (lastShotHand == "backhand") {
            player2BackhandSliceWinnerCount++;
          }
        } else if (lastShotType == "serve") {
          player2UnreturnableServeCount++;

          player2AceHistogram[player2AceHistogram.length - 1]++;

          if (serveSide == 1) {
            player2UnreturnableServeDeuceSideCount++;
          } else if (serveSide == 2) {
            player2UnreturnableServeAdSideCount++;
          }

          if (rows[i][firstServeOutcomeColumnNumberPoints] === "in") {
            // If the unreturnable serve is the first serve
            if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
              player2AceWideCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
              player2AceBodyCount++;
            } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
              player2AceTCount++;
            }
          } else if (rows[i][secondServeOutcomeColumnNumberPoints] === "in") {
            // The unreturnable serve is the second serve
            if (rows[i][secondServeDirColumnNumberPoints] == "wide") {
              player2AceWideCount++;
            } else if (rows[i][secondServeDirColumnNumberPoints] == "body") {
              player2AceBodyCount++;
            } else if (rows[i][secondServeDirColumnNumberPoints] == "t") {
              player2AceTCount++;
            }
          }

        } else if (lastShotType == "passing") {
          player2PassingShotWinnerCount++;
        } else if (lastShotType == "") {
          if (lastShotHand == "forehand") {
            player2ForehandWinnerCount++;
          } else if (lastShotHand == "backhand") {
            player2BackhandWinnerCount++;
          }
        }
      }
    }

    // High pressure point analysis

    if ((isHighPressurePoint(rows[i]) == 1) || (isHighPressurePoint(rows[i]) == 3)) {
      // High pressure point for player1

      player1HighPressurePointHistogram[player1HighPressurePointHistogram.length - 1]++;

      if (rows[i][winnerColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
        // If player1 wins a high-pressure point
        player1HighPressurePointWonCount++;

        if (rows[i][outcomeTypeColumnNumberPoints] == "unforced error") {
          player1HighPressurePointWonByUnforcedErrorCount++;
        } else if ((rows[i][outcomeTypeColumnNumberPoints] == "forced error") ||
          (rows[i][outcomeTypeColumnNumberPoints] == "winner")) {
          if (rows[i][lastShotTypeColumnNumberPoints] != "serve") {
            player1HighPressurePointWinnerCount++;

            // May add other stats such as won by net points, won by dropshot, etc.
          } else {
            player1HighPressurePointWonByUnreturnableServeCount++;
          }
        }

        if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
          player1HighPressurePointWonOnServeCount++;
          if ((rows[i][firstServeOutcomeColumnNumberPoints] == "ace") ||
            (rows[i][secondServeOutcomeColumnNumberPoints] == "ace")) {
            player1HighPressurePointAceCount++;
          }
        } else {
          // Player1 is not the server
          player1HighPressurePointWonOnReturnCount++;

          if ((rows[i][secondServeOutcomeColumnNumberPoints] == "net") ||
            (rows[i][secondServeOutcomeColumnNumberPoints] == "out")) {
            player1HighPressurePointOpponentDoubleFaultCount++;
          }
        }
      } else {
        // If player2 wins a high-pressure point
        player1HighPressurePointLostCount++;

        if (rows[i][outcomeTypeColumnNumberPoints] == "unforced error") {
          player1HighPressurePointLostByUnforcedErrorCount++;
        } else if ((rows[i][outcomeTypeColumnNumberPoints] == "forced error") ||
          (rows[i][outcomeTypeColumnNumberPoints] == "winner")) {
          if (rows[i][lastShotTypeColumnNumberPoints] != "serve") {
            player1HighPressurePointLostByOpponentWinnerCount++;

            // May add shot types here
          } else {
            player1HighPressurePointLostByOpponentUnreturnableServeCount++;
          }
        }

        if (rows[i][serverColumnNumberPoints] == rows[i][player2ColumnNumberPoints]) {
          // Player2 is serving
          player1HighPressurePointLostOnReturnCount++;

          if ((rows[i][firstServeOutcomeColumnNumberPoints] == "ace") ||
            (rows[i][secondServeOutcomeColumnNumberPoints] == "ace")) {
            player1HighPressurePointLostByOpponentAceCount++;
          }
        } else {
          // Player1 is serving
          player1HighPressurePointLostOnServeCount++;

          if ((rows[i][secondServeOutcomeColumnNumberPoints] == "net") ||
            (rows[i][secondServeOutcomeColumnNumberPoints] == "out")) {
            player1HighPressurePointDoubleFaultCount++;
          }
        }
      }

      if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
        // Player1 served this point
        player1HighPressurePointServedCount++;

        if ((rows[i][firstServeOutcomeColumnNumberPoints] == "in") ||
          (rows[i][firstServeOutcomeColumnNumberPoints] == "ace")) {
          player1HighPressurePointFirstServeInCount++;
        }

        if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
          player1HighPressurePointFirstServeWideCount++;

          if (serveSide == 1) {
            player1HighPressurePointFirstServeDeuceWideCount++;
          } else if (serveSide == 2) {
            player1HighPressurePointFirstServeAdWideCount++;
          }
        } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
          player1HighPressurePointFirstServeBodyCount++;

          if (serveSide == 1) {
            player1HighPressurePointFirstServeDeuceBodyCount++;
          } else if (serveSide == 2) {
            player1HighPressurePointFirstServeAdBodyCount++;
          }
        } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
          player1HighPressurePointFirstServeTCount++;

          if (serveSide == 1) {
            player1HighPressurePointFirstServeDeuceTCount++;
          } else if (serveSide == 2) {
            player1HighPressurePointFirstServeAdTCount++;
          }
        }

        if (rows[i][secondServeDirColumnNumberPoints] == "wide") {
          if (serveSide == 1) {
            player1HighPressurePointSecondServeDeuceWideCount++;
          } else if (serveSide == 2) {
            player1HighPressurePointSecondServeAdWideCount++;
          }
        } else if (rows[i][secondServeDirColumnNumberPoints] == "body") {
          if (serveSide == 1) {
            player1HighPressurePointSecondServeDeuceBodyCount++;
          } else if (serveSide == 2) {
            player1HighPressurePointSecondServeAdBodyCount++;
          }
        } else if (rows[i][secondServeDirColumnNumberPoints] == "t") {
          if (serveSide == 1) {
            player1HighPressurePointSecondServeDeuceTCount++;
          } else if (serveSide == 2) {
            player1HighPressurePointSecondServeAdTCount++;
          }
        }
      }
    }

    if ((isHighPressurePoint(rows[i]) == 2) || (isHighPressurePoint(rows[i]) == 3)) {
      // High pressure point for player2

      player2HighPressurePointHistogram[player2HighPressurePointHistogram.length - 1]++;

      if (rows[i][winnerColumnNumberPoints] == rows[i][player2ColumnNumberPoints]) {
        // If player2 wins a high-pressure point
        player2HighPressurePointWonCount++;

        if (rows[i][outcomeTypeColumnNumberPoints] == "unforced error") {
          player2HighPressurePointWonByUnforcedErrorCount++;
        } else if ((rows[i][outcomeTypeColumnNumberPoints] == "forced error") ||
          (rows[i][outcomeTypeColumnNumberPoints] == "winner")) {
          if (rows[i][lastShotTypeColumnNumberPoints] != "serve") {
            player2HighPressurePointWinnerCount++;

            // May add other stats such as won by net points, won by dropshot, etc.
          } else {
            player2HighPressurePointWonByUnreturnableServeCount++;  //add
          }
        }

        if (rows[i][serverColumnNumberPoints] == rows[i][player2ColumnNumberPoints]) {

          player2HighPressurePointWonOnServeCount++;
          if ((rows[i][firstServeOutcomeColumnNumberPoints] == "ace") ||
            (rows[i][secondServeOutcomeColumnNumberPoints] == "ace")) {
            player2HighPressurePointAceCount++;
          }
        } else {
          // Player1 is serving
          player2HighPressurePointWonOnReturnCount++;

          if ((rows[i][secondServeOutcomeColumnNumberPoints] == "net") ||
            (rows[i][secondServeOutcomeColumnNumberPoints] == "out")) {
            player2HighPressurePointOpponentDoubleFaultCount++;
          }
        }
      } else {
        // If player1 wins a high-pressure point
        player2HighPressurePointLostCount++;

        if (rows[i][outcomeTypeColumnNumberPoints] == "unforced error") {
          player2HighPressurePointLostByUnforcedErrorCount++;
        } else if ((rows[i][outcomeTypeColumnNumberPoints] == "forced error") ||
          (rows[i][outcomeTypeColumnNumberPoints] == "winner")) {
          if (rows[i][lastShotTypeColumnNumberPoints] != "serve") {
            player2HighPressurePointLostByOpponentWinnerCount++;
            // May add other stats such as won by net points, won by dropshot, etc.
          } else {
            player2HighPressurePointLostByOpponentUnreturnableServeCount++;
          }
        }

        if (rows[i][serverColumnNumberPoints] == rows[i][player1ColumnNumberPoints]) {
          // Player1 is serving
          player2HighPressurePointLostOnReturnCount++;

          if ((rows[i][firstServeOutcomeColumnNumberPoints] == "ace") ||
            (rows[i][secondServeOutcomeColumnNumberPoints] == "ace")) {
            player2HighPressurePointLostByOpponentAceCount++;
          }
        } else {
          // Player2 is serving
          player2HighPressurePointLostOnServeCount++;

          if ((rows[i][secondServeOutcomeColumnNumberPoints] == "net") ||
            (rows[i][secondServeOutcomeColumnNumberPoints] == "out")) {
            player2HighPressurePointDoubleFaultCount++;
          }
        }
      }

      if (rows[i][serverColumnNumberPoints] == rows[i][player2ColumnNumberPoints]) {
        // Player2 served this point
        player2HighPressurePointServedCount++;

        if ((rows[i][firstServeOutcomeColumnNumberPoints] == "in") ||
          (rows[i][firstServeOutcomeColumnNumberPoints] == "ace")) {
          player2HighPressurePointFirstServeInCount++;
        }

        if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
          player2HighPressurePointFirstServeWideCount++;

          if (serveSide == 1) {
            player2HighPressurePointFirstServeDeuceWideCount++;
          } else if (serveSide == 2) {
            player2HighPressurePointFirstServeAdWideCount++;
          }
        } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
          player2HighPressurePointFirstServeBodyCount++;

          if (serveSide == 1) {
            player2HighPressurePointFirstServeDeuceBodyCount++;
          } else if (serveSide == 2) {
            player2HighPressurePointFirstServeAdBodyCount++;
          }
        } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
          player2HighPressurePointFirstServeTCount++;

          if (serveSide == 1) {
            player2HighPressurePointFirstServeDeuceTCount++;
          } else if (serveSide == 2) {
            player2HighPressurePointFirstServeAdTCount++;
          }
        }

        if (rows[i][secondServeDirColumnNumberPoints] == "wide") {
          if (serveSide == 1) {
            player2HighPressurePointSecondServeDeuceWideCount++;
          } else if (serveSide == 2) {
            player2HighPressurePointSecondServeAdWideCount++;
          }
        } else if (rows[i][secondServeDirColumnNumberPoints] == "body") {
          if (serveSide == 1) {
            player2HighPressurePointSecondServeDeuceBodyCount++;
          } else if (serveSide == 2) {
            player2HighPressurePointSecondServeAdBodyCount++;
          }
        } else if (rows[i][secondServeDirColumnNumberPoints] == "t") {
          if (serveSide == 1) {
            player2HighPressurePointSecondServeDeuceTCount++;
          } else if (serveSide == 2) {
            player2HighPressurePointSecondServeAdTCount++;
          }
        }
      }
    }

    var gameOrBreakPointStatus = isGameOrBreakPoint(rows[i]);
    var player1WonPoint = (rows[i][winnerColumnNumberPoints] == rows[i][player1ColumnNumberPoints]);

    if ((gameOrBreakPointStatus == 1) || (gameOrBreakPointStatus == 3)) {
      // Player1's game point
      player1GamePointCount++;

      player1GameAndBreakPointHistogram[player1GameAndBreakPointHistogram.length - 1]++;

      if (player1WonPoint) {
        // Player1 has won a game point
        player1GamePointWonCount++;
      } else {
        player1GamePointLostCount++;
      }

      // Count player1's game point serve directions 
      if (serveSide == 1) {
        if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
          player1GamePointDeuceSideFirstServeWideCount++;
        } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
          player1GamePointDeuceSideFirstServeBodyCount++;
        } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
          player1GamePointDeuceSideFirstServeTCount++;
        }

        if (rows[i][secondServeDirColumnNumberPoints] == "wide") {
          player1GamePointDeuceSideSecondServeWideCount++;
        } else if (rows[i][secondServeDirColumnNumberPoints] == "body") {
          player1GamePointDeuceSideSecondServeBodyCount++;
        } else if (rows[i][secondServeDirColumnNumberPoints] == "t") {
          player1GamePointDeuceSideSecondServeTCount++;
        }
      } else if (serveSide == 2) {
        if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
          player1GamePointAdSideFirstServeWideCount++;
        } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
          player1GamePointAdSideFirstServeBodyCount++;
        } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
          player1GamePointAdSideFirstServeTCount++;
        }

        if (rows[i][secondServeDirColumnNumberPoints] == "wide") {
          player1GamePointAdSideSecondServeWideCount++;
        } else if (rows[i][secondServeDirColumnNumberPoints] == "body") {
          player1GamePointAdSideSecondServeBodyCount++;
        } else if (rows[i][secondServeDirColumnNumberPoints] == "t") {
          player1GamePointAdSideSecondServeTCount++;
        }
      }
    }

    if ((gameOrBreakPointStatus == 2) || (gameOrBreakPointStatus == 4)) {
      // Player2's game point
      player2GamePointCount++;

      player2GameAndBreakPointHistogram[player2GameAndBreakPointHistogram.length - 1]++;

      if (player1WonPoint) {
        player2GamePointLostCount++;
      } else {
        // Player2 won the game point
        player2GamePointWonCount++;
      }

      // Count player2's game point serve directions 
      if (serveSide == 1) {
        if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
          player2GamePointDeuceSideFirstServeWideCount++;
        } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
          player2GamePointDeuceSideFirstServeBodyCount++;
        } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
          player2GamePointDeuceSideFirstServeTCount++;
        }

        if (rows[i][secondServeDirColumnNumberPoints] == "wide") {
          player2GamePointDeuceSideSecondServeWideCount++;
        } else if (rows[i][secondServeDirColumnNumberPoints] == "body") {
          player2GamePointDeuceSideSecondServeBodyCount++;
        } else if (rows[i][secondServeDirColumnNumberPoints] == "t") {
          player2GamePointDeuceSideSecondServeTCount++;
        }
      } else if (serveSide == 2) {
        if (rows[i][firstServeDirColumnNumberPoints] == "wide") {
          player2GamePointAdSideFirstServeWideCount++;
        } else if (rows[i][firstServeDirColumnNumberPoints] == "body") {
          player2GamePointAdSideFirstServeBodyCount++;
        } else if (rows[i][firstServeDirColumnNumberPoints] == "t") {
          player2GamePointAdSideFirstServeTCount++;
        }

        if (rows[i][secondServeDirColumnNumberPoints] == "wide") {
          player2GamePointAdSideSecondServeWideCount++;
        } else if (rows[i][secondServeDirColumnNumberPoints] == "body") {
          player2GamePointAdSideSecondServeBodyCount++;
        } else if (rows[i][secondServeDirColumnNumberPoints] == "t") {
          player2GamePointAdSideSecondServeTCount++;
        }
      }
    }

    if ((gameOrBreakPointStatus == -1) || (gameOrBreakPointStatus == 4)) {
      // Player1's break point
      player1BreakPointCount++;

      player1GameAndBreakPointHistogram[player1GameAndBreakPointHistogram.length - 1]++;

      if (player1WonPoint) {
        player1BreakPointWonCount++;
      } else {
        player1BreakPointLostCount++;
      }
    }

    if ((gameOrBreakPointStatus == -2) || (gameOrBreakPointStatus == 3)) {
      // Player2's break point
      player2BreakPointCount++;

      player2GameAndBreakPointHistogram[player2GameAndBreakPointHistogram.length - 1]++;

      if (player1WonPoint) {
        player2BreakPointLostCount++;
      } else {
        player2BreakPointWonCount++;
      }
    }

    if (isEndOfSet) {

      // Mark the end of a set in histograms
      player1WinnerHistogram.push("set");
      player1UnforcedErrorHistogram.push("set");
      player1AceHistogram.push("set");
      player1DoubleFaultHistogram.push("set");
      player1FirstServeFaultHistogram.push("set");
      player1HighPressurePointHistogram.push("set");
      player1GameAndBreakPointHistogram.push("set");
      player1PointsWonHistogram.push("set");
      player1PointsLostHistogram.push("set");

      player2WinnerHistogram.push("set");
      player2UnforcedErrorHistogram.push("set");
      player2AceHistogram.push("set");
      player2DoubleFaultHistogram.push("set");
      player2FirstServeFaultHistogram.push("set");
      player2GameAndBreakPointHistogram.push("set");
      player2HighPressurePointHistogram.push("set");
      player2PointsWonHistogram.push("set");
      player2PointsLostHistogram.push("set");

      // Mark the end of a set in serve sequence patterns
      player1FirstServeDeuceSidePattern += ", set, ";
      player1FirstServeAdSidePattern += ", set, ";
      player1SecondServeDeuceSidePattern += ", set, ";
      player1SecondServeAdSidePattern += ", set, ";
      player2FirstServeDeuceSidePattern += ", set, ";
      player2FirstServeAdSidePattern += ", set, ";
      player2SecondServeDeuceSidePattern += ", set, ";
      player2SecondServeAdSidePattern += ", set, ";
    }

    if (isEndOfSet) {
      finishedGameScore += currentGameScore + "  ";
      currentGameScore = "";
    }
  }

  //***************************** */
  // Fill the "analyses" sheet with data
  var sheet = spreadsheet.getSheetByName("analyses");
  var range = sheet.getDataRange();
  var values = range.getValues();

  var matchIndexColumnNumberAnalysis = getColumnNumber("match index", "analyses");
  var player1ColumnNumberAnalysis = getColumnNumber("player1", "analyses");
  var player2ColumnNumberAnalysis = getColumnNumber("player2", "analyses");

  var player1FirstServePctColumnNumberAnalysis = getColumnNumber("first_srv_pct1", "analyses");
  var player2FirstServePctColumnNumberAnalysis = getColumnNumber("first_srv_pct2", "analyses");

  var player1ServeDirectionColumnNumberAnalysis = getColumnNumber("first_srv_dir_count1", "analyses");
  var player2ServeDirectionColumnNumberAnalysis = getColumnNumber("first_srv_dir_count2", "analyses");

  var player1GamePointServeDirectionColumnAnalysis = getColumnNumber("game_point_srv_dir1", "analyses");
  var player2GamePointServeDirectionColumnAnalysis = getColumnNumber("game_point_srv_dir2", "analyses");

  var player1ServePatternColumnNumberAnalysis = getColumnNumber("serve_pattern1", "analyses");
  var player2ServePatternColumnNumberAnalysis = getColumnNumber("serve_pattern2", "analyses");

  var player1FirstServeWonPctColumnNumberAnalysis = getColumnNumber("first_srv_won_pct1", "analyses");
  var player2FirstServeWonPctColumnNumberAnalysis = getColumnNumber("first_srv_won_pct2", "analyses");

  var player1AceCountColumnNumberAnalysis = getColumnNumber("ace_count1", "analyses");
  var player2AceCountColumnNumberAnalysis = getColumnNumber("ace_count2", "analyses");

  var player1DoubleFaultColumnNumberAnalysis = getColumnNumber("double_fault1", "analyses");
  var player2DoubleFaultColumnNumberAnalysis = getColumnNumber("double_fault2", "analyses");

  var player1ServePlusOneColumnNumberAnalysis = getColumnNumber("serve_plus_one1", "analyses");
  var player2ServePlusOneColumnNumberAnalysis = getColumnNumber("serve_plus_one2", "analyses");

  var player1ReturnColumnNumberAnalysis = getColumnNumber("return1", "analyses");
  var player2ReturnColumnNumberAnalysis = getColumnNumber("return2", "analyses");

  var player1PointsWonCountColumnNumberAnalysis = getColumnNumber("points_won1", "analyses");
  var player2PointsWonCountColumnNumberAnalysis = getColumnNumber("points_won2", "analyses");

  var player1PointsLostCountColumnNumberAnalysis = getColumnNumber("points_lost1", "analyses");
  var player2PointsLostCountColumnNumberAnalysis = getColumnNumber("points_lost2", "analyses");

  var player1UnforcedErrorClassificationColumnNumberAnalysis = getColumnNumber("unforced_error_classification1", "analyses");
  var player2UnforcedErrorClassificationColumnNumberAnalysis = getColumnNumber("unforced_error_classification2", "analyses");

  var player1WinnerClassificationColumnNumberAnalysis = getColumnNumber("winner_classification1", "analyses");
  var player2WinnerClassificationColumnNumberAnalysis = getColumnNumber("winner_classification2", "analyses");

  var averageRallyLengthColumnNumberAnalysis = getColumnNumber("avg_rally_length", "analyses");
  var player1ShortPointAnalysisColumnNumberAnalysis = getColumnNumber("short_point_analysis1", "analyses");
  var player2ShortPointAnalysisColumnNumberAnalysis = getColumnNumber("short_point_analysis2", "analyses");
  var player1LongerPointAnalysisColumnNumberAnalysis = getColumnNumber("longer_point_analysis1", "analyses");
  var player2LongerPointAnalysisColumnNumberAnalysis = getColumnNumber("longer_point_analysis2", "analyses");
  var player1VeryLongPointAnalysisColumnNumberAnalysis = getColumnNumber("very_long_point_analysis1", "analyses");
  var player2VeryLongPointAnalysisColumnNumberAnalysis = getColumnNumber("very_long_point_analysis2", "analyses");

  var netPointColumnNumberAnalysis = getColumnNumber("net_point", "analyses");

  var player1GameBreakPointColumnNumberAnalysis = getColumnNumber("game_break_point1", "analyses");
  var player2GameBreakPointColumnNumberAnalysis = getColumnNumber("game_break_point2", "analyses");

  var player1HighPressurePointWonColumnNumberAnalysis = getColumnNumber("high_pressure_point_won1", "analyses");
  var player1HighPressurePointLostColumnNumberAnalysis = getColumnNumber("high_pressure_point_lost1", "analyses");
  var player2HighPressurePointWonColumnNumberAnalysis = getColumnNumber("high_pressure_point_won2", "analyses");
  var player2HighPressurePointLostColumnNumberAnalysis = getColumnNumber("high_pressure_point_lost2", "analyses");

  var player1HighPressurePointServeColumnNumberAnalysis = getColumnNumber("high_pressure_point_serve1", "analyses");
  var player2HighPressurePointServeColumnNumberAnalysis = getColumnNumber("high_pressure_point_serve2", "analyses");

  var player1ServeHistogramColumnNumberAnalysis = getColumnNumber("serve_histogram1", "analyses");
  var player2ServeHistogramColumnNumberAnalysis = getColumnNumber("serve_histogram2", "analyses");

  var player1PerformanceHistogramColumnNumberAnalysis = getColumnNumber("performance_histogram1", "analyses");
  var player2PerformanceHistogramColumnNumberAnalysis = getColumnNumber("performance_histogram2", "analyses");

  var player1GameBreakPointHistogramColumnNumberAnalysis = getColumnNumber("game_break_point_histogram1", "analyses");
  var player2GameBreakPointHistogramColumnNumberAnalysis = getColumnNumber("game_break_point_histogram2", "analyses");

  var scoreColumnNumberAnalysis = getColumnNumber("score", "analyses");

  for (var i = 0; i < values.length; i++) {
    if (values[i][matchIndexColumnNumberAnalysis] == matchIndex) {

      var player1 = values[i][player1ColumnNumberAnalysis];
      var player2 = values[i][player2ColumnNumberAnalysis];

      // Fill in first serve %
      var player1FirstServePct = 0;
      if (player1FirstServeCount > 0) {
        player1FirstServePct = Math.round((player1FirstServeInCount / player1FirstServeCount) * 100);
      }

      var player1DeuceFirstServePct = 0;
      if (player1DeuceFirstServeCount > 0) {
        player1DeuceFirstServePct = Math.round((player1FirstServeDeuceSideInCount / player1DeuceFirstServeCount) * 100);
      }

      var player1AdFirstServePct = 0;
      if (player1AdFirstServeCount > 0) {
        player1AdFirstServePct = Math.round((player1FirstServeAdSideInCount / player1AdFirstServeCount) * 100);
      }

      var player1FirstServePctString = `${player1}: first serve percentage(${player1FirstServePct} percent), deuce side(${player1DeuceFirstServePct} percent), ad side(${player1AdFirstServePct} percent), deuce side serve to net(${player1FirstServeDeuceNetCount}, wide ${player1FirstServeDeuceWideNetCount}, body ${player1FirstServeDeuceBodyNetCount}, T ${player1FirstServeDeuceTNetCount}), ad side serve to net(${player1FirstServeAdNetCount}, wide ${player1FirstServeAdWideNetCount}, body ${player1FirstServeAdBodyNetCount}, T ${player1FirstServeAdTNetCount}), deuce side serve out(${player1FirstServeDeuceOutCount}, wide ${player1FirstServeDeuceWideOutCount}, body ${player1FirstServeDeuceBodyOutCount}, T ${player1FirstServeDeuceTOutCount}), ad side serve out(${player1FirstServeAdOutCount}, wide ${player1FirstServeAdWideOutCount}, body ${player1FirstServeAdBodyOutCount}, T ${player1FirstServeAdTOutCount})`;

      fillCell(sheet, i, player1FirstServePctColumnNumberAnalysis, player1FirstServePctString);

      var player2FirstServePct = 0;
      if (player2FirstServeCount > 0) {
        player2FirstServePct = Math.round((player2FirstServeInCount / player2FirstServeCount) * 100);
      }

      var player2DeuceFirstServePct = 0;
      if (player2DeuceFirstServeCount > 0) {
        player2DeuceFirstServePct = Math.round((player2FirstServeDeuceSideInCount / player2DeuceFirstServeCount) * 100);
      }

      var player2AdFirstServePct = 0;
      if (player2AdFirstServeCount > 0) {
        player2AdFirstServePct = Math.round((player2FirstServeAdSideInCount / player2AdFirstServeCount) * 100);
      }

      var player2FirstServePctString = `${player2}: first serve percentage(${player2FirstServePct} percent), deuce side(${player2DeuceFirstServePct} percent), ad side(${player2AdFirstServePct} percent), deuce side serve to net(${player2FirstServeDeuceNetCount}, wide ${player2FirstServeDeuceWideNetCount}, body ${player2FirstServeDeuceBodyNetCount}, T ${player2FirstServeDeuceTNetCount}), ad side serve to net(${player2FirstServeAdNetCount}, wide ${player2FirstServeAdWideNetCount}, body ${player2FirstServeAdBodyNetCount}, T ${player2FirstServeAdTNetCount}), deuce side serve out(${player2FirstServeDeuceOutCount}, wide ${player2FirstServeDeuceWideOutCount}, body ${player2FirstServeDeuceBodyOutCount}, T ${player2FirstServeDeuceTOutCount}), ad side serve out(${player2FirstServeAdOutCount}, wide ${player2FirstServeAdWideOutCount}, body ${player2FirstServeAdBodyOutCount}, T ${player2FirstServeAdTOutCount})`;

      fillCell(sheet, i, player2FirstServePctColumnNumberAnalysis, player2FirstServePctString);

      var player1AceCountString = `${player1}: ace(${player1AceCount}), unreturnable serve(${player1UnreturnableServeCount}), deuce side ace(${player1AceDeuceSideCount}), deuce side unreturnable serve(${player1UnreturnableServeDeuceSideCount}), ad side ace(${player1AceAdSideCount}), ad side unreturnable serve(${player1UnreturnableServeAdSideCount})`;

      fillCell(sheet, i, player1AceCountColumnNumberAnalysis, player1AceCountString);

      var player2AceCountString = `${player2}: ace(${player2AceCount}), unreturnable serve(${player2UnreturnableServeCount}), deuce side ace(${player2AceDeuceSideCount}), deuce side unreturnable serve(${player2UnreturnableServeDeuceSideCount}) ad side ace(${player2AceAdSideCount}), ad side unreturnable serve(${player2UnreturnableServeAdSideCount})`;

      fillCell(sheet, i, player2AceCountColumnNumberAnalysis, player2AceCountString);

      var player1DoubleFaultString = `${player1} double fault(${player1DoubleFaultCount}), deuce side double fault(${player1DoubleFaultDeuceSideCount}), ad side double fault(${player1DoubleFaultAdSideCount}), double fault net(${player1DoubleFaultNetCount}), double fault out(${player1DoubleFaultOutCount})`;

      fillCell(sheet, i, player1DoubleFaultColumnNumberAnalysis, player1DoubleFaultString);

      var player2DoubleFaultString = `${player2} double fault(${player2DoubleFaultCount}), deuce side double fault(${player2DoubleFaultDeuceSideCount}), ad side double fault(${player2DoubleFaultAdSideCount}), double fault net(${player2DoubleFaultNetCount}), double fault out(${player2DoubleFaultOutCount})`;

      fillCell(sheet, i, player2DoubleFaultColumnNumberAnalysis, player2DoubleFaultString);

      // Calculate and fill in first serve won %
      var player1FirstServeWonPct = 0;
      if (player1FirstServeInCount > 0) {
        player1FirstServeWonPct = Math.round((player1FirstServeWonCount / player1FirstServeInCount) * 100);
      }

      var player2FirstServeWonPct = 0;
      if (player2FirstServeInCount > 0) {
        player2FirstServeWonPct = Math.round((player2FirstServeWonCount / player2FirstServeInCount) * 100);
      }

      var player1FirstServeWonDeucePct = 0;
      if (player1FirstServeDeuceSideInCount > 0) {
        player1FirstServeWonDeucePct = Math.round((player1FirstServeDeuceSideWonCount / player1FirstServeDeuceSideInCount) * 100);
      }

      var player1FirstServeWonAdPct = 0;
      if (player1FirstServeAdSideInCount > 0) {
        player1FirstServeWonAdPct = Math.round((player1FirstServeAdSideWonCount / player1FirstServeAdSideInCount) * 100);
      }

      var player2FirstServeWonDeucePct = 0;
      if (player2FirstServeDeuceSideInCount > 0) {
        player2FirstServeWonDeucePct = Math.round((player2FirstServeDeuceSideWonCount / player2FirstServeDeuceSideInCount) * 100);
      }

      var player2FirstServeWonAdPct = 0;
      if (player2FirstServeAdSideInCount > 0) {
        player2FirstServeWonAdPct = Math.round((player2FirstServeAdSideWonCount / player2FirstServeAdSideInCount) * 100);
      }

      var player1SecondServeWonPct = 0;
      if (player1SecondServeCount > 0) {
        player1SecondServeWonPct = Math.round((player1SecondServeWonCount / player1SecondServeCount) * 100);
      }

      var player2SecondServeWonPct = 0;
      if (player2SecondServeCount > 0) {
        player2SecondServeWonPct = Math.round((player2SecondServeWonCount / player2SecondServeCount) * 100);
      }

      var player1SecondServeWonDeucePct = 0;
      if (player1SecondServeDeuceSideCount > 0) {
        player1SecondServeWonDeucePct = Math.round((player1SecondServeDeuceSideWonCount / player1SecondServeDeuceSideCount) * 100);
      }

      var player2SecondServeWonDeucePct = 0;
      if (player2SecondServeDeuceSideCount > 0) {
        player2SecondServeWonDeucePct = Math.round((player2SecondServeDeuceSideWonCount / player2SecondServeDeuceSideCount) * 100);
      }

      var player1SecondServeWonAdPct = 0;
      if (player1SecondServeAdSideCount > 0) {
        player1SecondServeWonAdPct = Math.round((player1SecondServeAdSideWonCount / player1SecondServeAdSideCount) * 100);
      }

      var player2SecondServeWonAdPct = 0;
      if (player2SecondServeAdSideCount > 0) {
        player2SecondServeWonAdPct = Math.round((player2SecondServeAdSideWonCount / player2SecondServeAdSideCount) * 100);
      }

      var player1ServeWonPctString = `${player1}: first serve won percentage(${player1FirstServeWonPct} percent), deuce side first serve won percentage(${player1FirstServeWonDeucePct} percent), ad side first serve won percentage(${player1FirstServeWonAdPct} percent), second serve won percentage(${player1SecondServeWonPct} percent), deuce side second serve won percentage(${player1SecondServeWonDeucePct}), ad side second serve won percentage(${player1SecondServeWonAdPct})`;

      fillCell(sheet, i, player1FirstServeWonPctColumnNumberAnalysis, player1ServeWonPctString);

      var player2ServeWonPctString = `${player2}: first serve won percentage(${player2FirstServeWonPct} percent), deuce side first serve won percentage(${player2FirstServeWonDeucePct} percent), ad side first serve won percentage(${player2FirstServeWonAdPct} percent), second serve won percentage(${player2SecondServeWonPct} percent), deuce side second serve won percentage(${player2SecondServeWonDeucePct}), ad side second serve won percentage(${player2SecondServeWonAdPct})`;

      fillCell(sheet, i, player2FirstServeWonPctColumnNumberAnalysis, player2ServeWonPctString);

      var player1ServePlusOneString = `${player1}: serve-plus-one winner(${player1ServePlusOneWonCount}), serve-and-volley winner(${player1ServeAndVolleyWonCount}), serve-plus-one unforced error(${player1ServePlusOneUnforcedErrorCount}), serve-and-volley unforced error(${player1ServeAndVolleyUnforcedErrorCount})`;

      fillCell(sheet, i, player1ServePlusOneColumnNumberAnalysis, player1ServePlusOneString);

      var player2ServePlusOneString = `${player2}: serve-plus-one winner(${player2ServePlusOneWonCount}), serve-and-volley winner(${player2ServeAndVolleyWonCount}), serve-plus-one unforced error(${player2ServePlusOneUnforcedErrorCount}), serve-and-volley unforced error(${player2ServeAndVolleyUnforcedErrorCount})`;

      fillCell(sheet, i, player2ServePlusOneColumnNumberAnalysis, player2ServePlusOneString);

      // Return
      var player1ReturnString = `${player1}: return winner and forced error(${player1ReturnWinnerCount}), return unforced error(${player1ReturnUnforcedErrorCount}), deuce side return winner and forced error(${player1ReturnWinnerDeuceSideCount}), ad side return winner and forced error(${player1ReturnWinnerAdSideCount}), deuce side return unforced error(${player1ReturnUnforcedErrorDeuceSideCount}), ad side return unforced error(${player1ReturnUnforcedErrorAdSideCount})`;

      fillCell(sheet, i, player1ReturnColumnNumberAnalysis, player1ReturnString);

      var player2ReturnString = `${player2}: return winner and forced error(${player2ReturnWinnerCount}), return unforced error(${player2ReturnUnforcedErrorCount}), deuce side return winner and forced error(${player2ReturnWinnerDeuceSideCount}), ad side return winner and forced error(${player2ReturnWinnerAdSideCount}), deuce side return unforced error(${player2ReturnUnforcedErrorDeuceSideCount}), ad side return unforced error(${player2ReturnUnforcedErrorAdSideCount})`;

      fillCell(sheet, i, player2ReturnColumnNumberAnalysis, player2ReturnString);

      // Fill points won counts and classification

      var pointsWonString = `${player1}: total points won(${player1PointsWonCount}), won by winner and opponent forced error(${player1WinnerForcedErrorCount}, or ${player1PointsWonByWinnersPct} percent), won by opponent unforced error(${player2UnforcedErrorCount}, or ${player1PointsWonByUnforcedErrorsPct} percent), won by ace(${player1AceCount}), won by unreturnable serve(${player1UnreturnableServeCount})`;

      fillCell(sheet, i, player1PointsWonCountColumnNumberAnalysis, pointsWonString);

      var pointsLostString = `${player1}: total points lost(${player2PointsWonCount}), lost by opponent winner and forced error(${player2WinnerForcedErrorCount}, or ${player2PointsWonByWinnersPct} percent), lost by unforced error(${player1UnforcedErrorCount}, or ${player2PointsWonByUnforcedErrorsPct} percent), lost by double fault (${player1DoubleFaultCount})`

      fillCell(sheet, i, player1PointsLostCountColumnNumberAnalysis, pointsLostString);

      pointsWonString = `${player2}: total points won(${player2PointsWonCount}), won by winner and opponent forced error(${player2WinnerForcedErrorCount}, or ${player2PointsWonByWinnersPct} percent), won by opponent unforced error(${player1UnforcedErrorCount}, or ${player2PointsWonByUnforcedErrorsPct} percent), won by ace(${player2AceCount}), won by unreturnabble serve(${player2UnreturnableServeCount})`;

      fillCell(sheet, i, player2PointsWonCountColumnNumberAnalysis, pointsWonString);

      pointsLostString = `${player2}: total points lost(${player1PointsWonCount}), lost by opponent winner and forced error(${player1WinnerForcedErrorCount}, or ${player1PointsWonByWinnersPct} percent), lost by unforced error(${player2UnforcedErrorCount}, or ${player1PointsWonByUnforcedErrorsPct} percent), lost by double fault (${player2DoubleFaultCount})`

      fillCell(sheet, i, player2PointsLostCountColumnNumberAnalysis, pointsLostString);

      var averageRallyLength = 0;
      if (pointsWithRallyLength > 0) {
        averageRallyLength = Math.round(rallyLengthSum / pointsWithRallyLength);
      }

      var rallyString = `average rally length(${averageRallyLength}), longest rally length(${longestRallyLength}), 1-to-5 shot point(${shortPointCount}, ${player1ShortPointWonCount} won by ${player1}, ${player2ShortPointWonCount} won by ${player2}), 6-to-9 shot point(${longerPointCount}, ${player1LongerPointWonCount} won by ${player1}, ${player2LongerPointWonCount} won by ${player2}), 10+ shot point(${veryLongPointCount}, ${player1VeryLongPointWonCount} won by ${player1}, ${player2VeryLongPointWonCount} won by ${player2})`;

      fillCell(sheet, i, averageRallyLengthColumnNumberAnalysis, rallyString);

      var shortPointAnalysisString = `${player1}: short points (1-5 shots) played on serve(${shortPointOnPlayer1ServeCount}, won ${player1ServeAndWonShortPointCount}, lost ${player1ServeAndLostShortPointCount}, on first serve ${shortPointOnPlayer1FirstServeCount}, on second serve ${shortPointOnPlayer1SecondServeCount}), short points played on return(${shortPointOnPlayer2ServeCount}, won ${player1ReturnAndWonShortPointCount}, lost ${player1ReturnAndLostShortPointCount}), won by winner and opponent forced error(${player1WonShortPointByWinnerCount}), won by opponent unforced error(${player1WonShortPointByOpponentUnforcedErrorCount}), lost by unforced error(${player1LostShortPointByUnforcedErrorCount}), lost by opponent winner and force error(${player1LostShortPointByOpponentWinnerCount})`;

      fillCell(sheet, i, player1ShortPointAnalysisColumnNumberAnalysis, shortPointAnalysisString);

      shortPointAnalysisString = `${player2}: short points (1-5 shots) played on serve(${shortPointOnPlayer2ServeCount}, won ${player2ServeAndWonShortPointCount}, lost ${player2ServeAndLostShortPointCount}, on first serve ${shortPointOnPlayer2FirstServeCount}, on second serve ${shortPointOnPlayer2SecondServeCount}), short points played on return(${shortPointOnPlayer1ServeCount}, won ${player2ReturnAndWonShortPointCount}, lost ${player2ReturnAndLostShortPointCount}), won by winner and opponent forced error(${player2WonShortPointByWinnerCount}), won by opponent unforced error(${player2WonShortPointByOpponentUnforcedErrorCount}), lost by unforced error(${player2LostShortPointByUnforcedErrorCount}), lost by opponent winner and force error(${player2LostShortPointByOpponentWinnerCount})`;

      fillCell(sheet, i, player2ShortPointAnalysisColumnNumberAnalysis, shortPointAnalysisString);

      var longerPointAnalysisString = `${player1}: medium-length points (6-9 shots) played on serve(${longerPointOnPlayer1ServeCount}, won ${player1ServeAndWonLongerPointCount}, lost ${player1ServeAndLostLongerPointCount}, on first serve ${longerPointOnPlayer1FirstServeCount}, on second serve ${longerPointOnPlayer1SecondServeCount}), longer points played on return(${longerPointOnPlayer2ServeCount}, won ${player1ReturnAndWonLongerPointCount}, lost ${player1ReturnAndLostLongerPointCount}), won by winner and opponent forced error(${player1WonLongerPointByWinnerCount}), won by opponent unforced error(${player1WonLongerPointByOpponentUnforcedErrorCount}), lost by unforced error(${player1LostLongerPointByUnforcedErrorCount}), lost by opponent winner and force error(${player1LostLongerPointByOpponentWinnerCount})`;

      fillCell(sheet, i, player1LongerPointAnalysisColumnNumberAnalysis, longerPointAnalysisString);

      longerPointAnalysisString = `${player2}: medium-length points (6-9 shots) played on serve(${longerPointOnPlayer2ServeCount}, won ${player2ServeAndWonLongerPointCount}, lost ${player2ServeAndLostLongerPointCount}, on first serve ${longerPointOnPlayer2FirstServeCount}, on second serve ${longerPointOnPlayer2SecondServeCount}), longer points played on return(${longerPointOnPlayer1ServeCount}, won ${player2ReturnAndWonLongerPointCount}, lost ${player2ReturnAndLostLongerPointCount}), won by winner and opponent forced error(${player2WonLongerPointByWinnerCount}), won by opponent unforced error(${player2WonLongerPointByOpponentUnforcedErrorCount}), lost by unforced error(${player2LostLongerPointByUnforcedErrorCount}), lost by opponent winner and force error(${player2LostLongerPointByOpponentWinnerCount})`;

      fillCell(sheet, i, player2LongerPointAnalysisColumnNumberAnalysis, longerPointAnalysisString);

      var veryLongPointAnalysisString = `${player1}: long points (10+ shots) played on serve(${veryLongPointOnPlayer1ServeCount}, on first serve ${veryLongPointOnPlayer1FirstServeCount}, on second serve ${veryLongPointOnPlayer1SecondServeCount}), long points played on return(${veryLongPointOnPlayer2ServeCount}), won by winner and opponent forced error(${player1WonVeryLongPointByWinnerCount}), won by opponent unforced error(${player1WonVeryLongPointByOpponentUnforcedErrorCount}), lost by unforced error(${player1LostVeryLongPointByUnforcedErrorCount}), lost by opponent winner and force error(${player1LostVeryLongPointByOpponentWinnerCount})`;

      fillCell(sheet, i, player1VeryLongPointAnalysisColumnNumberAnalysis, veryLongPointAnalysisString);

      veryLongPointAnalysisString = `${player2}: long points (10+ shots) played on serve(${veryLongPointOnPlayer2ServeCount}, on first serve ${veryLongPointOnPlayer2FirstServeCount}, on second serve ${veryLongPointOnPlayer2SecondServeCount}), long points played on return(${veryLongPointOnPlayer1ServeCount}), won by winner and opponent forced error(${player2WonVeryLongPointByWinnerCount}), won by opponent unforced error(${player2WonVeryLongPointByOpponentUnforcedErrorCount}), lost by unforced error(${player2LostVeryLongPointByUnforcedErrorCount}), lost by opponent winner and force error(${player2LostVeryLongPointByOpponentWinnerCount})`;

      fillCell(sheet, i, player2VeryLongPointAnalysisColumnNumberAnalysis, veryLongPointAnalysisString);

      // Fill first serve direction counts
      var player1ServeDirectionString = `${player1}: first serve direction(wide ${player1FirstServeWideCount}, body ${player1FirstServeBodyCount}, T ${player1FirstServeTCount}), deuce side first serve(wide ${player1FirstServeWideDeuceSideCount}, body ${player1FirstServeBodyDeuceSideCount}, T ${player1FirstServeTDeuceSideCount}), ad side first serve(wide ${player1FirstServeWideAdSideCount}, body ${player1FirstServeBodyAdSideCount}, T ${player1FirstServeTAdSideCount}), second serve direction(wide ${player1SecondServeWideCount}, body ${player1SecondServeBodyCount}, T ${player1SecondServeTCount}), deuce side second serve(wide ${player1SecondServeWideDeuceSideCount}, body ${player1SecondServeBodyDeuceSideCount}, T ${player1SecondServeTDeuceSideCount}), ad side second serve(wide ${player1SecondServeWideAdSideCount}, body ${player1SecondServeBodyAdSideCount}, T ${player1SecondServeTAdSideCount}), ace and unreturnable serve direction(wide ${player1AceWideCount}, body ${player1AceBodyCount}, T ${player1AceTCount})`;

      fillCell(sheet, i, player1ServeDirectionColumnNumberAnalysis, player1ServeDirectionString);

      var player2ServeDirectionString = `${player2}: first serve direction(wide ${player2FirstServeWideCount}, body ${player2FirstServeBodyCount}, T ${player2FirstServeTCount}), deuce side first serve(wide ${player2FirstServeWideDeuceSideCount}, body ${player2FirstServeBodyDeuceSideCount}, T ${player2FirstServeTDeuceSideCount}), ad side first serve(wide ${player2FirstServeWideAdSideCount}, body ${player2FirstServeBodyAdSideCount}, T ${player2FirstServeTAdSideCount}), second serve direction(wide ${player2SecondServeWideCount}, body ${player2SecondServeBodyCount}, T ${player2SecondServeTCount}), deuce side second serve(wide ${player2SecondServeWideDeuceSideCount}, body ${player2SecondServeBodyDeuceSideCount}, T ${player2SecondServeTDeuceSideCount}), ad side second serve(wide ${player2SecondServeWideAdSideCount}, body ${player2SecondServeBodyAdSideCount}, T ${player2SecondServeTAdSideCount}), ace and unreturnable serve(wide ${player2AceWideCount}, body ${player2AceBodyCount}, T ${player2AceTCount})`;

      fillCell(sheet, i, player2ServeDirectionColumnNumberAnalysis, player2ServeDirectionString);

      // Construct the game point serve direction string
      var gamePointServeDirectionString = `${player1}: game point first serve deuce side direction(wide ${player1GamePointDeuceSideFirstServeWideCount}, body ${player1GamePointDeuceSideFirstServeBodyCount}, T ${player1GamePointDeuceSideFirstServeTCount}), ad side direction(wide ${player1GamePointAdSideFirstServeWideCount}, body ${player1GamePointAdSideFirstServeBodyCount}, T ${player1GamePointAdSideFirstServeTCount}), game point second serve deuce side direction(wide ${player1GamePointDeuceSideSecondServeWideCount}, body ${player1GamePointDeuceSideSecondServeBodyCount}, T ${player1GamePointDeuceSideSecondServeTCount}), ad side direction(wide ${player1GamePointAdSideSecondServeWideCount}, body ${player1GamePointAdSideSecondServeBodyCount}, T ${player1GamePointAdSideSecondServeTCount})`;

      fillCell(sheet, i, player1GamePointServeDirectionColumnAnalysis, gamePointServeDirectionString);

      gamePointServeDirectionString = `${player2}: game point first serve deuce side direction(wide ${player2GamePointDeuceSideFirstServeWideCount}, body ${player2GamePointDeuceSideFirstServeBodyCount}, T ${player2GamePointDeuceSideFirstServeTCount}), ad side direction(wide ${player2GamePointAdSideFirstServeWideCount}, body ${player2GamePointAdSideFirstServeBodyCount}, T ${player2GamePointAdSideFirstServeTCount}), game point second serve deuce side direction(wide ${player2GamePointDeuceSideSecondServeWideCount}, body ${player2GamePointDeuceSideSecondServeBodyCount}, T ${player2GamePointDeuceSideSecondServeTCount}), ad side direction(wide ${player2GamePointAdSideSecondServeWideCount}, body ${player2GamePointAdSideSecondServeBodyCount}, T ${player2GamePointAdSideSecondServeTCount})`;

      fillCell(sheet, i, player2GamePointServeDirectionColumnAnalysis, gamePointServeDirectionString);

      // Serve sequence pattern string
      var servePatternString = `${player1}: first serve deuce side pattern(${player1FirstServeDeuceSidePattern}), first serve ad side pattern(${player1FirstServeAdSidePattern}), second serve deuce side pattern(${player1SecondServeDeuceSidePattern}), second serve ad side pattern(${player1SecondServeAdSidePattern})`;

      fillCell(sheet, i, player1ServePatternColumnNumberAnalysis, servePatternString);

      servePatternString = `${player2}: first serve deuce side pattern(${player2FirstServeDeuceSidePattern}), first serve ad side pattern(${player2FirstServeAdSidePattern}), second serve deuce side pattern(${player2SecondServeDeuceSidePattern}), second serve ad side pattern(${player2SecondServeAdSidePattern})`;

      fillCell(sheet, i, player2ServePatternColumnNumberAnalysis, servePatternString);

      // Construct player1 unforced error classification string
      var unforcedErrorClassification = `${player1}: unforced error(${player1UnforcedErrorCount}, net ${player1UnforcedErrorNetCount}, out ${player1UnforcedErrorOutCount}), `;

      if (player1ForehandUnforcedErrorCount > 0) {
        unforcedErrorClassification += `forehand(${player1ForehandUnforcedErrorCount}), `;
      }

      if (player1BackhandUnforcedErrorCount > 0) {
        unforcedErrorClassification += `backhand(${player1BackhandUnforcedErrorCount}), `;
      }

      if (player1SliceUnforcedErrorCount > 0) {
        unforcedErrorClassification += `slice(${player1SliceUnforcedErrorCount}), `;
      }

      if (player1VolleyUnforcedErrorCount > 0) {
        unforcedErrorClassification += `volley(${player1VolleyUnforcedErrorCount}), `;
      }

      if (player1OverheadUnforcedErrorCount > 0) {
        unforcedErrorClassification += `overhead(${player1OverheadUnforcedErrorCount}), `;
      }

      if (player1DropshotUnforcedErrorCount > 0) {
        unforcedErrorClassification += `dropshot(${player1DropshotUnforcedErrorCount}), `;
      }

      if (player1LobUnforcedErrorCount > 0) {
        unforcedErrorClassification += `lob(${player1LobUnforcedErrorCount}), `;
      }

      if (player1PassingShotUnforcedErrorCount > 0) {
        unforcedErrorClassification += `passing shot(${player1PassingShotUnforcedErrorCount}),`;
      }

      fillCell(sheet, i, player1UnforcedErrorClassificationColumnNumberAnalysis,
        unforcedErrorClassification);

      // Construct player2 unforced error classification string
      unforcedErrorClassification = `${player2}: unforced error(${player2UnforcedErrorCount}, net ${player2UnforcedErrorNetCount}, out ${player2UnforcedErrorOutCount}), `;
      if (player2ForehandUnforcedErrorCount > 0) {
        unforcedErrorClassification += `forehand(${player2ForehandUnforcedErrorCount}), `;
      }

      if (player2BackhandUnforcedErrorCount > 0) {
        unforcedErrorClassification += `backhand(${player2BackhandUnforcedErrorCount}), `;
      }

      if (player2SliceUnforcedErrorCount > 0) {
        unforcedErrorClassification += `slice(${player2SliceUnforcedErrorCount}), `;
      }

      if (player2VolleyUnforcedErrorCount > 0) {
        unforcedErrorClassification += `volley(${player2VolleyUnforcedErrorCount}), `;
      }

      if (player2OverheadUnforcedErrorCount > 0) {
        unforcedErrorClassification += `overhead(${player2OverheadUnforcedErrorCount}), `;
      }

      if (player2DropshotUnforcedErrorCount > 0) {
        unforcedErrorClassification += `dropshot(${player2DropshotUnforcedErrorCount}), `;
      }

      if (player2LobUnforcedErrorCount > 0) {
        unforcedErrorClassification += `lob(${player2LobUnforcedErrorCount}), `;
      }

      if (player2PassingShotUnforcedErrorCount > 0) {
        unforcedErrorClassification += `passing shot(${player2PassingShotUnforcedErrorCount}),`;
      }

      fillCell(sheet, i, player2UnforcedErrorClassificationColumnNumberAnalysis,
        unforcedErrorClassification);

      // Construct player1 winner classification string
      var winnerClassification = `${player1}: winner and opponent forced error(${player1WinnerForcedErrorCount}, winner ${player1WinnerCount}, forced error ${player1ForcedErrorCount}), `;
      if (player1ForehandWinnerCount > 0) {
        winnerClassification += `forehand(${player1ForehandWinnerCount}), `;
      }

      if (player1BackhandWinnerCount > 0) {
        winnerClassification += `backhand(${player1BackhandWinnerCount}), `;
      }

      if (player1SliceWinnerCount > 0) {
        winnerClassification += `slice(${player1SliceWinnerCount}), `;
      }

      if (player1VolleyWinnerCount > 0) {
        winnerClassification += `volley(${player1VolleyWinnerCount}), `;
      }

      if (player1OverheadWinnerCount > 0) {
        winnerClassification += `overhead(${player1OverheadWinnerCount}), `;
      }

      if (player1DropshotWinnerCount > 0) {
        winnerClassification += `dropshot(${player1DropshotWinnerCount}), `;
      }

      if (player1LobWinnerCount > 0) {
        winnerClassification += `lob(${player1LobWinnerCount}), `;
      }

      if (player1PassingShotWinnerCount > 0) {
        winnerClassification += `passing shot(${player1PassingShotWinnerCount}),`;
      }

      fillCell(sheet, i, player1WinnerClassificationColumnNumberAnalysis,
        winnerClassification);

      // Construct player2 winner classification string
      winnerClassification = `${player2}: winner and opponent forced error(${player2WinnerForcedErrorCount}, winner ${player2WinnerCount}, forced error ${player2ForcedErrorCount}), `;
      if (player2ForehandWinnerCount > 0) {
        winnerClassification += `forehand(${player2ForehandWinnerCount}), `;
      }

      if (player2BackhandWinnerCount > 0) {
        winnerClassification += `backhand(${player2BackhandWinnerCount}), `;
      }

      if (player2SliceWinnerCount > 0) {
        winnerClassification += `slice(${player2SliceWinnerCount}), `;
      }

      if (player2VolleyWinnerCount > 0) {
        winnerClassification += `volley(${player2VolleyWinnerCount}), `;
      }

      if (player2OverheadWinnerCount > 0) {
        winnerClassification += `overhead(${player2OverheadWinnerCount}), `;
      }

      if (player2DropshotWinnerCount > 0) {
        winnerClassification += `dropshot(${player2DropshotWinnerCount}),`;
      }

      if (player2LobWinnerCount > 0) {
        winnerClassification += `lob(${player2LobWinnerCount}), `;
      }

      if (player2PassingShotWinnerCount > 0) {
        winnerClassification += `passing shot(${player2PassingShotWinnerCount}),`;
      }

      fillCell(sheet, i, player2WinnerClassificationColumnNumberAnalysis,
        winnerClassification);

      // Net points played
      player1NetPointCount = player1VolleyUnforcedErrorCount + player1VolleyWinnerCount +
        player1OverheadUnforcedErrorCount + player1OverheadWinnerCount +
        player2PassingShotUnforcedErrorCount + player2PassingShotWinnerCount +
        player2LobUnforcedErrorCount + player2LobWinnerCount;

      player2NetPointCount = player2VolleyUnforcedErrorCount + player2VolleyWinnerCount +
        player2OverheadUnforcedErrorCount + player2OverheadWinnerCount +
        player1PassingShotUnforcedErrorCount + player1PassingShotWinnerCount +
        player1LobUnforcedErrorCount + player1LobWinnerCount;

      var netPointString = `net point played(${player1} ${player1NetPointCount}, ${player2} ${player2NetPointCount})`;

      fillCell(sheet, i, netPointColumnNumberAnalysis, netPointString);

      var gameBreakPointString = `${player1}: `;
      gameBreakPointString += `game points created(${player1GamePointCount}), `;
      gameBreakPointString += `game points won(${player1GamePointWonCount}), `;
      gameBreakPointString += `game points lost(${player1GamePointLostCount}), `;
      gameBreakPointString += `break points created(${player1BreakPointCount}), `;
      gameBreakPointString += `break points won(${player1BreakPointWonCount}), `;
      gameBreakPointString += `break points lost(${player1BreakPointLostCount}), `;
      gameBreakPointString += `opponent's break point saved(${player2BreakPointLostCount}), `;
      gameBreakPointString += `opponent's game point saved(${player2GamePointLostCount}), `;

      fillCell(sheet, i, player1GameBreakPointColumnNumberAnalysis, gameBreakPointString);

      gameBreakPointString = `${player2}: `;
      gameBreakPointString += `game points created(${player2GamePointCount}), `;
      gameBreakPointString += `game points won(${player2GamePointWonCount}), `;
      gameBreakPointString += `game points lost(${player2GamePointLostCount}), `;
      gameBreakPointString += `break points created(${player2BreakPointCount}), `;
      gameBreakPointString += `break points won(${player2BreakPointWonCount}), `;
      gameBreakPointString += `break points lost(${player2BreakPointLostCount}), `;
      gameBreakPointString += `opponent's break point saved(${player1BreakPointLostCount}), `;
      gameBreakPointString += `opponent's game point saved(${player1GamePointLostCount}), `;

      fillCell(sheet, i, player2GameBreakPointColumnNumberAnalysis, gameBreakPointString);

      // Construct high pressure point stats for player1
      var highPressurePointString = `${player1}: `;
      highPressurePointString += `high-pressure points won(${player1HighPressurePointWonCount}), `;
      highPressurePointString += `won by winner and opponent forced error(${player1HighPressurePointWinnerCount}), `;
      highPressurePointString += `won by opponent unforced error(${player1HighPressurePointWonByUnforcedErrorCount}), `
      highPressurePointString += `won on serve (${player1HighPressurePointWonOnServeCount}), `;
      highPressurePointString += `won by ace (${player1HighPressurePointAceCount}), `;
      highPressurePointString += `won by unreturnable serve (${player1HighPressurePointWonByUnreturnableServeCount}), `;
      highPressurePointString += `won on return (${player1HighPressurePointWonOnReturnCount}), `;

      fillCell(sheet, i, player1HighPressurePointWonColumnNumberAnalysis,
        highPressurePointString);

      highPressurePointString = `${player1}: `;
      highPressurePointString += `high-pressure points lost(${player1HighPressurePointLostCount}), `;
      highPressurePointString += `lost by unforced error(${player1HighPressurePointLostByUnforcedErrorCount}), `;
      highPressurePointString += `lost by opponent winner(${player1HighPressurePointLostByOpponentWinnerCount}), `;
      highPressurePointString += `lost on serve(${player1HighPressurePointLostOnServeCount}), `;
      highPressurePointString += `lost by double fault(${player1HighPressurePointDoubleFaultCount}), `;
      highPressurePointString += `lost on return(${player1HighPressurePointLostOnReturnCount}), `;
      highPressurePointString += `lost by opponent ace (${player1HighPressurePointLostByOpponentAceCount}), `;
      highPressurePointString += `lost by opponent unreturnable serve (${player1HighPressurePointLostByOpponentUnreturnableServeCount}), `;

      fillCell(sheet, i, player1HighPressurePointLostColumnNumberAnalysis,
        highPressurePointString);

      // Construct high pressure point stats for player2
      highPressurePointString = `${player2}: `;
      highPressurePointString += `high-pressure points won(${player2HighPressurePointWonCount}), `;
      highPressurePointString += `won by winner and opponent forced error(${player2HighPressurePointWinnerCount}), `;
      highPressurePointString += `won by opponent unforced error(${player2HighPressurePointWonByUnforcedErrorCount}), `
      highPressurePointString += `won on serve (${player2HighPressurePointWonOnServeCount}), `;
      highPressurePointString += `won by ace(${player2HighPressurePointAceCount}), `;
      highPressurePointString += `won by unreturnable serve(${player2HighPressurePointWonByUnreturnableServeCount}), `;
      highPressurePointString += `won on return(${player2HighPressurePointWonOnReturnCount}), `;

      fillCell(sheet, i, player2HighPressurePointWonColumnNumberAnalysis,
        highPressurePointString);

      highPressurePointString = `${player2}: `;
      highPressurePointString += `high-pressure points lost(${player2HighPressurePointLostCount}), `;
      highPressurePointString += `lost by unforced error(${player2HighPressurePointLostByUnforcedErrorCount}), `;
      highPressurePointString += `lost by opponent winner(${player2HighPressurePointLostByOpponentWinnerCount}), `;
      highPressurePointString += `lost on serve(${player2HighPressurePointLostOnServeCount}), `;
      highPressurePointString += `lost by double fault (${player2HighPressurePointDoubleFaultCount}), `;
      highPressurePointString += `lost on return(${player2HighPressurePointLostOnReturnCount}), `;
      highPressurePointString += `lost by opponent ace(${player2HighPressurePointLostByOpponentAceCount}), `;
      highPressurePointString += `lost by opponent unreturnable serve(${player2HighPressurePointLostByOpponentUnreturnableServeCount}), `;

      fillCell(sheet, i, player2HighPressurePointLostColumnNumberAnalysis,
        highPressurePointString);

      // Construct high pressure point serve stats for player1
      var highPressurePointServeString = `${player1}: `;
      var highPressurePointFirstServePct = 0;
      if (player1HighPressurePointServedCount > 0) {
        highPressurePointFirstServePct = Math.round((player1HighPressurePointFirstServeInCount / player1HighPressurePointServedCount) * 100);
      }
      highPressurePointServeString += `high-pressure point first serve percentage(${highPressurePointFirstServePct} percent), `;
      highPressurePointServeString += `first serve deuce side direction(wide ${player1HighPressurePointFirstServeDeuceWideCount}, body ${player1HighPressurePointFirstServeDeuceBodyCount}, T ${player1HighPressurePointFirstServeDeuceTCount}), ad side direction(wide ${player1HighPressurePointFirstServeAdWideCount}, body ${player1HighPressurePointFirstServeAdBodyCount}, T ${player1HighPressurePointFirstServeAdTCount}), second serve deuce side direction(wide ${player1HighPressurePointSecondServeDeuceWideCount}, body ${player1HighPressurePointSecondServeDeuceBodyCount}, T ${player1HighPressurePointSecondServeDeuceTCount}), ad side direction(wide ${player1HighPressurePointSecondServeAdWideCount}, body ${player1HighPressurePointSecondServeAdBodyCount}, T ${player1HighPressurePointSecondServeAdTCount})`;

      fillCell(sheet, i, player1HighPressurePointServeColumnNumberAnalysis, highPressurePointServeString);

      // Construct high pressure point serve stats for player2
      highPressurePointServeString = `${player2}: `;
      highPressurePointFirstServePct = 0;
      if (player2HighPressurePointServedCount > 0) {
        highPressurePointFirstServePct = Math.round((player2HighPressurePointFirstServeInCount / player2HighPressurePointServedCount) * 100);
      }
      highPressurePointServeString += `high-pressure point first serve percentage(${highPressurePointFirstServePct} percent), `;
      highPressurePointServeString += `first serve deuce side direction(wide ${player2HighPressurePointFirstServeDeuceWideCount}, body ${player2HighPressurePointFirstServeDeuceBodyCount}, T ${player2HighPressurePointFirstServeDeuceTCount}), ad side(wide ${player2HighPressurePointFirstServeAdWideCount}, body ${player2HighPressurePointFirstServeAdBodyCount}, T ${player2HighPressurePointFirstServeAdTCount}), second serve deuce side direction(wide ${player2HighPressurePointSecondServeDeuceWideCount}, body ${player2HighPressurePointSecondServeDeuceBodyCount}, T ${player2HighPressurePointSecondServeDeuceTCount}), ad side direction(wide ${player2HighPressurePointSecondServeAdWideCount}, body ${player2HighPressurePointSecondServeAdBodyCount}, T ${player2HighPressurePointSecondServeAdTCount})`;

      fillCell(sheet, i, player2HighPressurePointServeColumnNumberAnalysis, highPressurePointServeString);

      // Construct serve histogram string
      var serveHistogramString = `${player1}: `;
      serveHistogramString += "ace and unreturnable serve histogram(";
      for (let i = 0; i < player1AceHistogram.length; i++) {
        serveHistogramString += player1AceHistogram[i] + ", ";
      }
      serveHistogramString += "), ";

      serveHistogramString += "double fault histogram(";
      for (let i = 0; i < player1DoubleFaultHistogram.length; i++) {
        serveHistogramString += player1DoubleFaultHistogram[i] + ", ";
      }
      serveHistogramString += "), ";

      serveHistogramString += "first serve fault histogram(";
      for (let i = 0; i < player1FirstServeFaultHistogram.length; i++) {
        serveHistogramString += player1FirstServeFaultHistogram[i] + ", ";
      }
      serveHistogramString += "), ";

      fillCell(sheet, i, player1ServeHistogramColumnNumberAnalysis, serveHistogramString);

      serveHistogramString = `${player2}: `;
      serveHistogramString += "ace and unreturnable serve histogram(";
      for (let i = 0; i < player2AceHistogram.length; i++) {
        serveHistogramString += player2AceHistogram[i] + ", ";
      }
      serveHistogramString += "), ";

      serveHistogramString += "double fault histogram(";
      for (let i = 0; i < player2DoubleFaultHistogram.length; i++) {
        serveHistogramString += player2DoubleFaultHistogram[i] + ", ";
      }
      serveHistogramString += "), ";

      serveHistogramString += "first serve fault histogram(";
      for (let i = 0; i < player2FirstServeFaultHistogram.length; i++) {
        serveHistogramString += player2FirstServeFaultHistogram[i] + ", ";
      }
      serveHistogramString += "), ";

      fillCell(sheet, i, player2ServeHistogramColumnNumberAnalysis, serveHistogramString);

      // Construct performance histogram string
      var performanceHistogramString = `${player1}: `;
      performanceHistogramString += "winner and  opponent forced error histogram(";
      for (let i = 0; i < player1WinnerHistogram.length; i++) {
        performanceHistogramString += player1WinnerHistogram[i] + ", ";
      }
      performanceHistogramString += "), ";

      performanceHistogramString += "unforced error histogram(";
      for (let i = 0; i < player1UnforcedErrorHistogram.length; i++) {
        performanceHistogramString += player1UnforcedErrorHistogram[i] + ", ";
      }
      performanceHistogramString += "), ";

      performanceHistogramString += "points won histogram(";
      for (let i = 0; i < player1PointsWonHistogram.length; i++) {
        performanceHistogramString += player1PointsWonHistogram[i] + ", ";
      }
      performanceHistogramString += "), ";

      performanceHistogramString += "points lost histogram(";
      for (let i = 0; i < player1PointsLostHistogram.length; i++) {
        performanceHistogramString += player1PointsLostHistogram[i] + ", ";
      }
      performanceHistogramString += "), ";

      performanceHistogramString += "points gain or loss histogram(";
      for (let i = 0; i < player1PointsWonHistogram.length; i++) {
        if ((player1PointsWonHistogram[i] != "set") && (player1PointsLostHistogram[i] != "set")) {
          performanceHistogramString += (player1PointsWonHistogram[i] - player1PointsLostHistogram[i]) + ", ";
        } else {
          performanceHistogramString += "set, ";
        }
      }
      performanceHistogramString += "), ";

      fillCell(sheet, i, player1PerformanceHistogramColumnNumberAnalysis, performanceHistogramString);

      performanceHistogramString = `${player2}: `;
      performanceHistogramString += "winner and  opponent forced error histogram(";
      for (let i = 0; i < player2WinnerHistogram.length; i++) {
        performanceHistogramString += player2WinnerHistogram[i] + ", ";
      }
      performanceHistogramString += "), ";

      performanceHistogramString += "unforced error histogram(";
      for (let i = 0; i < player2UnforcedErrorHistogram.length; i++) {
        performanceHistogramString += player2UnforcedErrorHistogram[i] + ", ";
      }
      performanceHistogramString += "), ";

      performanceHistogramString += "points won histogram(";
      for (let i = 0; i < player2PointsWonHistogram.length; i++) {
        performanceHistogramString += player2PointsWonHistogram[i] + ", ";
      }
      performanceHistogramString += "), ";

      performanceHistogramString += "points lost histogram(";
      for (let i = 0; i < player2PointsLostHistogram.length; i++) {
        performanceHistogramString += player2PointsLostHistogram[i] + ", ";
      }
      performanceHistogramString += "), ";

      performanceHistogramString += "points gain or loss histogram(";
      for (let i = 0; i < player2PointsWonHistogram.length; i++) {
        if ((player2PointsWonHistogram[i] != "set") && (player2PointsLostHistogram[i] != "set")) {
          performanceHistogramString += (player2PointsWonHistogram[i] - player2PointsLostHistogram[i]) + ", ";
        } else {
          performanceHistogramString += "set, ";
        }
      }
      performanceHistogramString += "), ";

      fillCell(sheet, i, player2PerformanceHistogramColumnNumberAnalysis, performanceHistogramString);

      // Construct game and break point histogram string
      var gameBreakPointHistogramString = `${player1}: `;
      gameBreakPointHistogramString += "game and break point histogram(";
      for (let i = 0; i < player1GameAndBreakPointHistogram.length; i++) {
        gameBreakPointHistogramString += player1GameAndBreakPointHistogram[i] + ", ";
      }
      gameBreakPointHistogramString += "), ";

      gameBreakPointHistogramString += "high pressure point histogram(";
      for (let i = 0; i < player1HighPressurePointHistogram.length; i++) {
        gameBreakPointHistogramString += player1HighPressurePointHistogram[i] + ", ";
      }
      gameBreakPointHistogramString += "), ";

      fillCell(sheet, i, player1GameBreakPointHistogramColumnNumberAnalysis, gameBreakPointHistogramString);

      gameBreakPointHistogramString = `${player2}: `;
      gameBreakPointHistogramString += "game and break point histogram(";
      for (let i = 0; i < player2GameAndBreakPointHistogram.length; i++) {
        gameBreakPointHistogramString += player2GameAndBreakPointHistogram[i] + ", ";
      }
      gameBreakPointHistogramString += "), ";

      gameBreakPointHistogramString += "high pressure point histogram(";
      for (let i = 0; i < player2HighPressurePointHistogram.length; i++) {
        gameBreakPointHistogramString += player2HighPressurePointHistogram[i] + ", ";
      }
      gameBreakPointHistogramString += "), ";

      fillCell(sheet, i, player2GameBreakPointHistogramColumnNumberAnalysis, gameBreakPointHistogramString);

      // Add score
      if (currentGameScore != "") {
        finishedGameScore += currentGameScore;
      }
      fillCell(sheet, i, scoreColumnNumberAnalysis, finishedGameScore);

      return;
    }
  }
}

function fillCell(sheet, rowNumber, columnNumber, value) {
  var cell = sheet.getRange(rowNumber + 1, columnNumber + 1);
  cell.setValue(value);
  // cell.clearContent();
}

// Is this a high-pressure point? Return: 0 (not a high-pressure point), 
// 1(player1's high-pressure point), 2 (player2's high-pressure point), 3 (both players' high-pressure point)
function isHighPressurePoint(row) {
  if (isGameOrBreakPoint(row) != 0) {
    return 3;
  }

  var isTiebreak = false;
  var tbPressureScore = 0;
  if (row[tiebreakColumnNumberPoints] == "7-point") {
    isTiebreak = true;
    tbPressureScore = 5;
  } else if (row[tiebreakColumnNumberPoints] == "10-point") {
    isTiebreak = true;
    tbPressureScore = 8;
  }

  if (isTiebreak) {
    var result = 0;
    if (row[tiebreakScore2PreColumnNumberPoints] >= tbPressureScore) {
      // Player1's high pressure point
      result += 1;
    }

    if (row[tiebreakScore1PreColumnNumberPoints] >= tbPressureScore) {
      // player2's high pressure point
      result += 2;
    }

    return result;
  } else {
    var highPressureScores = ["30", "40", "ad"];
    var result = 0;
    if (highPressureScores.includes(row[pointScore2PreColumnNumberPoints])) {
      // This is player1's high pressure point
      result += 1;
    }

    if (highPressureScores.includes(row[pointScore1PreColumnNumberPoints])) {
      // This is player2's high pressure point
      result += 2;
    }

    return result;
  }
}

// Return: -2 (player2 break point), -1 (player1 break point), 0 (not game or break point), 
// 1(player1 game point), 2(player2 game point),
// 3(40-40 in no-ad scoring with player1 serving),
// 4(40-40 in no-ad scoring with player2 serving)
function isGameOrBreakPoint(row) {
  var tiebreak = false;
  var tiebreakDeuceThreshold = 0;

  if (row[tiebreakColumnNumberPoints] == "7-point") {
    tiebreak = true;
    tiebreakDeuceThreshold = 6;
  } else if (row[tiebreakColumnNumberPoints] == "10-point") {
    tiebreak = true;
    tiebreakDeuceThreshold = 9;
  }

  if (tiebreak) {
    if ((row[tiebreakScore1PreColumnNumberPoints] >= tiebreakDeuceThreshold) && (row[tiebreakScore1PreColumnNumberPoints] > row[tiebreakScore2PreColumnNumberPoints])) {
      // Player1 is one point from winning the game
      if (row[serverColumnNumberPoints] == row[player1ColumnNumberPoints]) {
        // Player1 is serving
        // player1 game point
        return 1;
      } else if (row[serverColumnNumberPoints] == row[player2ColumnNumberPoints]) {
        // Player2 is serving
        // Player1 break point
        return -1;
      }
    } else if ((row[tiebreakScore2PreColumnNumberPoints] >= tiebreakDeuceThreshold) && (row[tiebreakScore2PreColumnNumberPoints] > row[tiebreakScore1PreColumnNumberPoints])) {
      // Player2 is one point from winning the game
      if (row[serverColumnNumberPoints] == row[player2ColumnNumberPoints]) {
        // Player2 is serving
        // player2 game point
        return 2;
      } else if (row[serverColumnNumberPoints] == row[player1ColumnNumberPoints]) {
        // Player1 is serving
        // Player2 break point
        return -2;
      }
    }
  } else {
    // Not tiebreak
    if (((row[pointScore1PreColumnNumberPoints] == "40") && ((row[pointScore2PreColumnNumberPoints] != "40") && (row[pointScore2PreColumnNumberPoints] != "ad"))) ||
      (row[pointScore1PreColumnNumberPoints] == "ad")) {
      // Player1 is one point from winning the game
      if (row[serverColumnNumberPoints] == row[player1ColumnNumberPoints]) {
        // Player1 is serving
        // player1 game point
        return 1;
      } else if (row[serverColumnNumberPoints] == row[player2ColumnNumberPoints]) {
        // Player2 is serving
        // Player1 break point
        return -1;
      }
    } else if (((row[pointScore2PreColumnNumberPoints] == "40") && ((row[pointScore1PreColumnNumberPoints] != "40") && (row[pointScore1PreColumnNumberPoints] != "ad"))) ||
      (row[pointScore2PreColumnNumberPoints] == "ad")) {
      // Player2 is one point from winning the game
      if (row[serverColumnNumberPoints] == row[player2ColumnNumberPoints]) {
        // Player2 is serving
        // player2 game point
        return 2;
      } else if (row[serverColumnNumberPoints] == row[player1ColumnNumberPoints]) {
        // Player1 is serving
        // Player2 break point
        return -2;
      }
    } else if ((row[adScoringColumnNumberPoints] == "no-ad") &&
      (row[pointScore1PreColumnNumberPoints] == "40") &&
      (row[pointScore2PreColumnNumberPoints] == "40")) {
      // 40-40 in no-ad scoring
      if (row[serverColumnNumberPoints] == row[player1ColumnNumberPoints]) {
        // Player1 is serving. Player1's game point and player2's break point
        return 3;
      } else if (row[serverColumnNumberPoints] == row[player2ColumnNumberPoints]) {
        // Player2 is serving. Player2's game point and player1's break point
        return 4;
      }
    }
  }

  return 0;
}

// Return: 0 (error), 1 (deuce side), 2 (ad side)
function getServeSide(player1PointScore, player2PointScore, isTiebreak) {
  if (!isTiebreak) {
    var score = player1PointScore + "-" + player2PointScore;
    switch (score) {
      case "0-0":
      case "15-15":
      case "0-30":
      case "30-0":
      case "30-30":
      case "40-15":
      case "15-40":
      case "40-40":
        return 1;
      case "0-15":
      case "15-0":
      case "30-15":
      case "15-30":
      case "0-40":
      case "40-0":
      case "40-30":
      case "30-40":
      case "40-ad":
      case "ad-40":
        return 2;
      default:
        return 0;
    }
  } else {
    if (((player1PointScore + player2PointScore) % 2) == 0) {
      // Deuce side if the sum of point scores is even 
      return 1;
    } else {
      return 2;
    }
  }
}

// ==========================================
// NEW: Web App Endpoint for Native App Sync
// ==========================================

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var result = { status: "success" };

    switch (action) {
      case "syncMatch":
        result.data = handleSyncMatch(payload.match);
        break;
      case "syncPoints":
        result.data = handleSyncPoints(payload.matchIndex, payload.points);
        break;
      case "deleteMatch":
        deleteAnalysis(payload.matchIndex);
        break;
      case "getAnalysis":
        result.data = handleGetAnalysis(payload.matchIndex);
        break;
      case "getInsights":
        result.data = handleGetInsights(payload.matchIndexes, payload.side);
        break;
      case "getMatchesByUser":
        result.data = handleGetMatchesByUser(payload.userId);
        break;
      default:
        result = { status: "error", message: "Unknown action: " + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Helper: Upsert match metadata
function handleSyncMatch(match) {
  var sheet = spreadsheet.getSheetByName("analyses");
  var range = sheet.getDataRange();
  var values = range.getValues();
  var matchIndexCol = getColumnNumber("match index", "analyses");
  
  var foundRowIndex = -1;
  for (var i = 0; i < values.length; i++) {
    if (values[i][matchIndexCol] == match.matchIndex) {
      foundRowIndex = i + 1;
      break;
    }
  }
  
  if (foundRowIndex === -1) {
    addNewAnalysis(match.user, match.matchIndex, match.player1, match.player2, match.tournament, match.date, match.adScoring);
  } else {
    updateMatchInfo(match.matchIndex, match.date, match.player1, match.player2, match.tournament, match.adScoring);
  }
  return { matchIndex: match.matchIndex };
}

// Helper: Overwrite all points for a match and recalculate
function handleSyncPoints(matchIndex, pointsList) {
  var sheet = spreadsheet.getSheetByName("points");
  var range = sheet.getDataRange();
  var values = range.getValues();
  var matchIndexCol = getColumnNumber("match index", "points");
  
  // 1. Delete existing points for this match
  for (var i = values.length - 1; i >= 0; i--) {
    if (values[i][matchIndexCol] == matchIndex) {
      sheet.deleteRow(i + 1);
    }
  }
  
  // 2. Append new points list
  if (pointsList && pointsList.length > 0) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Map JSON points key-values to column index order
    var rowsToAppend = pointsList.map(function(pt) {
      var row = [];
      for (var col = 0; col < headers.length; col++) {
        var columnName = headers[col];
        row.push(pt[columnName] !== undefined ? pt[columnName] : "");
      }
      return row;
    });
    
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  }
  
  // 3. Trigger recalculation
  onPointChange(matchIndex);
  return { pointCount: pointsList ? pointsList.length : 0 };
}

// Helper: Retrieve pre-formatted analysis strings for display
function handleGetAnalysis(matchIndex) {
  var sheet = spreadsheet.getSheetByName("analyses");
  var range = sheet.getDataRange();
  var values = range.getValues();
  var headers = values[0]; // reuse already-fetched data; don't call getValues() again
  var matchIndexCol = getColumnNumber("match index", "analyses");
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][matchIndexCol] == matchIndex) {
      var rowData = {};
      for (var col = 0; col < headers.length; col++) {
        rowData[headers[col]] = values[i][col];
      }
      return rowData;
    }
  }
  return null;
}
// Helper: Return all matches (with embedded points) for a given user ID
function handleGetMatchesByUser(userId) {
  // 1. Scan analyses sheet for rows belonging to this user
  var analysesSheet = spreadsheet.getSheetByName("analyses");
  var analysesValues = analysesSheet.getDataRange().getValues();
  var analysesHeaders = analysesValues[0];
  var userColIdx = analysesHeaders.indexOf("user");
  var miColIdx   = analysesHeaders.indexOf("match index");

  var matches   = [];
  var miToIdx   = {}; // matchIndex string -> position in matches array

  for (var i = 1; i < analysesValues.length; i++) {
    if (String(analysesValues[i][userColIdx]) === String(userId)) {
      var matchObj = {};
      for (var col = 0; col < analysesHeaders.length; col++) {
        matchObj[analysesHeaders[col]] = analysesValues[i][col];
      }
      matchObj.points = [];
      miToIdx[String(analysesValues[i][miColIdx])] = matches.length;
      matches.push(matchObj);
    }
  }

  if (matches.length === 0) return [];

  // 2. Single scan of points sheet — attach rows to their parent match
  var pointsSheet  = spreadsheet.getSheetByName("points");
  var pointsValues = pointsSheet.getDataRange().getValues();
  var pointsHeaders = pointsValues[0];
  var miColPts = pointsHeaders.indexOf("match index");

  for (var j = 1; j < pointsValues.length; j++) {
    var mi = String(pointsValues[j][miColPts]);
    if (miToIdx.hasOwnProperty(mi)) {
      var ptObj = {};
      for (var col = 0; col < pointsHeaders.length; col++) {
        ptObj[pointsHeaders[col]] = pointsValues[j][col];
      }
      matches[miToIdx[mi]].points.push(ptObj);
    }
  }

  return matches;
}

// ==========================================
// Insights layer (additive, on top of the raw engine)
// ==========================================

// Get-or-create the insights_cache sheet.
function getInsightsCacheSheet() {
  var sheet = spreadsheet.getSheetByName('insights_cache');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('insights_cache');
    sheet.appendRow(['matchKey', 'insightsJson', 'cachedAt']);
  }
  return sheet;
}

// Normalize one match's point-object rows so the chosen side becomes "subject".
// Returns { rows, subjectName, opponentName }.
function normalizePointsForSubject(rowsForMatch, side) {
  if (!rowsForMatch || rowsForMatch.length === 0) {
    return { rows: [], subjectName: '', opponentName: '' };
  }
  var p1 = String(rowsForMatch[0]['player 1'] || '');
  var p2 = String(rowsForMatch[0]['player 2'] || '');
  var subjectName = (side === 'player2') ? p2 : p1;
  var opponentName = (side === 'player2') ? p1 : p2;

  var remap = function (v) {
    v = String(v || '').trim();
    if (v === subjectName) return 'subject';
    if (v === opponentName) return 'opponent';
    return v;
  };

  var out = [];
  for (var i = 0; i < rowsForMatch.length; i++) {
    var r = rowsForMatch[i];
    var n = {};
    // copy all keys through
    for (var k in r) { if (Object.prototype.hasOwnProperty.call(r, k)) n[k] = r[k]; }
    n['player 1'] = 'subject';
    n['player 2'] = 'opponent';
    n['server'] = remap(r['server']);
    n['winner'] = remap(r['winner']);
    // coerce numeric fields the helpers depend on
    n['rally length']            = Number(r['rally length']) || 0;
    n['game score 1 pre']        = Number(r['game score 1 pre']) || 0;
    n['game score 2 pre']        = Number(r['game score 2 pre']) || 0;
    n['game score 1 post']       = Number(r['game score 1 post']) || 0;
    n['game score 2 post']       = Number(r['game score 2 post']) || 0;
    n['set score 1 pre']         = Number(r['set score 1 pre']) || 0;
    n['set score 2 pre']         = Number(r['set score 2 pre']) || 0;
    n['tiebreak score 1 pre']    = (r['tiebreak score 1 pre'] === '' || r['tiebreak score 1 pre'] === null) ? 0 : Number(r['tiebreak score 1 pre']);
    n['tiebreak score 2 pre']    = (r['tiebreak score 2 pre'] === '' || r['tiebreak score 2 pre'] === null) ? 0 : Number(r['tiebreak score 2 pre']);
    n['match index']             = String(r['match index']);
    out.push(n);
  }
  return { rows: out, subjectName: subjectName, opponentName: opponentName };
}

// Compute structured insights for one or more matches from a chosen side.
// mode is NOT used here — the backend always returns the same structured JSON;
// the device decides whether to enrich with an LLM pass.
function handleGetInsights(matchIndexes, side) {
  side = side || 'player1';
  if (!matchIndexes || !matchIndexes.length) return null;

  var keySet = matchIndexes.slice().sort().join(',') + '|' + side;

  // 1. Cache lookup
  var cacheSheet = getInsightsCacheSheet();
  var cacheVals = cacheSheet.getDataRange().getValues();
  var keyCol = 0;
  for (var i = 1; i < cacheVals.length; i++) {
    if (String(cacheVals[i][keyCol]) === keySet) {
      try {
        return JSON.parse(cacheVals[i][1]);
      } catch (e) {
        // corrupt cache row — fall through and recompute
        break;
      }
    }
  }

  // 2. Gather match metadata from the analyses sheet (for the report header)
  var analysesSheet = spreadsheet.getSheetByName('analyses');
  var aVals = analysesSheet.getDataRange().getValues();
  var aHeaders = aVals[0];
  var miColA = aHeaders.indexOf('match index');
  var p1ColA = aHeaders.indexOf('player1');
  var p2ColA = aHeaders.indexOf('player2');
  var dateColA = aHeaders.indexOf('date');
  var tourColA = aHeaders.indexOf('tournament');
  var scoreColA = aHeaders.indexOf('score');
  var adColA = aHeaders.indexOf('ad scoring');

  var wanted = {};
  for (var m = 0; m < matchIndexes.length; m++) wanted[String(matchIndexes[m])] = true;

  var matchesMeta = [];
  for (var j = 1; j < aVals.length; j++) {
    if (wanted[String(aVals[j][miColA])]) {
      matchesMeta.push({
        matchIndex: String(aVals[j][miColA]),
        player1: aVals[j][p1ColA],
        player2: aVals[j][p2ColA],
        date: aVals[j][dateColA],
        tournament: aVals[j][tourColA],
        score: aVals[j][scoreColA],
        adScoring: aVals[j][adColA]
      });
    }
  }

  // 3. Read points, group by matchIndex (preserve point order)
  var pointsSheet = spreadsheet.getSheetByName('points');
  var pVals = pointsSheet.getDataRange().getValues();
  var pHeaders = pVals[0];
  var miColP = pHeaders.indexOf('match index');
  var pointIndexCol = pHeaders.indexOf('point index');

  var byMatch = {}; // matchIndex -> [pointObj,...]
  for (var r = 1; r < pVals.length; r++) {
    var mi = String(pVals[r][miColP]);
    if (!wanted[mi]) continue;
    var pt = {};
    for (var c = 0; c < pHeaders.length; c++) pt[pHeaders[c]] = pVals[r][c];
    if (!byMatch[mi]) byMatch[mi] = [];
    byMatch[mi].push(pt);
  }
  // Sort each match's points by point index (if present)
  for (var mi2 in byMatch) {
    if (pointIndexCol !== -1) {
      byMatch[mi2].sort(function (a, b) {
        var ai = Number(a['point index']) || 0;
        var bi = Number(b['point index']) || 0;
        return ai - bi;
      });
    }
  }

  // 4. Normalize each match's points to the subject perspective and concatenate
  var allRows = [];
  var subjectName = '';
  var opponentName = '';
  // Process matches in the order they appear in matchesMeta (date desc) for a
  // sensible combined time-series.
  for (var t = 0; t < matchesMeta.length; t++) {
    var mi3 = matchesMeta[t].matchIndex;
    var matchRows = byMatch[mi3] || [];
    if (matchRows.length === 0) continue;
    var norm = normalizePointsForSubject(matchRows, side);
    if (!subjectName) { subjectName = norm.subjectName; opponentName = norm.opponentName; }
    allRows = allRows.concat(norm.rows);
  }

  if (allRows.length === 0) {
    var empty = { subject: subjectName || '', opponent: opponentName || '', matches: matchesMeta, totalPoints: 0, error: 'No point data found for the selected match(es).' };
    return empty;
  }

  // 5. Run the pure insights engine (defined in InsightsLib.js)
  var insights = computeInsights(allRows, subjectName, opponentName);
  insights.matches = matchesMeta;

  // 6. Cache and return
  try {
    cacheSheet.appendRow([keySet, JSON.stringify(insights), new Date().toISOString()]);
  } catch (e) {
    // caching failure is non-fatal
  }
  return insights;
}

