import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getTopProducts } from "../services/dashboard.service";

function TopProductsChart({ dateRange = {} }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 5 };
    if (dateRange.from) params.from = dateRange.from;
    if (dateRange.to) params.to = dateRange.to;
    getTopProducts(params)
      .then(setData)
      .finally(() => setLoading(false));
  }, [dateRange.from, dateRange.to]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h2>Top san pham ban chay</h2>
      </div>

      {loading ? (
        <p>Dang tai...</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 20, bottom: 10, left: 100 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={140} />
            <Tooltip />
            <Bar dataKey="quantitySold" fill="#50c878" name="So luong ban" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default TopProductsChart;
