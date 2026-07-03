"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

type Point = { month: string; label: string; expense: number; income: number };

export function TrendChart({
  data,
  activeMonth,
}: {
  data: Point[];
  activeMonth: string;
}) {
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            stroke="#a3a3a3"
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.03)" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e5e5e5",
              fontSize: 12,
            }}
            formatter={(value) => formatCurrency(Number(value))}
          />
          <Bar dataKey="expense" radius={[6, 6, 0, 0]} maxBarSize={38}>
            {data.map((d) => (
              <Cell
                key={d.month}
                fill={d.month === activeMonth ? "#171717" : "#d4d4d4"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
