#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const required = [
  "revenue_alert_monitoring(1).json",
  "hourly_orders_check(4).json",
  "Daily Report(4).json",
  "data_sync_orders.json",
];

const optionalPatterns = [
  /^.*workflow.*\.json$/i,
  /^.*alert.*\.json$/i,
  /^KPI Alert Workflow\.json$/,
];

function collectJsonFiles(dir) {
  return fs.readdirSync(dir).filter((name) => {
    if (!name.endsWith(".json")) return false;
    if (name === "package.json" || name === "package-lock.json") return false;
    if (name === "payload.json") return false;
    return true;
  });
}

function validateWorkflowFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  if (!data.name || typeof data.name !== "string") {
    throw new Error("missing workflow name");
  }
  if (!Array.isArray(data.nodes)) {
    throw new Error("missing nodes array");
  }
  return data.name;
}

let failed = false;

for (const file of required) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    console.error(`[CI] Missing required workflow: ${file}`);
    failed = true;
    continue;
  }
  try {
    const name = validateWorkflowFile(full);
    console.log(`[CI] OK required: ${file} (${name})`);
  } catch (err) {
    console.error(`[CI] Invalid ${file}: ${err.message}`);
    failed = true;
  }
}

const allJson = collectJsonFiles(root);
const optional = allJson.filter(
  (f) =>
    !required.includes(f) &&
    optionalPatterns.some((re) => re.test(f))
);

for (const file of optional) {
  const full = path.join(root, file);
  try {
    const name = validateWorkflowFile(full);
    console.log(`[CI] OK optional: ${file} (${name})`);
  } catch (err) {
    console.error(`[CI] Invalid ${file}: ${err.message}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log("[CI] All workflow JSON files validated.");
