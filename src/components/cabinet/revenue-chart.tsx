"use client";

import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type RevenueData = {
  month: string;
  facture: number;
  encaisse: number;
};

function formatCAD(value: number) {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function RevenueChart({ data }: { data: RevenueData[] }) {
  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="20%">
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          />
          <Tooltip
            cursor={{ fill: "transparent" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-background)",
              fontSize: 13,
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => formatCAD(Number(value))}
          />
          <Bar
            dataKey="facture"
            name="Facturé"
            fill="var(--color-neutral-300)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="encaisse"
            name="Encaissé"
            fill="var(--color-neutral-900)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
