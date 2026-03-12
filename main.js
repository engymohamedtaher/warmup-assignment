const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    function toSeconds(timeStr) {
    timeStr = timeStr.trim().toLowerCase();
    const parts = timeStr.split(" ");
    const period = parts[1];
    const [h, m, s] = parts[0].split(":").map(Number);

    let hours = h;
    if (period === "pm" && h !== 12) hours += 12;
    if (period === "am" && h === 12) hours = 0;

    return hours * 3600 + m * 60 + s;
  }

  let diff = toSeconds(endTime) - toSeconds(startTime);

  if (diff < 0) diff += 24 * 3600;

  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;

  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    function toSeconds(timeStr) {
    timeStr = timeStr.trim().toLowerCase();
    const parts = timeStr.split(" ");
    const period = parts[1];
    const [h, m, s] = parts[0].split(":").map(Number);

    let hours = h;
    if (period === "pm" && h !== 12) hours += 12;
    if (period === "am" && h === 12) hours = 0;

    return hours * 3600 + m * 60 + s;
  }

  function secondsToHMS(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const startSec = toSeconds(startTime);
  const endSec = toSeconds(endTime);
  const deliveryStart = 8 * 3600;   // 8:00 AM
  const deliveryEnd = 22 * 3600;    // 10:00 PM

  let idleSec = 0;

  // Time before 8 AM
  if (startSec < deliveryStart) {
    idleSec += Math.min(deliveryStart, endSec) - startSec;
  }

  // Time after 10 PM
  if (endSec > deliveryEnd) {
    idleSec += endSec - Math.max(deliveryEnd, startSec);
  }

  return secondsToHMS(idleSec);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    function hmsToSeconds(str) {
    const [h, m, s] = str.trim().split(":").map(Number);
    return h * 3600 + m * 60 + s;
  }

  function secondsToHMS(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const diff = hmsToSeconds(shiftDuration) - hmsToSeconds(idleTime);
  return secondsToHMS(diff);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    function hmsToSeconds(str) {
    const [h, m, s] = str.trim().split(":").map(Number);
    return h * 3600 + m * 60 + s;
  }

  const [year, month, day] = date.split("-").map(Number);

  let quotaSec;
  if (year === 2025 && month === 4 && day >= 10 && day <= 30) {
    quotaSec = 6 * 3600; // 6 hours
  } else {
    quotaSec = 8 * 3600 + 24 * 60; // 8h 24m
  }

  return hmsToSeconds(activeTime) >= quotaSec;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    const { driverID, driverName, date, startTime, endTime } = shiftObj;

  const content = fs.readFileSync(textFile, "utf8").trim();
  let lines = content === "" ? [] : content.split("\n");

  for (const line of lines) {
    const cols = line.split(",");
    if (cols[0].trim() === driverID && cols[2].trim() === date) {
      return {};
    }
  }

  const shiftDuration = getShiftDuration(startTime, endTime);
  const idleTime = getIdleTime(startTime, endTime);
  const activeTime = getActiveTime(shiftDuration, idleTime);
  const quota = metQuota(date, activeTime);
  const hasBonus = false;

  const newRecord = `${driverID},${driverName},${date},${startTime},${endTime},${shiftDuration},${idleTime},${activeTime},${quota},${hasBonus}`;

  let lastIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].split(",")[0].trim() === driverID) {
      lastIndex = i;
    }
  }

  if (lastIndex === -1) {
    lines.push(newRecord); // New driver, append at end
  } else {
    lines.splice(lastIndex + 1, 0, newRecord); // Insert after last entry of that driver
  }

  fs.writeFileSync(textFile, lines.join("\n"));

  return {
    driverID, driverName, date, startTime, endTime,
    shiftDuration, idleTime, activeTime,
    metQuota: quota,
    hasBonus
  };
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    // TODO: Implement this function
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    // TODO: Implement this function
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
