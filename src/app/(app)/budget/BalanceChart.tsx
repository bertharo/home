"use client";

import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export type BalancePoint = {
  month: string;
  label: string;
  revenue: number;
  expenses: number;
  remaining: number;
};

export function BalanceChart({ data }: { data: BalancePoint[] }) {
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
        >
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            stroke="#a3a3a3"
          />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.03)" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e5e5e5",
              fontSize: 12,
            }}
            formatter={(value, name) => [
              formatCurrency(Number(value)),
              String(name),
            ]}
          />
          <Bar
            dataKey="revenue"
            name="Revenue"
            fill="#34d399"
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
          />
          <Bar
            dataKey="expenses"
            name="Expenses"
            fill="#fca5a5"
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
          />
          <Line
            type="monotone"
            dataKey="remaining"
            name="Remaining"
            stroke="#171717"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "#171717" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
