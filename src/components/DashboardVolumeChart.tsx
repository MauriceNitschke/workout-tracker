import React from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface DashboardVolumePoint {
  weekLabel: string;
  volumeKg: number;
  status: string;
}

export function DashboardVolumeChart({ data }: { data: DashboardVolumePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="weekLabel" stroke="#52525b" fontSize={10} tickLine={false} />
        <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            borderColor: '#27272a',
            fontSize: '12px',
            color: '#f4f4f5',
            borderRadius: '8px',
          }}
          formatter={(value) => [`${Number(value)} kg`, 'Total Volume']}
        />
        <Area
          type="monotone"
          dataKey="volumeKg"
          stroke="#10b981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#volumeGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
