"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Briefcase, GraduationCap } from "lucide-react";

interface MemberCardProps {
  member: {
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
  };
}

export function MemberCard({ member }: MemberCardProps) {
  const statusColor = {
    ACTIVE: "bg-green-100 text-green-800",
    ALUMNI: "bg-fiji-gold/20 text-fiji-purple-dark",
    INACTIVE: "bg-gray-100 text-gray-600",
  }[member.status] ?? "bg-gray-100 text-gray-600";

  return (
    <Link href={`/directory/${member.id}`}>
      <Card className="group cursor-pointer border-border/50 transition-all hover:border-primary/30 hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {member.firstName[0]}
                {member.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                  {member.firstName} {member.lastName}
                </h3>
                <Badge variant="secondary" className={statusColor}>
                  {member.status.charAt(0) + member.status.slice(1).toLowerCase()}
                </Badge>
              </div>

              {(member.jobTitle || member.company) && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                  <Briefcase className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {[member.jobTitle, member.company]
                      .filter(Boolean)
                      .join(" at ")}
                  </span>
                </div>
              )}

              {(member.city || member.state) && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {[member.city, member.state].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}

              {member.graduationYear && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                  <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                  <span>Class of {member.graduationYear}</span>
                </div>
              )}

              {member.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {member.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="text-xs"
                    >
                      {tag.name}
                    </Badge>
                  ))}
                  {member.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{member.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
