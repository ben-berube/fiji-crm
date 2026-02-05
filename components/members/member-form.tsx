"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface MemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    graduationYear?: number | null;
    major?: string | null;
    status: string;
    company?: string | null;
    jobTitle?: string | null;
    industry?: string | null;
    linkedIn?: string | null;
    bio?: string | null;
    tags: { name: string }[];
  };
  onSuccess?: () => void;
}

export function MemberForm({
  open,
  onOpenChange,
  member,
  onSuccess,
}: MemberFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!member;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const tagsRaw = formData.get("tags") as string;

    const body = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone") || null,
      address: formData.get("address") || null,
      city: formData.get("city") || null,
      state: formData.get("state") || null,
      zip: formData.get("zip") || null,
      graduationYear: formData.get("graduationYear") || null,
      major: formData.get("major") || null,
      status: formData.get("status") || "ACTIVE",
      company: formData.get("company") || null,
      jobTitle: formData.get("jobTitle") || null,
      industry: formData.get("industry") || null,
      linkedIn: formData.get("linkedIn") || null,
      bio: formData.get("bio") || null,
      tags: tagsRaw
        ? tagsRaw
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    };

    try {
      const url = isEdit ? `/api/members/${member.id}` : "/api/members";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save member");
      }

      onOpenChange(false);
      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Member" : "Add New Brother"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                name="firstName"
                required
                defaultValue={member?.firstName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                name="lastName"
                required
                defaultValue={member?.lastName}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={member?.email}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={member?.phone ?? ""}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              defaultValue={member?.address ?? ""}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                defaultValue={member?.city ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                name="state"
                defaultValue={member?.state ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP</Label>
              <Input
                id="zip"
                name="zip"
                defaultValue={member?.zip ?? ""}
              />
            </div>
          </div>

          {/* Chapter Info */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="graduationYear">Graduation Year</Label>
              <Input
                id="graduationYear"
                name="graduationYear"
                type="number"
                min={1900}
                max={2100}
                defaultValue={member?.graduationYear ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="major">Major</Label>
              <Input
                id="major"
                name="major"
                defaultValue={member?.major ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                name="status"
                defaultValue={member?.status ?? "ACTIVE"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ALUMNI">Alumni</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Professional */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                name="company"
                defaultValue={member?.company ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                name="jobTitle"
                defaultValue={member?.jobTitle ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                name="industry"
                defaultValue={member?.industry ?? ""}
              />
            </div>
          </div>

          {/* LinkedIn */}
          <div className="space-y-2">
            <Label htmlFor="linkedIn">LinkedIn URL</Label>
            <Input
              id="linkedIn"
              name="linkedIn"
              type="url"
              defaultValue={member?.linkedIn ?? ""}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              rows={3}
              defaultValue={member?.bio ?? ""}
              placeholder="A short bio about this brother..."
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              name="tags"
              defaultValue={member?.tags.map((t) => t.name).join(", ") ?? ""}
              placeholder="e.g. Finance, San Diego, Executive Board"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Saving..."
                : isEdit
                ? "Update Member"
                : "Add Brother"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
