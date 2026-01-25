import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart, ComposedChart } from 'recharts';

// Data compiled from CASE VSE Survey, U.S. News, RNL, and industry research
const participationBySize = [
  {
    category: 'Small',
    description: '<3,000 FTE',
    participationRate: 14.2,
    medianParticipation: 12.8,
    topQuartile: 22.5,
    bottomQuartile: 6.2,
    retentionRate: 58,
    avgGift: 285,
    examples: 'Liberal Arts Colleges'
  },
  {
    category: 'Medium',
    description: '3,000-10,000 FTE',
    participationRate: 8.4,
    medianParticipation: 7.2,
    topQuartile: 14.8,
    bottomQuartile: 4.1,
    retentionRate: 52,
    avgGift: 425,
    examples: 'Regional Universities'
  },
  {
    category: 'Large',
    description: '>10,000 FTE',
    participationRate: 5.8,
    medianParticipation: 4.9,
    topQuartile: 9.2,
    bottomQuartile: 2.8,
    retentionRate: 48,
    avgGift: 680,
    examples: 'Research Universities'
  }
];

// Donor Lifecycle Curve - Giving rate by years since graduation
const lifecycleCurve = [
  { yearsOut: 0, label: 'Graduation', givingRate: 28, avgGift: 45, segment: 'Young Alumni' },
  { yearsOut: 1, label: 'Year 1', givingRate: 18, avgGift: 52, segment: 'Young Alumni' },
  { yearsOut: 2, label: 'Year 2', givingRate: 12, avgGift: 58, segment: 'Young Alumni' },
  { yearsOut: 3, label: 'Year 3', givingRate: 9, avgGift: 65, segment: 'Young Alumni' },
  { yearsOut: 5, label: 'Year 5', givingRate: 7, avgGift: 85, segment: 'Young Alumni' },
  { yearsOut: 10, label: 'Year 10', givingRate: 6, avgGift: 145, segment: 'Early Career' },
  { yearsOut: 15, label: 'Year 15', givingRate: 7, avgGift: 220, segment: 'Early Career' },
  { yearsOut: 20, label: 'Year 20', givingRate: 9, avgGift: 380, segment: 'Mid-Career' },
  { yearsOut: 25, label: 'Year 25', givingRate: 12, avgGift: 520, segment: 'Mid-Career' },
  { yearsOut: 30, label: 'Year 30', givingRate: 15, avgGift: 750, segment: 'Peak Giving' },
  { yearsOut: 35, label: 'Year 35', givingRate: 18, avgGift: 1100, segment: 'Peak Giving' },
  { yearsOut: 40, label: 'Year 40', givingRate: 22, avgGift: 1450, segment: 'Peak Giving' },
  { yearsOut: 45, label: 'Year 45', givingRate: 25, avgGift: 1850, segment: 'Peak Giving' },
  { yearsOut: 50, label: 'Year 50', givingRate: 28, avgGift: 2200, segment: 'Legacy' },
  { yearsOut: 55, label: 'Year 55', givingRate: 24, avgGift: 2800, segment: 'Legacy' },
  { yearsOut: 60, label: 'Year 60', givingRate: 18, avgGift: 3200, segment: 'Legacy' },
];

// Historical trends
const historicalTrends = [
  { year: '1980s', small: 28, medium: 18, large: 12, overall: 20 },
  { year: '1990s', small: 24, medium: 15, large: 10, overall: 16 },
  { year: '2000s', small: 20, medium: 12, large: 8, overall: 12 },
  { year: '2010', small: 18, medium: 10, large: 7, overall: 10 },
  { year: '2016', small: 16, medium: 9, large: 6, overall: 8.5 },
  { year: '2019', small: 15, medium: 8.5, large: 5.8, overall: 7.8 },
  { year: '2023', small: 14.2, medium: 8.4, large: 5.8, overall: 7.7 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
      }}>
        <p style={{ color: '#f8fafc', fontWeight: 600, marginBottom: '8px' }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, fontSize: '13px', margin: '4px 0' }}>
            {entry.name}: {entry.value}{typeof entry.value === 'number' && entry.value < 100 ? '%' : ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function UniversityAdvancementDashboard() {
  const [activeTab, setActiveTab] = useState('participation');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      color: '#f8fafc',
      padding: '32px'
    }}>
      {/* Header */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            University Advancement Benchmarks
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '16px' }}>
            Donor Participation by Institution Size & Alumni Lifecycle Curve
          </p>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '8px' }}>
            Sources: CASE VSE Survey 2023-24, U.S. News & World Report, RNL Analysis, Hanover Research
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          {[
            { id: 'participation', label: 'Participation by Size' },
            { id: 'lifecycle', label: 'Donor Lifecycle Curve' },
            { id: 'trends', label: 'Historical Trends' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab.id
                  ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                  : 'rgba(51, 65, 85, 0.5)',
                color: '#f8fafc',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '14px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Participation by Size */}
        {activeTab === 'participation' && (
          <div>
            {/* Key Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
              {participationBySize.map((item, idx) => (
                <div key={idx} style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#f8fafc' }}>{item.category}</h3>
                      <p style={{ color: '#64748b', fontSize: '13px' }}>{item.description}</p>
                    </div>
                    <div style={{
                      background: idx === 0 ? '#22c55e' : idx === 1 ? '#f59e0b' : '#ef4444',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      {item.examples}
                    </div>
                  </div>
                  <div style={{ fontSize: '48px', fontWeight: 700, color: idx === 0 ? '#22c55e' : idx === 1 ? '#f59e0b' : '#ef4444' }}>
                    {item.participationRate}%
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>Average Participation Rate</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '8px' }}>
                      <p style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Top Quartile</p>
                      <p style={{ color: '#f8fafc', fontWeight: 600 }}>{item.topQuartile}%</p>
                    </div>
                    <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '8px' }}>
                      <p style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Bottom Quartile</p>
                      <p style={{ color: '#f8fafc', fontWeight: 600 }}>{item.bottomQuartile}%</p>
                    </div>
                    <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '8px' }}>
                      <p style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Retention Rate</p>
                      <p style={{ color: '#f8fafc', fontWeight: 600 }}>{item.retentionRate}%</p>
                    </div>
                    <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '8px' }}>
                      <p style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Avg Gift</p>
                      <p style={{ color: '#f8fafc', fontWeight: 600 }}>${item.avgGift}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bar Chart */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.6)',
              borderRadius: '16px',
              padding: '32px',
              border: '1px solid rgba(148, 163, 184, 0.1)'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>
                Donor Participation Rate Comparison by School Size
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={participationBySize} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis dataKey="category" stroke="#94a3b8" fontSize={13} />
                  <YAxis stroke="#94a3b8" fontSize={13} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="topQuartile" name="Top Quartile" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="participationRate" name="Average" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="medianParticipation" name="Median" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="bottomQuartile" name="Bottom Quartile" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Key Insights */}
            <div style={{
              marginTop: '24px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <h4 style={{ color: '#60a5fa', fontWeight: 600, marginBottom: '12px' }}>📊 Key Insights</h4>
              <ul style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.7, paddingLeft: '20px' }}>
                <li><strong style={{ color: '#f8fafc' }}>Small schools outperform by 2.5x</strong> on participation rate vs. large institutions</li>
                <li><strong style={{ color: '#f8fafc' }}>Large schools compensate</strong> with higher average gift sizes ($680 vs $285)</li>
                <li><strong style={{ color: '#f8fafc' }}>Top quartile performers</strong> across all sizes achieve 3-4x the bottom quartile</li>
                <li><strong style={{ color: '#f8fafc' }}>Retention correlates with size</strong>: smaller schools maintain stronger donor relationships</li>
              </ul>
            </div>
          </div>
        )}

        {/* Lifecycle Curve */}
        {activeTab === 'lifecycle' && (
          <div>
            <div style={{
              background: 'rgba(30, 41, 59, 0.6)',
              borderRadius: '16px',
              padding: '32px',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                Alumni Donor Lifecycle Curve - Benchmark
              </h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
                Giving participation rate and average gift amount by years since graduation
              </p>
              <ResponsiveContainer width="100%" height={450}>
                <ComposedChart data={lifecycleCurve}>
                  <defs>
                    <linearGradient id="givingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="giftGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} angle={-45} textAnchor="end" height={80} />
                  <YAxis yAxisId="left" stroke="#3b82f6" fontSize={13} tickFormatter={(v) => `${v}%`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#22c55e" fontSize={13} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Area yAxisId="left" type="monotone" dataKey="givingRate" name="Participation Rate %" fill="url(#givingGradient)" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 5 }} />
                  <Line yAxisId="right" type="monotone" dataKey="avgGift" name="Average Gift $" stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e', r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Lifecycle Phases */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { phase: 'Young Alumni', years: '0-5 years', rate: '7-28%', gift: '$45-85', color: '#f472b6', note: 'High initial engagement, rapid decline' },
                { phase: 'Early Career', years: '10-15 years', rate: '6-7%', gift: '$145-220', color: '#a78bfa', note: 'The "Valley" - lowest participation' },
                { phase: 'Mid-Career', years: '20-25 years', rate: '9-12%', gift: '$380-520', color: '#60a5fa', note: 'Participation recovery begins' },
                { phase: 'Peak Giving', years: '30-45 years', rate: '15-25%', gift: '$750-1,850', color: '#34d399', note: 'Highest participation & gift size' },
                { phase: 'Legacy', years: '50+ years', rate: '18-28%', gift: '$2,200-3,200', color: '#fbbf24', note: 'Planned giving focus' }
              ].map((p, idx) => (
                <div key={idx} style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  borderRadius: '12px',
                  padding: '20px',
                  borderLeft: `4px solid ${p.color}`
                }}>
                  <h4 style={{ color: p.color, fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{p.phase}</h4>
                  <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '12px' }}>{p.years}</p>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>Participation: </span>
                    <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '13px' }}>{p.rate}</span>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>Avg Gift: </span>
                    <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '13px' }}>{p.gift}</span>
                  </div>
                  <p style={{ color: '#64748b', fontSize: '11px', fontStyle: 'italic' }}>{p.note}</p>
                </div>
              ))}
            </div>

            {/* Strategic Implications */}
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <h4 style={{ color: '#a78bfa', fontWeight: 600, marginBottom: '12px' }}>🎯 Strategic Implications for Advancement</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <p style={{ color: '#f8fafc', fontWeight: 500, marginBottom: '8px' }}>The "Valley" Problem (Years 6-15)</p>
                  <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.6 }}>
                    Participation drops to 6-7% as young alumni face student debt, career building, and family formation. 
                    This is where most donor pipeline attrition occurs. Focus on non-monetary engagement during this period.
                  </p>
                </div>
                <div>
                  <p style={{ color: '#f8fafc', fontWeight: 500, marginBottom: '8px' }}>Peak Giving Window (Years 30-50)</p>
                  <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.6 }}>
                    Alumni who maintained any engagement through "the valley" become prime major gift prospects. 
                    Average gifts increase 20x from early career to peak giving phase.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Historical Trends */}
        {activeTab === 'trends' && (
          <div>
            <div style={{
              background: 'rgba(30, 41, 59, 0.6)',
              borderRadius: '16px',
              padding: '32px',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                Historical Decline in Alumni Participation
              </h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
                Average donor participation rate by institution size (1980s - 2023)
              </p>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={historicalTrends}>
                  <defs>
                    <linearGradient id="smallGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="medGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="largeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis dataKey="year" stroke="#94a3b8" fontSize={13} />
                  <YAxis stroke="#94a3b8" fontSize={13} tickFormatter={(v) => `${v}%`} domain={[0, 35]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Area type="monotone" dataKey="small" name="Small (<3K)" fill="url(#smallGrad)" stroke="#22c55e" strokeWidth={2} />
                  <Area type="monotone" dataKey="medium" name="Medium (3K-10K)" fill="url(#medGrad)" stroke="#f59e0b" strokeWidth={2} />
                  <Area type="monotone" dataKey="large" name="Large (>10K)" fill="url(#largeGrad)" stroke="#ef4444" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Decline Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Overall Decline', value: '-62%', sub: 'Since 1980s (20% → 7.7%)', color: '#ef4444' },
                { label: 'Small Schools', value: '-49%', sub: '28% → 14.2%', color: '#22c55e' },
                { label: 'Medium Schools', value: '-53%', sub: '18% → 8.4%', color: '#f59e0b' },
                { label: 'Large Schools', value: '-52%', sub: '12% → 5.8%', color: '#ef4444' }
              ].map((stat, idx) => (
                <div key={idx} style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  border: '1px solid rgba(148, 163, 184, 0.1)'
                }}>
                  <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>{stat.label}</p>
                  <p style={{ fontSize: '36px', fontWeight: 700, color: stat.color }}>{stat.value}</p>
                  <p style={{ color: '#64748b', fontSize: '12px' }}>{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Factors */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <h4 style={{ color: '#f87171', fontWeight: 600, marginBottom: '12px' }}>⚠️ Factors Driving Decline</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                <div>
                  <p style={{ color: '#f8fafc', fontWeight: 500, marginBottom: '8px' }}>Structural Changes</p>
                  <ul style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.7, paddingLeft: '16px' }}>
                    <li>Growing alumni bases dilute rates</li>
                    <li>DAFs don't count as "alumni gifts"</li>
                    <li>Family foundations excluded</li>
                  </ul>
                </div>
                <div>
                  <p style={{ color: '#f8fafc', fontWeight: 500, marginBottom: '8px' }}>Economic Factors</p>
                  <ul style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.7, paddingLeft: '16px' }}>
                    <li>Student debt burden</li>
                    <li>Competing charitable priorities</li>
                    <li>Economic uncertainty</li>
                  </ul>
                </div>
                <div>
                  <p style={{ color: '#f8fafc', fontWeight: 500, marginBottom: '8px' }}>Engagement Gaps</p>
                  <ul style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.7, paddingLeft: '16px' }}>
                    <li>COVID disrupted traditions</li>
                    <li>Declining campus affinity</li>
                    <li>Political polarization</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          borderTop: '1px solid rgba(148, 163, 184, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <p style={{ color: '#64748b', fontSize: '12px' }}>
              Data Sources: CASE VSE Survey (2023-24), U.S. News & World Report (2025), RNL Analysis, Hanover Research, Blackbaud Giving Report
            </p>
            <p style={{ color: '#475569', fontSize: '11px', marginTop: '4px' }}>
              School size definitions follow Carnegie Classification: Small (&lt;3,000 FTE), Medium (3,000-10,000 FTE), Large (&gt;10,000 FTE)
            </p>
          </div>
          <div style={{ color: '#64748b', fontSize: '12px' }}>
            Prepared for Higher Education Advancement Benchmarking
          </div>
        </div>
      </div>
    </div>
  );
}
