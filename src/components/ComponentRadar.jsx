import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Legend, ResponsiveContainer, Tooltip,
} from 'recharts'
import { FALLBACK_COMPONENT_LABELS } from './primitives'

export default function ComponentRadar({ components = {} }) {
  // Build labels from data — no hardcoded map needed
  const keys = Object.keys(components).length > 0 ? Object.keys(components) : ['A','B','C','D','E','F']
  const data = keys.map(key => {
    const comp = components[key] || {}
    return {
      subject: comp.label || FALLBACK_COMPONENT_LABELS[key] || key,
      Delphi: Math.round((comp.weight_delphi || 0) * 1000) / 10,
      Adapted: Math.round((comp.weight_adapted || 0) * 1000) / 10,
      Health: Math.round(comp.normalized || 0),
    }
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Radar — weights */}
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} margin={{ top: 4, right: 24, bottom: 4, left: 24 }}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 30]}
            tick={{ fill: '#4b5563', fontSize: 8 }}
            tickCount={4}
          />
          <Tooltip
            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, fontSize: 11 }}
            labelStyle={{ color: '#e5e7eb' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
          <Radar
            name="Delphi"
            dataKey="Delphi"
            stroke="#6b7280"
            fill="#6b7280"
            fillOpacity={0.15}
            strokeWidth={1.5}
          />
          <Radar
            name="Adapted"
            dataKey="Adapted"
            stroke="#2563eb"
            fill="#2563eb"
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Component health table */}
      <div className="grid grid-cols-3 gap-1.5">
        {Object.entries(components).map(([key, c]) => (
          <div key={key} className="bg-gray-800 rounded p-2 text-xs">
            <div className="text-gray-400 font-medium">{c.label || FALLBACK_COMPONENT_LABELS[key] || key}</div>
            <div className="text-white font-bold mt-0.5">{c.normalized ?? '—'}%</div>
            <div
              className="mt-1 h-1 rounded-full"
              style={{
                background: `linear-gradient(to right, ${healthColor(c.normalized)} ${c.normalized}%, #374151 ${c.normalized}%)`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function healthColor(v) {
  if (v >= 70) return '#16a34a'
  if (v >= 40) return '#ca8a04'
  return '#dc2626'
}
