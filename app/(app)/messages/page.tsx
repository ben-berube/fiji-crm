"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Send,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";

interface MemberWithPhone {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
}

interface MessageLogEntry {
  id: string;
  to: string;
  body: string;
  status: string;
  sentAt: string;
}

interface Template {
  id: string;
  name: string;
  body: string;
}

export default function MessagesPage() {
  const [members, setMembers] = useState<MemberWithPhone[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [history, setHistory] = useState<MessageLogEntry[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateFormOpen, setTemplateFormOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState("");

  const fetchMembers = useCallback(async () => {
    const params = new URLSearchParams({ limit: "500" });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/members?${params}`);
    const data = await res.json();
    setMembers(data.members);
  }, [statusFilter]);

  const fetchHistory = useCallback(async () => {
    const res = await fetch("/api/sms/history");
    const data = await res.json();
    setHistory(data.messages);
  }, []);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/sms/templates");
    const data = await res.json();
    setTemplates(data);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    fetchHistory();
    fetchTemplates();
  }, [fetchHistory, fetchTemplates]);

  const membersWithPhone = members.filter((m) => m.phone);

  function toggleRecipient(phone: string) {
    setSelectedRecipients((prev) =>
      prev.includes(phone) ? prev.filter((p) => p !== phone) : [...prev, phone]
    );
  }

  function selectAll() {
    setSelectedRecipients(membersWithPhone.map((m) => m.phone!));
  }

  function clearAll() {
    setSelectedRecipients([]);
  }

  async function handleSend() {
    if (!selectedRecipients.length || !messageBody.trim()) return;
    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: selectedRecipients,
          body: messageBody.trim(),
        }),
      });

      const data = await res.json();
      const sent = data.results.filter(
        (r: { status: string }) => r.status === "sent"
      ).length;
      const failed = data.results.filter(
        (r: { status: string }) => r.status === "failed"
      ).length;

      setSendResult(`Sent: ${sent}, Failed: ${failed}`);
      setMessageBody("");
      setSelectedRecipients([]);
      fetchHistory();
    } catch {
      setSendResult("Failed to send messages");
    } finally {
      setSending(false);
    }
  }

  async function handleSaveTemplate() {
    if (!newTemplateName.trim() || !newTemplateBody.trim()) return;

    await fetch("/api/sms/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newTemplateName.trim(),
        body: newTemplateBody.trim(),
      }),
    });

    setNewTemplateName("");
    setNewTemplateBody("");
    setTemplateFormOpen(false);
    fetchTemplates();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Messages
        </h1>
        <p className="text-sm text-muted-foreground">
          Send texts to brothers individually or in bulk
        </p>
      </div>

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recipients */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recipients</CardTitle>
                  <div className="flex gap-2">
                    <Select
                      value={statusFilter}
                      onValueChange={(v) =>
                        setStatusFilter(v === "ALL" ? "" : v)
                      }
                    >
                      <SelectTrigger className="w-[130px] h-8">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="ALUMNI">Alumni</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      All
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearAll}>
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {membersWithPhone.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No brothers with phone numbers found
                    </p>
                  ) : (
                    membersWithPhone.map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipients.includes(m.phone!)}
                          onChange={() => toggleRecipient(m.phone!)}
                          className="rounded"
                        />
                        <span className="text-sm flex-1">
                          {m.firstName} {m.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {m.phone}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {selectedRecipients.length} recipient(s) selected
                </p>
              </CardContent>
            </Card>

            {/* Message */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Template Picker */}
                {templates.length > 0 && (
                  <div className="space-y-2">
                    <Label>Use Template</Label>
                    <Select
                      onValueChange={(v) => {
                        const t = templates.find((t) => t.id === v);
                        if (t) setMessageBody(t.body);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Message Body</Label>
                  <Textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    rows={6}
                    placeholder="Type your message here..."
                  />
                  <p className="text-xs text-muted-foreground">
                    {messageBody.length} / 1600 characters
                  </p>
                </div>

                {sendResult && (
                  <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                    {sendResult}
                  </div>
                )}

                <Button
                  onClick={handleSend}
                  disabled={
                    sending ||
                    !selectedRecipients.length ||
                    !messageBody.trim()
                  }
                  className="w-full"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {sending
                    ? "Sending..."
                    : `Send to ${selectedRecipients.length} recipient(s)`}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Message Templates</h2>
            <Button onClick={() => setTemplateFormOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>

          {templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="mb-3 h-10 w-10" />
                <p>No templates yet. Create one to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {t.body}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setMessageBody(t.body)}
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={templateFormOpen} onOpenChange={setTemplateFormOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Message Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g., Dues Reminder"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message Body</Label>
                  <Textarea
                    value={newTemplateBody}
                    onChange={(e) => setNewTemplateBody(e.target.value)}
                    rows={4}
                    placeholder="Type your template message..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setTemplateFormOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveTemplate}>Save Template</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="mb-3 h-10 w-10" />
                  <p>No messages sent yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>To</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((msg) => (
                      <TableRow key={msg.id}>
                        <TableCell className="font-mono text-sm">
                          {msg.to}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm">
                          {msg.body}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              msg.status === "sent" || msg.status === "delivered"
                                ? "bg-green-100 text-green-800"
                                : msg.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : ""
                            }
                          >
                            {msg.status === "sent" ||
                            msg.status === "delivered" ? (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            ) : (
                              <XCircle className="mr-1 h-3 w-3" />
                            )}
                            {msg.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(msg.sentAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
