const workflowService = require("../services/workflow.service");

exports.list = async (req, res) => {
  try {
    const data = await workflowService.list(req.query);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const data = await workflowService.getSummary();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};
exports.create = async (req, res) => {
  try {
    const workflow = {
      workflow_name: req.body.workflow_name,
      status: req.body.status,
      message: req.body.message,
      created_at: new Date(),
    };

    res.status(201).json({
      success: true,
      data: workflow,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};
exports.create = async (req, res) => {
  try {
    const data = await workflowService.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};
