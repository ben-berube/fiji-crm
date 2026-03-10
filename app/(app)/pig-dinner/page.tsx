"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Ticket,
  Upload,
  CalendarClock,
  Users,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Phone,
  Mail,
  Loader2,
  Search,
  Link2,
} from "lucide-react";

interface MemberInfo {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface ClassYear {
  year: number;
  total: number;
  ticketCount: number;
  hasTicket: MemberInfo[];
  needsTicket: MemberInfo[];
}

interface UnmatchedBuyer {
  name: string;
  email: string;
  purchaseDate: string;
}

interface PigDinnerData {
  stats: {
    ticketsSold: number;
    matchedCount: number;
    daysUntilEvent: number;
    eventDate: string;
    lastUpdated: string | null;
  };
  classByYear: ClassYear[];
  unmatchedBuyers: UnmatchedBuyer[];
}

interface UploadResult {
  total: number;
  newTickets?: number;
  matched: number;
  unmatched: number;
  unmatchedNames: string[];
}

interface DirectoryMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  graduationYear: number | null;
}

export default function PigDinnerPage() {
  const [data, setData] = useState<PigDinnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [expandedClasses, setExpandedClasses] = useState<Set<number>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [matchDialogBuyer, setMatchDialogBuyer] = useState<UnmatchedBuyer | null>(null);
  const [matchSearch, setMatchSearch] = useState("");
  const [matchResults, setMatchResults] = useState<DirectoryMember[]>([]);
  const [matchSearching, setMatchSearching] = useState(false);
  const [matching, setMatching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const matchSearchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/pig-dinner");
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error("Failed to load pig dinner data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/pig-dinner/upload", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (res.ok) {
        setUploadResult(result);
        await fetchData();
      } else {
        setUploadResult({ total: 0, matched: 0, unmatched: 0, unmatchedNames: [result.error || "Upload failed"] });
      }
    } catch {
      setUploadResult({ total: 0, matched: 0, unmatched: 0, unmatchedNames: ["Network error"] });
    } finally {
      setUploading(false);
    }
  }

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
      handleUpload(file);
    }
  }

  function toggleClass(year: number) {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  function openMatchDialog(buyer: UnmatchedBuyer) {
    setMatchDialogBuyer(buyer);
    setMatchSearch(buyer.name);
    setMatchResults([]);
    searchDirectory(buyer.name);
  }

  function searchDirectory(query: string) {
    if (matchSearchTimer.current) clearTimeout(matchSearchTimer.current);
    if (query.trim().length < 2) {
      setMatchResults([]);
      return;
    }
    setMatchSearching(true);
    matchSearchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/members?search=${encodeURIComponent(query.trim())}&limit=10`);
        if (res.ok) {
          const json = await res.json();
          const members = json.members ?? json;
          setMatchResults(Array.isArray(members) ? members : []);
        }
      } catch {
        setMatchResults([]);
      } finally {
        setMatchSearching(false);
      }
    }, 250);
  }

  function onMatchSearchChange(value: string) {
    setMatchSearch(value);
    searchDirectory(value);
  }

  async function confirmMatch(memberId: string) {
    if (!matchDialogBuyer) return;
    setMatching(true);
    try {
      const res = await fetch("/api/pig-dinner/match", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketEmail: matchDialogBuyer.email,
          memberId,
        }),
      });
      if (res.ok) {
        setMatchDialogBuyer(null);
        await fetchData();
      }
    } catch (err) {
      console.error("Match failed:", err);
    } finally {
      setMatching(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = data?.stats;
  const classByYear = data?.classByYear ?? [];
  const unmatchedBuyers = data?.unmatchedBuyers ?? [];

  const totalTracked = classByYear.reduce((s, c) => s + c.total, 0);
  const totalWithTicket = classByYear.reduce((s, c) => s + c.ticketCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Ticket className="h-6 w-6 text-fiji-gold" />
            Pig Dinner 2026
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            March 21, 2026 &mdash; Track ticket purchases and coordinate outreach
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={onFileSelect}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Importing..." : "Upload CSV"}
          </Button>
        </div>
      </div>

      {/* Upload Result Toast */}
      {uploadResult && (
        <Card className={uploadResult.total > 0 ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950" : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"}>
          <CardContent className="py-3">
            {uploadResult.total > 0 ? (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Processed {uploadResult.total} tickets{uploadResult.newTickets ? ` (${uploadResult.newTickets} new)` : ""} &mdash; {uploadResult.matched} matched, {uploadResult.unmatched} unmatched
                  </p>
                  {uploadResult.unmatchedNames.length > 0 && (
                    <p className="text-green-700 dark:text-green-300 mt-1">
                      Unmatched: {uploadResult.unmatchedNames.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  {uploadResult.unmatchedNames[0] || "Upload failed"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fiji-gold/10">
                <Ticket className="h-5 w-5 text-fiji-gold" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.ticketsSold ?? 0}</p>
                <p className="text-xs text-muted-foreground">Tickets Sold</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {totalWithTicket} <span className="text-sm font-normal text-muted-foreground">/ {totalTracked}</span>
                </p>
                <p className="text-xs text-muted-foreground">Alumni with Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalTracked - totalWithTicket}</p>
                <p className="text-xs text-muted-foreground">Still Need Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
                <CalendarClock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.daysUntilEvent ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Days Remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drag-and-Drop Zone (shown when no tickets yet) */}
      {(stats?.ticketsSold ?? 0) === 0 && (
        <Card
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed transition-colors ${
            dragOver
              ? "border-fiji-gold bg-fiji-gold/5"
              : "border-muted-foreground/25"
          }`}
        >
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Drop your ticket purchase CSV here, or click &ldquo;Upload CSV&rdquo; above
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Exported from your ticket vendor (Numbers/Excel format)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Class-by-Class Outreach */}
      {classByYear.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Class-by-Class Breakdown</h2>
          {classByYear.map((cls) => {
            const expanded = expandedClasses.has(cls.year);
            const pct = cls.total > 0 ? Math.round((cls.ticketCount / cls.total) * 100) : 0;

            return (
              <Card key={cls.year}>
                <button
                  onClick={() => toggleClass(cls.year)}
                  className="w-full text-left"
                >
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <CardTitle className="text-base">
                          Class of {cls.year}
                        </CardTitle>
                        <Badge
                          variant="secondary"
                          className={
                            pct === 100
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : pct >= 50
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }
                        >
                          {cls.ticketCount} / {cls.total} ({pct}%)
                        </Badge>
                      </div>
                      {cls.needsTicket.length > 0 && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {cls.needsTicket.length} need{cls.needsTicket.length === 1 ? "s" : ""} outreach
                        </span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct === 100
                            ? "bg-green-500"
                            : pct >= 50
                              ? "bg-yellow-500"
                              : "bg-red-400"
                        }`}
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </CardHeader>
                </button>

                {expanded && (
                  <CardContent className="pt-0 pb-4 px-4">
                    {/* Needs Ticket (prominent) */}
                    {cls.needsTicket.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Needs Ticket ({cls.needsTicket.length})
                        </h4>
                        <div className="rounded-lg border border-red-200 dark:border-red-900 overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cls.needsTicket.map((m) => (
                                <TableRow key={m.id}>
                                  <TableCell className="font-medium">{m.name}</TableCell>
                                  <TableCell>
                                    <a href={`mailto:${m.email}`} className="text-primary hover:underline inline-flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {m.email}
                                    </a>
                                  </TableCell>
                                  <TableCell>
                                    {m.phone ? (
                                      <a href={`tel:${m.phone}`} className="text-primary hover:underline inline-flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {m.phone}
                                      </a>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Has Ticket */}
                    {cls.hasTicket.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Has Ticket ({cls.hasTicket.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {cls.hasTicket.map((m) => (
                            <Badge key={m.id} variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                              {m.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {cls.needsTicket.length === 0 && cls.hasTicket.length === 0 && (
                      <p className="text-sm text-muted-foreground py-2">
                        No members in this class year.
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Unmatched Buyers */}
      {unmatchedBuyers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Unmatched Ticket Buyers ({unmatchedBuyers.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              These people bought tickets but couldn&apos;t be matched to a CRM member. Click &ldquo;Match&rdquo; to link them to a directory entry.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unmatchedBuyers.map((b, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(b.purchaseDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openMatchDialog(b)}
                      >
                        <Link2 className="mr-1.5 h-3 w-3" />
                        Match
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Match Dialog */}
      <Dialog
        open={!!matchDialogBuyer}
        onOpenChange={(open) => { if (!open) setMatchDialogBuyer(null); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Match Ticket Buyer</DialogTitle>
            <DialogDescription>
              Link <span className="font-medium text-foreground">{matchDialogBuyer?.name}</span> ({matchDialogBuyer?.email}) to a member in the directory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={matchSearch}
                onChange={(e) => onMatchSearchChange(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="max-h-[280px] overflow-y-auto rounded-lg border">
              {matchSearching && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!matchSearching && matchResults.length === 0 && matchSearch.trim().length >= 2 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No members found
                </p>
              )}
              {!matchSearching && matchResults.map((m) => (
                <button
                  key={m.id}
                  onClick={() => confirmMatch(m.id)}
                  disabled={matching}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors border-b last:border-b-0 disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.firstName} {m.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                  {m.graduationYear && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      &apos;{String(m.graduationYear).slice(-2)}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Last Updated */}
      {stats?.lastUpdated && (
        <p className="text-xs text-muted-foreground text-center pb-4">
          Last CSV import: {new Date(stats.lastUpdated).toLocaleString()}
        </p>
      )}
    </div>
  );
}
