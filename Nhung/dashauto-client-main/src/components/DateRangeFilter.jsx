import "./DateRangeFilter.css";

function DateRangeFilter({ from, to, onChange }) {
  const setPreset = (days) => {
    const now = new Date();
    const fromDate = new Date();
    fromDate.setDate(now.getDate() - days + 1);
    onChange({
      from: fromDate.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    });
  };

  const clear = () => onChange({ from: "", to: "" });

  return (
    <div className="date-filter">
      <label>
        Tu ngay
        <input type="date" value={from} onChange={(e) => onChange({ from: e.target.value, to })} />
      </label>
      <label>
        Den ngay
        <input type="date" value={to} onChange={(e) => onChange({ from, to: e.target.value })} />
      </label>
      <div className="date-presets">
        <button onClick={() => setPreset(7)}>7 ngay</button>
        <button onClick={() => setPreset(30)}>30 ngay</button>
        <button onClick={() => setPreset(90)}>90 ngay</button>
        <button onClick={clear}>Tat ca</button>
      </div>
    </div>
  );
}

export default DateRangeFilter;
