import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getRevenue } from "../services/dashboard.service";

const formatDate = (iso, groupBy) => {
  const d = new Date(iso);
  if (groupBy === "month") {
    return `${d.getMonth() + 1}/${d.getFullYear()}`;
  }
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

const formatMoney = (n) => new Intl.NumberFormat("vi-VN").format(n);

function RevenueChart({ dateRange = {} }) {
  const [groupBy, setGroupBy] = useState("day");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { groupBy };
    if (dateRange.from) params.from = dateRange.from;
    if (dateRange.to) params.to = dateRange.to;
    getRevenue(params)
      .then((rows) =>
        setData(rows.map((r) => ({ ...r, label: formatDate(r.period, groupBy) })))
      )
      .finally(() => setLoading(false));
  }, [groupBy, dateRange.from, dateRange.to]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h2>Doanh thu</h2>
        <div className="chart-toggle">
          <button
            className={groupBy === "day" ? "active" : ""}
            onClick={() => setGroupBy("day")}
          >
            Theo ngay
          </button>
          <button
            className={groupBy === "month" ? "active" : ""}
            onClick={() => setGroupBy("month")}
          >
            Theo thang
          </button>
        </div>
      </div>

      {loading ? (
        <p>Dang tai...</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis tickFormatter={formatMoney} />
            <Tooltip formatter={(v) => formatMoney(v) + " d"} />
            <Line type="monotone" dataKey="revenue" stroke="#4a90e2" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default RevenueChart;
