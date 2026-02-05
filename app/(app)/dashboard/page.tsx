"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  GraduationCap,
  MessageSquare,
  Search,
  Plus,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Dynamic import for the map component (SSR disabled - uses browser APIs)
const USHeatmap = dynamic(
  () => import("@/components/ui/us-heatmap").then((mod) => mod.USHeatmap),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  }
);

interface DashboardData {
  counts: {
    total: number;
    active: number;
    alumni: number;
    inactive: number;
  };
  industries: { name: string; count: number }[];
  states: { name: string; count: number }[];
  recentMembers: {
    id: string;
    firstName: string;
    lastName: string;
    status: string;
    createdAt: string;
  }[];
  messageCount: number;
}

const CHART_COLORS = [
  "#3D1F6F",
  "#5B3A8C",
  "#C4A747",
  "#D4BE6A",
  "#7B5EA7",
  "#8E6CB8",
  "#A88E3A",
  "#9370C0",
  "#B8A055",
  "#6A4D9A",
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      setData(json);
      setLoading(false);
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const statusData = [
    { name: "Active", value: data.counts.active },
    { name: "Alumni", value: data.counts.alumni },
    { name: "Inactive", value: data.counts.inactive },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Chapter overview at a glance
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/chat">
            <Button variant="outline" size="sm">
              <Search className="mr-2 h-4 w-4" />
              AI Search
            </Button>
          </Link>
          <Link href="/directory">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Brother
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Brothers
                </p>
                <p className="text-3xl font-bold">{data.counts.total}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Members
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {data.counts.active}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Alumni
                </p>
                <p className="text-3xl font-bold text-fiji-gold">
                  {data.counts.alumni}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-fiji-gold/10">
                <GraduationCap className="h-6 w-6 text-fiji-gold" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Messages Sent
                </p>
                <p className="text-3xl font-bold">{data.messageCount}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Industry Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Industry Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {data.industries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No industry data yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.industries}
                  layout="vertical"
                  margin={{ left: 20, right: 20, top: 5, bottom: 5 }}
                >
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3D1F6F" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Member Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No members yet
              </p>
            ) : (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Geographic Distribution - US Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Geographic Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {data.states.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No location data yet
              </p>
            ) : (
              <USHeatmap data={data.states} />
            )}
          </CardContent>
        </Card>

        {/* Recent Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Additions</CardTitle>
              <Link href="/directory">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No members yet
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentMembers.map((m) => (
                  <Link
                    key={m.id}
                    href={`/directory/${m.id}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {m.firstName} {m.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added{" "}
                        {new Date(m.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        m.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : m.status === "ALUMNI"
                          ? "bg-fiji-gold/20 text-fiji-purple-dark"
                          : "bg-gray-100 text-gray-600"
                      }
                    >
                      {m.status.charAt(0) + m.status.slice(1).toLowerCase()}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
