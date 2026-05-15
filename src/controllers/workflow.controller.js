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
    const data = await workflowService.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};
