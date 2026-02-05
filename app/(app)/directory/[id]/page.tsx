"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { MemberForm } from "@/components/members/member-form";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Linkedin,
  Pencil,
  Trash2,
} from "lucide-react";

interface MemberDetail {
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
  tags: { id: string; name: string }[];
  user?: { image?: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  async function fetchMember() {
    const res = await fetch(`/api/members/${params.id}`);
    if (!res.ok) {
      router.push("/directory");
      return;
    }
    const data = await res.json();
    setMember(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchMember();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to remove this brother?")) return;
    const res = await fetch(`/api/members/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/directory");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!member) return null;

  const statusColor = {
    ACTIVE: "bg-green-100 text-green-800",
    ALUMNI: "bg-fiji-gold/20 text-fiji-purple-dark",
    INACTIVE: "bg-gray-100 text-gray-600",
  }[member.status] ?? "bg-gray-100 text-gray-600";

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/directory")}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Directory
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarImage src={member.user?.image ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                  {member.firstName[0]}
                  {member.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-4 text-xl font-bold">
                {member.firstName} {member.lastName}
              </h2>
              <Badge variant="secondary" className={`mt-2 ${statusColor}`}>
                {member.status.charAt(0) +
                  member.status.slice(1).toLowerCase()}
              </Badge>

              {member.graduationYear && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Class of {member.graduationYear}
                  {member.major ? ` - ${member.major}` : ""}
                </p>
              )}

              <Separator className="my-4" />

              {/* Contact Info */}
              <div className="w-full space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${member.email}`}
                    className="text-primary hover:underline"
                  >
                    {member.email}
                  </a>
                </div>
                {member.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${member.phone}`}
                      className="text-primary hover:underline"
                    >
                      {member.phone}
                    </a>
                  </div>
                )}
                {(member.city || member.state) && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {[member.address, member.city, member.state, member.zip]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
                {member.linkedIn && (
                  <div className="flex items-center gap-3 text-sm">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={member.linkedIn}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      LinkedIn Profile
                    </a>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Actions */}
              <div className="flex w-full gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Professional */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5 text-primary" />
                Professional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Company
                  </p>
                  <p className="mt-1">{member.company || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Job Title
                  </p>
                  <p className="mt-1">{member.jobTitle || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Industry
                  </p>
                  <p className="mt-1">{member.industry || "Not specified"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chapter Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
                Chapter Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Graduation Year
                  </p>
                  <p className="mt-1">
                    {member.graduationYear || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Major
                  </p>
                  <p className="mt-1">{member.major || "Not specified"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bio */}
          {member.bio && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{member.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {member.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {member.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Form */}
      <MemberForm
        open={editOpen}
        onOpenChange={setEditOpen}
        member={member}
        onSuccess={fetchMember}
      />
    </div>
  );
}
