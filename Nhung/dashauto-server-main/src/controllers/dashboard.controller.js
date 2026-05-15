const dashboardService = require("../services/dashboard.service");

exports.getStats = async (req, res) => {
  try {
    const stats = await dashboardService.getStats(req.query);
    res.json(stats);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.getRevenue = async (req, res) => {
  try {
    const data = await dashboardService.getRevenue(req.query);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.getTopProducts = async (req, res) => {
  try {
    const data = await dashboardService.getTopProducts(req.query);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.getKpi = async (req, res) => {
  try {
    const data = await dashboardService.getKpi(req.query);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};
