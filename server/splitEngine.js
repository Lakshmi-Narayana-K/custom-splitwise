/**
 * splitEngine.js
 * Pure computation — no API calls here.
 *
 * Input:
 *   total    : number
 *   paidBy   : user_id (string)
 *   splits   : { type, users?, values? }
 *
 * Output:
 *   Array of { user_id, paid_share, owed_share } (all as strings, 2 decimal)
 */

function computeSplits({ total, paidBy, splits }) {
  const { type, users, values } = splits;
  total = parseFloat(total);

  let owedMap = {}; // user_id -> owed amount

  if (type === "equal") {
    const participants = users; // array of user_ids
    const share = parseFloat((total / participants.length).toFixed(2));
    let assigned = 0;
    participants.forEach((uid, i) => {
      if (i === participants.length - 1) {
        // Last person gets remainder to avoid rounding drift
        owedMap[uid] = parseFloat((total - assigned).toFixed(2));
      } else {
        owedMap[uid] = share;
        assigned += share;
      }
    });
  } else if (type === "exact") {
    // values: [{ user, amount }]
    let sum = 0;
    values.forEach(({ user, amount }) => {
      owedMap[user] = parseFloat(parseFloat(amount).toFixed(2));
      sum += owedMap[user];
    });
    const diff = parseFloat((total - sum).toFixed(2));
    if (Math.abs(diff) > 0.01) {
      throw new Error(
        `Exact amounts sum to ${sum}, but total is ${total}. Difference: ${diff}`,
      );
    }
  } else if (type === "percent") {
    // values: [{ user, percent }]
    let totalPct = values.reduce((s, v) => s + parseFloat(v.percent), 0);
    if (Math.abs(totalPct - 100) > 0.01) {
      throw new Error(`Percentages sum to ${totalPct}%, must equal 100%`);
    }
    let assigned = 0;
    values.forEach(({ user, percent }, i) => {
      if (i === values.length - 1) {
        owedMap[user] = parseFloat((total - assigned).toFixed(2));
      } else {
        const amt = parseFloat(
          ((parseFloat(percent) / 100) * total).toFixed(2),
        );
        owedMap[user] = amt;
        assigned += amt;
      }
    });
  } else if (type === "shares") {
    // values: [{ user, shares }] — split by ratio
    const totalShares = values.reduce((s, v) => s + parseFloat(v.shares), 0);
    let assigned = 0;
    values.forEach(({ user, shares }, i) => {
      if (i === values.length - 1) {
        owedMap[user] = parseFloat((total - assigned).toFixed(2));
      } else {
        const amt = parseFloat(
          ((parseFloat(shares) / totalShares) * total).toFixed(2),
        );
        owedMap[user] = amt;
        assigned += amt;
      }
    });
  } else {
    throw new Error(`Unknown split type: ${type}`);
  }

  // Build Splitwise payload rows
  const result = [];
  let i = 0;
  for (const [uid, owed] of Object.entries(owedMap)) {
    const paid = uid === paidBy ? total : 0;
    result.push({
      index: i,
      user_id: uid,
      paid_share: paid.toFixed(2),
      owed_share: owed.toFixed(2),
    });
    i++;
  }

  // Validate
  const sumOwed = result.reduce((s, r) => s + parseFloat(r.owed_share), 0);
  const sumPaid = result.reduce((s, r) => s + parseFloat(r.paid_share), 0);

  if (Math.abs(sumOwed - total) > 0.02) {
    throw new Error(`owed_share sum (${sumOwed}) !== total (${total})`);
  }
  if (Math.abs(sumPaid - total) > 0.02) {
    throw new Error(`paid_share sum (${sumPaid}) !== total (${total})`);
  }

  return result;
}

function buildSplitwisePayload({
  total,
  description,
  groupId,
  currency,
  date,
  paidBy,
  splits,
}) {
  const rows = computeSplits({ total, paidBy, splits });

  const payload = {
    cost: parseFloat(total).toFixed(2),
    description,
    group_id: groupId,
    currency_code: currency || "INR",
    date: (date || new Date().toISOString().split("T")[0]) + "T23:59:00+05:30",
  };

  rows.forEach((row) => {
    payload[`users__${row.index}__user_id`] = row.user_id;
    payload[`users__${row.index}__paid_share`] = row.paid_share;
    payload[`users__${row.index}__owed_share`] = row.owed_share;
  });

  return { payload, breakdown: rows };
}

module.exports = { computeSplits, buildSplitwisePayload };
