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
    const content = fs.readFileSync(textFile, "utf8").trim();
  let lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols[0].trim() === driverID && cols[2].trim() === date) {
      cols[9] = String(newValue);
      lines[i] = cols.join(",");
      break;
    }
  }

  fs.writeFileSync(textFile, lines.join("\n"));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    const content = fs.readFileSync(textFile, "utf8").trim();
  const lines = content.split("\n");

  const targetMonth = parseInt(month, 10);
  let found = false;
  let count = 0;

  for (const line of lines) {
    const cols = line.split(",");
    if (cols[0].trim() === driverID) {
      found = true;
      const recordMonth = parseInt(cols[2].trim().split("-")[1], 10);
      if (recordMonth === targetMonth && cols[9].trim() === "true") {
        count++;
      }
    }
  }

  return found ? count : -1;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    function hmsToSeconds(str) {
    const [h, m, s] = str.trim().split(":").map(Number);
    return h * 3600 + m * 60 + s;
  }

  const content = fs.readFileSync(textFile, "utf8").trim();
  const lines = content.split("\n");

  let totalSec = 0;

  for (const line of lines) {
    const cols = line.split(",");
    if (cols[0].trim() === driverID) {
      const recordMonth = parseInt(cols[2].trim().split("-")[1], 10);
      if (recordMonth === month) {
        totalSec += hmsToSeconds(cols[7].trim());
      }
    }
  }

  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
    const shiftLines = fs.readFileSync(textFile, "utf8").trim().split("\n");
  const rateLines = fs.readFileSync(rateFile, "utf8").trim().split("\n");

  // Get driver's day off
  let dayOff = null;
  for (const line of rateLines) {
    const cols = line.split(",");
    if (cols[0].trim() === driverID) {
      dayOff = cols[1].trim().toLowerCase();
      break;
    }
  }

  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  let totalRequiredSec = 0;

  for (const line of shiftLines) {
    const cols = line.split(",");
    if (cols[0].trim() === driverID) {
      const dateStr = cols[2].trim();
      const [year, mon, day] = dateStr.split("-").map(Number);

      if (mon !== month) continue;

      // Check if date is drivers day off
      const dateObj = new Date(year, mon - 1, day);
      const dayName = dayNames[dateObj.getDay()];

      if (dayName === dayOff) continue; // Skip day off

      // Eid quota or normal quota
      if (year === 2025 && mon === 4 && day >= 10 && day <= 30) {
        totalRequiredSec += 6 * 3600;
      } else {
        totalRequiredSec += 8 * 3600 + 24 * 60;
      }
    }
  }

  // Subtract 2 hours per bonus
  totalRequiredSec -= bonusCount * 2 * 3600;
  if (totalRequiredSec < 0) totalRequiredSec = 0;

  const h = Math.floor(totalRequiredSec / 3600);
  const m = Math.floor((totalRequiredSec % 3600) / 60);
  const s = totalRequiredSec % 60;

  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
    function hmsToSeconds(str) {
    const [h, m, s] = str.trim().split(":").map(Number);
    return h * 3600 + m * 60 + s;
  }

  const rateLines = fs.readFileSync(rateFile, "utf8").trim().split("\n");

  let basePay = 0;
  let tier = 0;

  for (const line of rateLines) {
    const cols = line.split(",");
    if (cols[0].trim() === driverID) {
      basePay = parseInt(cols[2].trim(), 10);
      tier = parseInt(cols[3].trim(), 10);
      break;
    }
  }

  const allowedMissingHours = { 1: 50, 2: 20, 3: 10, 4: 3 };
  const allowedSec = allowedMissingHours[tier] * 3600;

  const actualSec = hmsToSeconds(actualHours);
  const requiredSec = hmsToSeconds(requiredHours);

  if (actualSec >= requiredSec) return basePay;

  const missingSec = requiredSec - actualSec;

  const billableSec = missingSec - allowedSec;

  if (billableSec <= 0) return basePay;

  const billableHours = Math.floor(billableSec / 3600);

  if (billableHours === 0) return basePay;

  const deductionRatePerHour = Math.floor(basePay / 185);
  const salaryDeduction = billableHours * deductionRatePerHour;

  return basePay - salaryDeduction;
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
