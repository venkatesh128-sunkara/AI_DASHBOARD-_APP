import React, { useState, useMemo } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell, Legend, AreaChart, Area
} from 'recharts';
import { Upload, Sparkles, Filter, RefreshCw, FileText } from 'lucide-react';
import './App.css';

const COLOR_PALETTE = ['#ec4899', '#38bdf8', '#f59e0b', '#10b981', '#818cf8', '#3b82f6'];

export default function App() {
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState([]);
  const [slicersConfig, setSlicersConfig] = useState({});
  const [explanations, setExplanations] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({});

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:8001/api/analyze', formData);
      if (res.data.success) {
        setRawData(res.data.data);
        setSlicersConfig(res.data.slicers || {});
        setExplanations(res.data.explanations || []);
        setSelectedFilters({});
      }
    } catch (err) {
      alert('Error connecting to Backend on http://localhost:8001!');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (column, value) => {
    setSelectedFilters(prev => {
      if (prev[column] === value) {
        const copy = { ...prev };
        delete copy[column];
        return copy;
      }
      return { ...prev, [column]: value };
    });
  };

  // Real-time Interactive Filtering
  const filteredData = useMemo(() => {
    if (!rawData.length) return [];
    return rawData.filter(row => {
      for (const [col, val] of Object.entries(selectedFilters)) {
        if (String(row[col]) !== String(val)) return false;
      }
      return true;
    });
  }, [rawData, selectedFilters]);

  // Extract Numerical and Categorical Keys
  const { catCols, numCols } = useMemo(() => {
    if (!rawData.length) return { catCols: [], numCols: [] };
    const firstRow = rawData[0];
    const cat = [], num = [];
    Object.keys(firstRow).forEach(k => {
      if (typeof firstRow[k] === 'number') num.push(k);
      else cat.push(k);
    });
    return { catCols: cat, numCols: num };
  }, [rawData]);

  // Dynamic KPI Cards
  const kpis = useMemo(() => {
    if (!filteredData.length) return [];
    const primaryNum = numCols[0];
    const secondaryNum = numCols[1];

    let sum1 = 0, sum2 = 0;
    filteredData.forEach(r => {
      if (primaryNum) sum1 += Number(r[primaryNum] || 0);
      if (secondaryNum) sum2 += Number(r[secondaryNum] || 0);
    });

    return [
      { label: 'TOTAL RECORDS', value: filteredData.length.toLocaleString() },
      { label: primaryNum ? `TOTAL ${primaryNum.toUpperCase()}` : 'ACTIVE METRICS', value: sum1 ? sum1.toLocaleString() : 'N/A' },
      { label: secondaryNum ? `AVG ${secondaryNum.toUpperCase()}` : 'DATA DIMENSIONS', value: sum2 ? (sum2 / filteredData.length).toFixed(2) : rawData.length ? Object.keys(rawData[0]).length : 0 },
      { label: 'FILTERED RATIO', value: `${((filteredData.length / (rawData.length || 1)) * 100).toFixed(1)}%` },
      { label: 'STATUS', value: 'HEALTHY' }
    ];
  }, [filteredData, numCols, rawData]);

  // Chart 1: Bar Chart
  const chart1Data = useMemo(() => {
    if (!filteredData.length || !catCols[0]) return [];
    const cat = catCols[0];
    const num = numCols[0];
    const map = {};
    filteredData.forEach(r => {
      const k = String(r[cat] || 'Other');
      const v = num ? Number(r[num] || 1) : 1;
      map[k] = (map[k] || 0) + v;
    });
    return Object.keys(map).slice(0, 8).map(k => ({ label: k, value: map[k] }));
  }, [filteredData, catCols, numCols]);

  // Chart 2: Line / Area Chart
  const chart2Data = useMemo(() => {
    if (!filteredData.length || !catCols[1]) return chart1Data;
    const cat = catCols[1];
    const num = numCols[0];
    const map = {};
    filteredData.forEach(r => {
      const k = String(r[cat] || 'Other');
      const v = num ? Number(r[num] || 1) : 1;
      map[k] = (map[k] || 0) + v;
    });
    return Object.keys(map).slice(0, 8).map(k => ({ label: k, value: map[k] }));
  }, [filteredData, catCols, numCols, chart1Data]);

  // Chart 3: Pie Chart
  const chart3Data = useMemo(() => {
    if (!filteredData.length) return [];
    const cat = catCols[2] || catCols[0];
    const map = {};
    filteredData.forEach(r => {
      const k = String(r[cat] || 'Other');
      map[k] = (map[k] || 0) + 1;
    });
    return Object.keys(map).slice(0, 5).map(k => ({ name: k, value: map[k] }));
  }, [filteredData, catCols]);

  return (
    <div className="ai-dashboard-container">
      {/* Header */}
      <header className="ai-header">
        <div className="brand">
          <Sparkles color="#ec4899" size={24} />
          <h1>AI DASHBOARD</h1>
        </div>
        <label className="upload-btn">
          <Upload size={16} />
          {loading ? 'Analyzing Data...' : 'Upload Dataset CSV/JSON'}
          <input type="file" accept=".csv,.json" onChange={handleFileUpload} disabled={loading} hidden />
        </label>
      </header>

      {!rawData.length && !loading && (
        <div className="empty-state">
          <Sparkles size={60} color="#38bdf8" />
          <h2>Upload any CSV or JSON dataset to generate your AI Dashboard</h2>
          <p>Automatic KPIs, interactive slicers, 3 charts, and a 20-point AI explanation will build instantly.</p>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>AI Engine is analyzing schema and compiling 20 explanation points...</p>
        </div>
      )}

      {rawData.length > 0 && !loading && (
        <div className="main-layout">
          {/* Slicers Sidebar */}
          <aside className="slicers-sidebar">
            <div className="slicers-title">
              <h3><Filter size={16} /> SLICERS</h3>
              {Object.keys(selectedFilters).length > 0 && (
                <button className="reset-btn" onClick={() => setSelectedFilters({})}>
                  <RefreshCw size={12} /> Reset
                </button>
              )}
            </div>

            {Object.entries(slicersConfig).slice(0, 4).map(([col, options]) => (
              <div className="slicer-box" key={col}>
                <h4>{col.toUpperCase()}</h4>
                <div className="slicer-list">
                  {options.slice(0, 10).map(opt => {
                    const active = selectedFilters[col] === opt;
                    return (
                      <label key={opt} className={`slicer-item ${active ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name={col}
                          checked={active}
                          onChange={() => handleFilterChange(col, opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          {/* Main Dashboard Workspace */}
          <main className="dashboard-content">
            {/* KPI Row */}
            <div className="kpi-row">
              {kpis.map((kpi, idx) => (
                <div className="kpi-card" key={idx}>
                  <h2>{kpi.value}</h2>
                  <p>{kpi.label}</p>
                </div>
              ))}
            </div>

            {/* Minimum 3 Charts Grid */}
            <div className="charts-grid">
              {/* Chart 1: Bar */}
              <div className="chart-card">
                <h3>{catCols[0] ? `Distribution by ${catCols[0]}` : 'Category Distribution'}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chart1Data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="label" stroke="#94a3b8" tick={{fontSize: 10}} />
                    <YAxis stroke="#94a3b8" tick={{fontSize: 10}} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                    <Bar dataKey="value" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 2: Area / Line */}
              <div className="chart-card">
                <h3>{catCols[1] ? `Trend Breakdown by ${catCols[1]}` : 'Metric Trend'}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chart2Data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="label" stroke="#94a3b8" tick={{fontSize: 10}} />
                    <YAxis stroke="#94a3b8" tick={{fontSize: 10}} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                    <Area type="monotone" dataKey="value" stroke="#38bdf8" fill="rgba(56, 189, 248, 0.2)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 3: Pie / Donut */}
              <div className="chart-card">
                <h3>Proportional Share</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={chart3Data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                      {chart3Data.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLOR_PALETTE[idx % COLOR_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 20 Points AI Explanation Section */}
            <div className="explanations-card">
              <h3><FileText size={18} /> AI DASHBOARD EXPLANATION (20 KEY POINTS)</h3>
              <div className="explanations-grid">
                {explanations.map((pt, idx) => (
                  <div className="explanation-item" key={idx}>
                    <span className="point-num">{idx + 1}</span>
                    <p>{typeof pt === 'string' ? pt.replace(/^\d+\.\s*/, '') : pt}</p>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}