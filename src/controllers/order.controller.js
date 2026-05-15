const orderService = require("../services/order.service");

exports.list = async (req, res) => {
  try {
    const data = await orderService.list(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};