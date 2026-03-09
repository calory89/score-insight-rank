import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, Server, CheckCircle2, XCircle, Clock, 
  TrendingUp, AlertTriangle, Users, Zap, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface SystemMetrics {
  totalErrors24h: number;
  errorsByType: { type: string; count: number }[];
  avgResponseTime: number;
  successRate: number;
  activeSessions: number;
  analysesLast24h: number;
}

const AdminSystemPanel = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: metrics, isLoading, refetch } = useQuery({
    queryKey: ["admin-system-metrics"],
    queryFn: async (): Promise<SystemMetrics> => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Fetch error logs for last 24h
      const { data: errors } = await supabase
        .from("error_logs")
        .select("error_type, metadata, created_at")
        .gte("created_at", yesterday.toISOString());

      // Fetch active sessions (unique sessions in last 30 min)
      const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const { data: sessions } = await supabase
        .from("page_visits")
        .select("session_id")
        .gte("created_at", thirtyMinsAgo.toISOString());

      // Fetch analyses last 24h
      const { count: analysesCount } = await supabase
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .gte("created_at", yesterday.toISOString());

      // Calculate metrics
      const errorsByType = (errors || []).reduce((acc: Record<string, number>, e) => {
        acc[e.error_type] = (acc[e.error_type] || 0) + 1;
        return acc;
      }, {});

      const uniqueSessions = new Set((sessions || []).map(s => s.session_id)).size;
      
      // Calculate success rate (analyses / (analyses + errors))
      const totalAttempts = (analysesCount || 0) + (errors?.length || 0);
      const successRate = totalAttempts > 0 
        ? Math.round(((analysesCount || 0) / totalAttempts) * 100)
        : 100;

      // Extract avg response time from metadata if available
      const responseTimes = (errors || [])
        .filter(e => e.metadata && typeof e.metadata === 'object' && 'response_time_ms' in (e.metadata as object))
        .map(e => (e.metadata as { response_time_ms: number }).response_time_ms);
      
      const avgResponseTime = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;

      return {
        totalErrors24h: errors?.length || 0,
        errorsByType: Object.entries(errorsByType)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count),
        avgResponseTime,
        successRate,
        activeSessions: uniqueSessions,
        analysesLast24h: analysesCount || 0,
      };
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const statusCards = [
    {
      icon: CheckCircle2,
      label: "Success Rate",
      value: `${metrics?.successRate || 0}%`,
      color: (metrics?.successRate || 0) >= 90 ? "text-green-500" : 
             (metrics?.successRate || 0) >= 70 ? "text-yellow-500" : "text-destructive",
      bgColor: (metrics?.successRate || 0) >= 90 ? "bg-green-500/10" : 
               (metrics?.successRate || 0) >= 70 ? "bg-yellow-500/10" : "bg-destructive/10",
    },
    {
      icon: Zap,
      label: "Analyses (24h)",
      value: metrics?.analysesLast24h || 0,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: AlertTriangle,
      label: "Errors (24h)",
      value: metrics?.totalErrors24h || 0,
      color: (metrics?.totalErrors24h || 0) > 10 ? "text-destructive" : "text-muted-foreground",
      bgColor: (metrics?.totalErrors24h || 0) > 10 ? "bg-destructive/10" : "bg-secondary",
    },
    {
      icon: Users,
      label: "Active Sessions",
      value: metrics?.activeSessions || 0,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            System Health
          </h3>
          <p className="text-sm text-muted-foreground">Real-time platform metrics</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statusCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-xl border border-border p-4 ${card.bgColor}`}
          >
            <card.icon className={`h-5 w-5 mb-2 ${card.color}`} />
            <p className={`text-2xl font-bold font-mono ${card.color}`}>{card.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Error Breakdown */}
      {metrics?.errorsByType && metrics.errorsByType.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Error Breakdown (24h)
          </h4>
          <div className="space-y-3">
            {metrics.errorsByType.slice(0, 5).map((item) => (
              <div key={item.type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-3.5 w-3.5 text-destructive/60" />
                  <span className="text-sm text-foreground">{item.type.replace(/_/g, " ")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-destructive/60 rounded-full transition-all"
                      style={{ 
                        width: `${Math.min(100, (item.count / (metrics.totalErrors24h || 1)) * 100)}%` 
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Status */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Service Status
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { name: "API", status: "operational" },
            { name: "Database", status: "operational" },
            { name: "AI Analysis", status: (metrics?.successRate || 0) >= 70 ? "operational" : "degraded" },
            { name: "Scraping", status: (metrics?.totalErrors24h || 0) < 20 ? "operational" : "degraded" },
          ].map((service) => (
            <div key={service.name} className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${
                service.status === "operational" ? "bg-green-500" : 
                service.status === "degraded" ? "bg-yellow-500 animate-pulse" : "bg-destructive"
              }`} />
              <span className="text-xs text-foreground">{service.name}</span>
              <span className={`text-[10px] ml-auto ${
                service.status === "operational" ? "text-green-500" : "text-yellow-500"
              }`}>
                {service.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminSystemPanel;
