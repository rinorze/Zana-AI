"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminAnalytics, type AnalyticsSummary } from "@/lib/api";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminAnalytics().then(setData).catch((err) => setError(String(err)));
  }, []);

  if (error) return <p className="text-ek-danger">{error}</p>;
  if (!data) return <p className="ek-text-muted">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="ek-page-title text-2xl">Analitika</h1>

      <div className="grid gap-3 md:grid-cols-3">
        <Stat title="Pyetje totale" value={data.total_queries} />
        <Stat title="Pa match" value={data.no_match_count} />
        <Stat title="No-match rate" value={`${Math.round(data.no_match_rate * 100)}%`} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top pyetjet</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {data.top_queries.map((q) => (
                  <tr key={q.query} className="border-b last:border-0">
                    <td className="py-1 pr-2 truncate max-w-[260px]">{q.query}</td>
                    <td className="py-1 text-right text-muted-foreground">{q.count}</td>
                  </tr>
                ))}
                {data.top_queries.length === 0 && (
                  <tr>
                    <td className="py-2 text-muted-foreground">Asnjë pyetje e regjistruar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pa match</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {data.top_no_match.map((q) => (
                  <tr key={q.query} className="border-b last:border-0">
                    <td className="py-1 pr-2 truncate max-w-[260px]">{q.query}</td>
                    <td className="py-1 text-right text-muted-foreground">{q.count}</td>
                  </tr>
                ))}
                {data.top_no_match.length === 0 && (
                  <tr>
                    <td className="py-2 text-muted-foreground">Asnjë.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sipas rolit</CardTitle>
          </CardHeader>
          <CardContent>
            <KeyValue map={data.by_role} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sipas gjuhës</CardTitle>
          </CardHeader>
          <CardContent>
            <KeyValue map={data.by_language} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function KeyValue({ map }: { map: Record<string, number> }) {
  const entries = Object.entries(map);
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <table className="w-full text-sm">
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k} className="border-b last:border-0">
            <td className="py-1 capitalize">{k}</td>
            <td className="py-1 text-right text-muted-foreground">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
