const reportService = require("../services/report.service");

exports.list = async (req, res) => {
  try {
    const data = await reportService.list(req.query);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};
