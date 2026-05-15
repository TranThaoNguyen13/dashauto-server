const db = require("../db");

exports.list = async ({ workflowName, status, limit = 50, offset = 0 } = {}) => {
  const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const off = Math.max(parseInt(offset) || 0, 0);

  const params = [];
  const where = [];

  if (workflowName) {
    params.push(workflowName);
    where.push(`workflow_name = $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM workflow_logs ${whereClause}`,
    params
  );

  params.push(lim, off);
  const listResult = await db.query(
    `SELECT id, workflow_name, status, message, executed_at
     FROM workflow_logs
     ${whereClause}
     ORDER BY executed_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    total: Number(countResult.rows[0].total),
    items: listResult.rows,
  };
};

exports.getSummary = async () => {
  const result = await db.query(
    `SELECT workflow_name,
            COUNT(*) AS total_runs,
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_runs,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_runs,
            MAX(executed_at) AS last_executed_at,
            (SELECT status FROM workflow_logs wl2
             WHERE wl2.workflow_name = wl.workflow_name
             ORDER BY executed_at DESC LIMIT 1) AS last_status
     FROM workflow_logs wl
     GROUP BY workflow_name
     ORDER BY last_executed_at DESC`
  );

  return result.rows.map((r) => ({
    workflowName: r.workflow_name,
    totalRuns: Number(r.total_runs),
    successRuns: Number(r.success_runs),
    failedRuns: Number(r.failed_runs),
    lastExecutedAt: r.last_executed_at,
    lastStatus: r.last_status,
  }));
};
