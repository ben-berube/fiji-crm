"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberCard } from "@/components/members/member-card";
import { MemberForm } from "@/components/members/member-form";
import {
  Search,
  Plus,
  Users,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  company?: string | null;
  jobTitle?: string | null;
  industry?: string | null;
  city?: string | null;
  state?: string | null;
  graduationYear?: number | null;
  tags: { id: string; name: string }[];
  isIndexed?: boolean;
}

interface Filters {
  industries: string[];
  states: string[];
  years: number[];
  tags: string[];
}

interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
  indexing?: number;
  errors: string[];
}

export default function DirectoryPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [filters, setFilters] = useState<Filters>({
    industries: [],
    states: [],
    years: [],
    tags: [],
  });
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  // Import state
  const [importOpen, setImportOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (industryFilter) params.set("industry", industryFilter);
    if (stateFilter) params.set("state", stateFilter);
    if (yearFilter) params.set("year", yearFilter);
    params.set("page", page.toString());

    const res = await fetch(`/api/members?${params}`);
    const data = await res.json();
    setMembers(data.members);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setLoading(false);
  }, [search, statusFilter, industryFilter, stateFilter, yearFilter, page]);

  const fetchFilters = useCallback(async () => {
    const res = await fetch("/api/members/filters");
    const data = await res.json();
    setFilters(data);
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    const timeout = setTimeout(fetchMembers, 300);
    return () => clearTimeout(timeout);
  }, [fetchMembers]);

  async function handleImport() {
    if (!sheetUrl.trim()) return;
    setImporting(true);
    setImportResult(null);
    setImportError("");

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrl: sheetUrl.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setImportError(data.error || "Import failed");
      } else {
        setImportResult(data);
        fetchMembers();
        fetchFilters();
      }
    } catch {
      setImportError("Failed to connect to import service");
    } finally {
      setImporting(false);
    }
  }

  function resetImportDialog() {
    setSheetUrl("");
    setImportResult(null);
    setImportError("");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Brother Directory
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "brother" : "brothers"} in the chapter
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              resetImportDialog();
              setImportOpen(true);
            }}
          >
            <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Import from Sheets</span>
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Brother</span>
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, company, job title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:gap-3">
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v === "ALL" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ALUMNI">Alumni</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={industryFilter}
            onValueChange={(v) => {
              setIndustryFilter(v === "ALL" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Industries</SelectItem>
              {filters.industries.map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={stateFilter}
            onValueChange={(v) => {
              setStateFilter(v === "ALL" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All States</SelectItem>
              {filters.states.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={yearFilter}
            onValueChange={(v) => {
              setYearFilter(v === "ALL" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Years</SelectItem>
              {filters.years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Members Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Users className="mb-4 h-12 w-12" />
          <p className="text-lg font-medium">No brothers found</p>
          <p className="text-sm mb-4">
            Try adjusting your search or filters, or add brothers to the directory.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                resetImportDialog();
                setImportOpen(true);
              }}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import from Google Sheets
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Brother
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Add Member Form */}
      <MemberForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchMembers}
      />

      {/* Import from Google Sheets Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import from Google Sheets
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Instructions */}
            <div className="rounded-lg bg-muted px-4 py-3 text-sm space-y-2">
              <p className="font-medium">How it works:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>
                  Open your Google Sheet and make sure it&apos;s shared as
                  &ldquo;Anyone with the link can view&rdquo;
                </li>
                <li>Copy the sheet URL and paste it below</li>
                <li>
                  The first row must be headers. Required columns:{" "}
                  <span className="font-medium text-foreground">
                    First Name, Last Name, Email
                  </span>
                </li>
                <li>
                  Optional columns: Phone, City, State, Graduation Year, Major,
                  Company, Job Title, Industry, LinkedIn, Bio, Tags, Status
                </li>
              </ol>
            </div>

            {/* URL Input */}
            <div className="space-y-2">
              <Label htmlFor="sheetUrl">Google Sheets URL</Label>
              <Input
                id="sheetUrl"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                disabled={importing}
              />
            </div>

            {/* Error */}
            {importError && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Success */}
            {importResult && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm space-y-2">
                <div className="flex items-center gap-2 font-medium text-green-800">
                  <CheckCircle2 className="h-4 w-4" />
                  Import Complete
                </div>
                <div className="text-green-700">
                  <p>
                    Imported: {importResult.imported} / {importResult.total} rows
                  </p>
                  {importResult.skipped > 0 && (
                    <p>Skipped: {importResult.skipped}</p>
                  )}
                  {importResult.indexing && importResult.indexing > 0 && (
                    <p className="text-amber-600">
                      Indexing {importResult.indexing} members for AI search...
                    </p>
                  )}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto text-xs text-red-600 space-y-1">
                    {importResult.errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setImportOpen(false)}
              >
                {importResult ? "Close" : "Cancel"}
              </Button>
              {!importResult && (
                <Button
                  onClick={handleImport}
                  disabled={importing || !sheetUrl.trim()}
                >
                  {importing ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Importing...
                    </>
                  ) : (
                    "Import"
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
