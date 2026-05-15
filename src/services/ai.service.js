const config = require("../config");

function formatVnd(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function buildRegionStats(orders) {
  const byRegion = {};
  for (const o of orders || []) {
    const region = o.region || "Khac";
    byRegion[region] = (byRegion[region] || 0) + 1;
  }
  return byRegion;
}

function buildStatusStats(orders) {
  const byStatus = {};
  for (const o of orders || []) {
    const status = o.status || "unknown";
    byStatus[status] = (byStatus[status] || 0) + 1;
  }
  return byStatus;
}

function toAnalysisHtml({ summary, insights, recommendations }) {
  const insightItems = (insights || []).map((t) => `<li>${t}</li>`).join("");
  const recItems = (recommendations || [])
    .map((r) => {
      const title = r.title || r.action || String(r);
      const action =
        r.action && r.title
          ? `<br/><span style="color:#374151;">${r.action}</span>`
          : "";
      const priority = r.priority
        ? `<span style="font-size:11px;background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:4px;margin-right:6px;">${r.priority}</span>`
        : "";
      return `<li style="margin-bottom:10px;">${priority}<b>${title}</b>${action}</li>`;
    })
    .join("");

  return [
    '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0;">',
    '<h3 style="color:#1d4ed8;margin:0 0 10px;">🤖 Phân tích AI</h3>',
    `<p style="margin:0 0 12px;">${summary || ""}</p>`,
    insightItems
      ? `<p style="margin:0 0 6px;"><b>Nhận xét:</b></p><ul style="margin:0 0 12px;padding-left:20px;">${insightItems}</ul>`
      : "",
    recItems
      ? `<p style="margin:0 0 6px;"><b>Hướng giải quyết đề xuất:</b></p><ol style="margin:0;padding-left:20px;">${recItems}</ol>`
      : "",
    "</div>",
  ].join("");
}

function ruleBasedAnalysis(payload) {
  const {
    report_type: reportType = "daily",
    report_title: reportTitle = "Bao cao",
    total_orders: totalOrders = 0,
    total_revenue: totalRevenue = 0,
    orders = [],
    comparison = null,
  } = payload;

  const insights = [];
  const recommendations = [];
  const regions = buildRegionStats(orders);
  const statuses = buildStatusStats(orders);
  const cancelled = statuses.cancelled || 0;
  const pending = statuses.pending || 0;

  let summary = `Báo cáo "${reportTitle}" ghi nhận ${totalOrders} đơn, doanh thu ${formatVnd(totalRevenue)} VND.`;

  if (totalOrders === 0) {
    summary =
      "Không có đơn hàng trong kỳ báo cáo — cần điều tra nguyên nhân và có kế hoạch kích hoạt bán hàng.";
    insights.push("Doanh số bằng 0 có thể do đồng bộ dữ liệu, hệ thống thanh toán hoặc chiến dịch marketing chưa chạy.");
    recommendations.push({
      priority: "cao",
      title: "Kiểm tra pipeline dữ liệu",
      action:
        "Xác minh workflow data_sync_orders, API backend và bảng orders có bản ghi trong kỳ báo cáo.",
    });
    recommendations.push({
      priority: "cao",
      title: "Kích hoạt chiến dịch ngắn hạn",
      action:
        "Chạy khuyến mãi/giảm giá theo vùng, theo dõi KPI đơn hàng theo giờ qua hourly_orders_check.",
    });
    recommendations.push({
      priority: "trung bình",
      title: "So sánh với kỳ trước",
      action: "Đối chiếu báo cáo daily/weekly để phát hiện xu hướng giảm đột ngột.",
    });
  } else {
    const topRegion = Object.entries(regions).sort((a, b) => b[1] - a[1])[0];
    if (topRegion) {
      insights.push(
        `Vùng bán mạnh nhất: ${topRegion[0]} (${topRegion[1]} đơn, ${Math.round((topRegion[1] / totalOrders) * 100)}% tổng đơn).`
      );
    }
    if (cancelled > 0) {
      insights.push(
        `Có ${cancelled} đơn hủy — tỷ lệ hủy ~${Math.round((cancelled / totalOrders) * 100)}%.`
      );
      recommendations.push({
        priority: "cao",
        title: "Giảm tỷ lệ hủy đơn",
        action:
          "Rà soát lý do hủy (tồn kho, thanh toán, giao hàng); cải thiện xác nhận đơn trước khi hoàn tất.",
      });
    }
    if (pending > 0) {
      recommendations.push({
        priority: "trung bình",
        title: "Xử lý đơn pending",
        action: `Ưu tiên xử lý ${pending} đơn đang chờ để chốt doanh thu.`,
      });
    }
    const avgOrder = totalRevenue / totalOrders;
    insights.push(`Giá trị đơn trung bình: ${formatVnd(avgOrder)} VND.`);
    recommendations.push({
      priority: "trung bình",
      title: "Tối ưu theo vùng",
      action:
        "Tăng ngân sách marketing cho vùng có conversion cao; A/B test ở vùng còn ít đơn.",
    });
  }

  if (comparison) {
    const prevRev = Number(comparison.previous_revenue || 0);
    const curRev = Number(comparison.current_revenue || 0);
    if (prevRev > 0 && reportType === "daily") {
      const change = ((totalRevenue - prevRev) / prevRev) * 100;
      const dir = change >= 0 ? "tăng" : "giảm";
      insights.push(
        `So với hôm qua (kỳ trước): doanh thu kỳ báo cáo ${dir} khoảng ${Math.abs(change).toFixed(1)}% so với ${formatVnd(prevRev)} VND.`
      );
      if (change < -20) {
        recommendations.push({
          priority: "cao",
          title: "Phản ứng doanh thu giảm mạnh",
          action:
            "Kích hoạt revenue_alert_monitoring, rà soát kênh bán và ưu đãi trong 24–48h.",
        });
      }
    }
    if (Number(comparison.current_cancelled || 0) > 0) {
      insights.push(
        `Hôm nay có ${comparison.current_cancelled} đơn hủy (dữ liệu realtime).`
      );
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: "thấp",
      title: "Duy trì hiệu suất",
      action: "Tiếp tục theo dõi dashboard và báo cáo định kỳ.",
    });
  }

  const result = { summary, insights, recommendations, provider: "rules" };
  result.analysis_html = toAnalysisHtml(result);
  return result;
}

async function callOpenAI(payload) {
  const apiKey = config.openai.apiKey;
  if (!apiKey) return null;

  const {
    report_type: reportType,
    report_title: reportTitle,
    total_orders: totalOrders,
    total_revenue: totalRevenue,
    orders = [],
    comparison,
  } = payload;

  const sampleOrders = orders.slice(0, 15).map((o) => ({
    order_code: o.order_code,
    total_amount: o.total_amount,
    status: o.status,
    region: o.region,
  }));

  const systemPrompt = `Bạn là chuyên gia phân tích bán hàng cho hệ thống DashAuto (Việt Nam).
Trả lời bằng tiếng Việt, ngắn gọn, thực tế.
Chỉ trả về JSON hợp lệ (không markdown) với schema:
{
  "summary": "string (2-3 câu)",
  "insights": ["string"],
  "recommendations": [{"priority":"cao|trung bình|thấp","title":"string","action":"string"}]
}
Đưa ra ít nhất 2 hướng giải quyết cụ thể, có thể thực hiện được.`;

  const userPrompt = JSON.stringify(
    {
      report_type: reportType,
      report_title: reportTitle,
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      sample_orders: sampleOrders,
      region_stats: buildRegionStats(orders),
      status_stats: buildStatusStats(orders),
      comparison,
    },
    null,
    2
  );

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.openai.model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    const err = new Error(`OpenAI API loi: ${response.status} ${errText.slice(0, 200)}`);
    err.status = 502;
    throw err;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI khong tra ve noi dung");
  }

  const parsed = JSON.parse(content);
  const result = {
    summary: String(parsed.summary || ""),
    insights: Array.isArray(parsed.insights) ? parsed.insights.map(String) : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((r) => ({
          priority: r.priority || "trung bình",
          title: String(r.title || ""),
          action: String(r.action || ""),
        }))
      : [],
    provider: "openai",
  };
  result.analysis_html = toAnalysisHtml(result);
  return result;
}

exports.analyzeSalesReport = async (payload) => {
  try {
    const aiResult = await callOpenAI(payload);
    if (aiResult) return aiResult;
  } catch (err) {
    if (config.openai.apiKey) throw err;
  }
  return ruleBasedAnalysis(payload);
};
