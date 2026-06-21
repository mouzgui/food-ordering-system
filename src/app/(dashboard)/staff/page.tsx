"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { StaffRole } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { fetchStaffMembers, createStaffMember as createAction, removeStaffMember as removeAction, changeStaffRole as changeRoleAction } from "./actions";

interface StaffMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  username?: string;
  role: StaffRole;
  is_active: boolean;
  joined_at: string;
}

const roleColors: Record<string, string> = {
  owner: "bg-primary/15 text-primary",
  manager: "bg-chart-2/15 text-chart-2",
  kitchen_staff: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  waiter: "bg-chart-3/15 text-chart-3",
};

const MANAGEABLE_ROLES: Exclude<StaffRole, "owner">[] = [
  "manager",
  "kitchen_staff",
  "waiter",
];

export default function StaffPage() {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [currentRole, setCurrentRole] = useState<StaffRole>("manager");
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Exclude<StaffRole, "owner">>("waiter");

  useEffect(() => {
    async function loadData() {
      const res = await fetchStaffMembers();
      if (res.error) {
        toast.error(res.error);
        setIsLoading(false);
        return;
      }
      setRestaurantId(res.restaurantId || null);
      setCurrentRole((res.currentRole as StaffRole | undefined) || "manager");
      setCurrentMemberId(res.currentMemberId || null);
      setStaff(res.staff || []);
      setIsLoading(false);
    }
    loadData();
  }, []);

  async function createMember() {
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim() || !restaurantId) return;
    
    const res = await createAction(restaurantId, newName, newUsername, newPassword, newRole);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    
    if (res.member) {
      setStaff([...staff, res.member as StaffMember]);
    }
    
    setNewName("");
    setNewUsername("");
    setNewPassword("");
    toast.success(`Staff member created successfully`);
  }

  async function removeMember(id: string) {
    const previousStaff = [...staff];
    setStaff(staff.map((m) => (m.id === id ? { ...m, is_active: false } : m)));
    
    const res = await removeAction(id);
    if (res.error) {
      toast.error(res.error);
      setStaff(previousStaff);
    } else {
      toast.success("Member deactivated");
    }
  }

  async function changeRole(id: string, role: Exclude<StaffRole, "owner">) {
    const previousStaff = [...staff];
    setStaff(staff.map((m) => (m.id === id ? { ...m, role } : m)));
    
    const res = await changeRoleAction(id, role);
    if (res.error) {
      toast.error(res.error);
      setStaff(previousStaff);
    } else {
      toast.success("Role updated");
    }
  }

  function canManage(member: StaffMember) {
    if (member.id === currentMemberId) return false;
    if (member.role === "owner") return false;
    if (currentRole === "owner") return true;
    return member.role === "waiter" || member.role === "kitchen_staff";
  }

  function roleLabel(role: StaffRole) {
    switch (role) {
      case "kitchen_staff":
        return "Kitchen Staff";
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  }

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center">Loading staff...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("staff.title")}</h1>
          <p className="mt-1 text-muted-foreground">
            {staff.filter((m) => m.is_active).length} active members
          </p>
        </div>
        <Dialog>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
            Add Staff Member
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jean Dupont" />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="jeandupont" />
              </div>
              <div className="space-y-2">
                <Label>Password / PIN</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex gap-2">
                  {MANAGEABLE_ROLES.filter((role) => currentRole === "owner" || role !== "manager").map((role) => (
                    <button
                      key={role}
                      onClick={() => setNewRole(role)}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                        newRole === role ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                      }`}
                    >
                      {roleLabel(role)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                {t("common.cancel")}
              </DialogClose>
              <DialogClose
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                onClick={createMember}
              >
                Create Member
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {staff.map((member) => (
              <div
                key={member.id}
                className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/50 ${
                  !member.is_active ? "opacity-50" : ""
                }`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{member.username || member.email.split("@")[0]}
                  </p>
                </div>
                <Badge className={`text-xs ${roleColors[member.role]}`}>
                  {roleLabel(member.role)}
                </Badge>
                <span className="hidden sm:block text-xs text-muted-foreground">
                  Joined {member.joined_at}
                </span>
                {canManage(member) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-1 rounded hover:bg-muted transition-colors outline-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {currentRole === "owner" && member.role !== "manager" && (
                        <DropdownMenuItem onClick={() => changeRole(member.id, "manager")}>
                          Promote to Manager
                        </DropdownMenuItem>
                      )}
                      {member.role !== "kitchen_staff" && (
                        <DropdownMenuItem onClick={() => changeRole(member.id, "kitchen_staff")}>
                          Set as Kitchen Staff
                        </DropdownMenuItem>
                      )}
                      {member.role !== "waiter" && (
                        <DropdownMenuItem onClick={() => changeRole(member.id, "waiter")}>
                          Set as Waiter
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => removeMember(member.id)}
                      >
                        Deactivate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
