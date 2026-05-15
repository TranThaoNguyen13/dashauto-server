const automationService = require("../services/automation.service");

exports.generateReport = async (req, res) => {
  try {
    const reportType = req.body.report_type || req.body.reportType;
    const data = await automationService.generateReport({ reportType });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.saveReport = async (req, res) => {
  try {
    const data = await automationService.saveReport({
      title: req.body.title || req.body.report_title,
      type: req.body.type || req.body.report_type,
      content: req.body.content || req.body.report_content,
      emailStatus: req.body.email_status || req.body.emailStatus,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.saveWorkflowLog = async (req, res) => {
  try {
    const data = await automationService.saveWorkflowLog({
      workflowName: req.body.workflow_name || req.body.workflowName,
      status: req.body.status,
      message: req.body.message,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.getHourlyOrdersStats = async (req, res) => {
  try {
    const data = await automationService.getHourlyOrdersStats();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.createAlert = async (req, res) => {
  try {
    const data = await automationService.createAlert(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};
