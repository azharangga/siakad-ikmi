"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image"; 
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Trash2, ShieldCheck, BookOpen, KeyRound, CheckCircle2, XCircle, User, AtSign, GraduationCap, User2, UserPlus, Crown } from "lucide-react"; 
import { UserData } from "@/lib/types"; 
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { SwitchAccountButton } from "./SwitchAccountButton";

interface UserTableProps {
  data: UserData[];
  isLoading: boolean;
  onEdit: (user: UserData) => void;
  onDelete: (user: UserData) => void;
  onResetPassword: (user: UserData) => void;
  onAdd: () => void;
  onGenerate: () => void;
  currentUserId?: string;
  currentUserRole?: string;
}

export default function UserTable({ 
  data, 
  isLoading, 
  onEdit, 
  onDelete, 
  onResetPassword, 
  onAdd,
  onGenerate,
  currentUserId,
  currentUserRole,
}: UserTableProps) {
  
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // === FILTERING LOGIC ===
  const filteredData = useMemo(() => {
    let result = data;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(lowerQuery) ||
          user.username.toLowerCase().includes(lowerQuery)
      );
    }

    if (roleFilter !== "ALL") {
      result = result.filter((user) => user.role === roleFilter);
    }

    if (statusFilter !== "ALL") {
      result = result.filter((user) => statusFilter === "active" ? user.is_active : !user.is_active);
    }

    return result;
  }, [data, searchQuery, roleFilter, statusFilter]);

  // === PAGINATION ===
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // === COLUMNS ===
  const columns: Column<UserData>[] = [
    {
      header: "#",
      className: "w-[50px] text-center",
      render: (_, index) => <span className="text-muted-foreground">{startIndex + index + 1}</span>,
    },
    {
      header: "Nama User",
      render: (row) => (
        <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shrink-0">
                {row.avatar_url ? (
                    <Image 
                        src={row.avatar_url} 
                        alt={row.name} 
                        fill 
                        className="object-cover"
                    />
                ) : (
                    <User className="h-4 w-4 text-slate-400" />
                )}
            </div>
            <span className="font-semibold text-slate-700 text-sm">{row.name}</span>
        </div>
      ),
    },
    {
      header: "Username",
      render: (row) => (
        <div className="flex items-center text-slate-600 font-medium">
            <AtSign className="h-3.5 w-3.5 mr-1 text-slate-400" />
            {row.username}
        </div>
      ),
    },
    {
      header: "Role",
      className: "text-center",
      render: (row) => {
        let variant: "default" | "secondary" | "outline" | "destructive" = "outline";
        let icon = null;
        let className = "";

        if (row.role === 'admin') {
            variant = "default";
            icon = <ShieldCheck size={13} className="mr-1.5" />;
            // Default styling (Solid Primary/Black)
        } else if (row.role === 'dosen') {
            variant = "default"; 
            icon = <User2 size={13} className="mr-1.5" />;
            className = "bg-blue-600 text-white border-transparent";
        } else if (row.role === 'mahasiswa') {
            variant = "outline";
            icon = null;
            className = "bg-white text-slate-600 border-slate-300";
        } else if (row.role === 'superuser') {
            variant = "default";
            icon = <Crown size={13} className="mr-1.5" />;
            className = "bg-purple-600 text-white border-transparent";
        }
        
        return (
          <Badge variant={variant} className={`capitalize font-medium pl-2.5 pr-3 py-0.5 ${className}`}>
            {icon}
            {row.role}
          </Badge>
        );
      },
    },
    {
        header: "Status",
        className: "text-center w-[120px]",
        render: (row) => (
          <Badge 
            variant={row.is_active ? "default" : "destructive"} 
            className={`font-normal ${row.is_active ? "bg-green-600" : ""}`}
          >
            {row.is_active ? (
              <CheckCircle2 className="mr-1 h-3 w-3" />
            ) : (
              <XCircle className="mr-1 h-3 w-3" />
            )}
            {row.is_active ? "Aktif" : "Non-Aktif"}
          </Badge>
        )
    },
    {
      header: "Password",
      className: "text-center",
      render: (row) => (
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 text-xs border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
          onClick={() => onResetPassword(row)}
        >
          <KeyRound className="mr-1.5 h-3 w-3" />
          Reset
        </Button>
      ),
    },
    {
      header: "Aksi",
      className: "text-center w-[150px]",
      render: (row) => (
        <div className="flex justify-center gap-2">
          {currentUserRole === "superuser" && currentUserId && (
            <SwitchAccountButton user={row} currentUserId={currentUserId} />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-amber-600 hover:bg-amber-50 h-8 w-8"
            onClick={() => onEdit(row)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-rose-600 hover:bg-rose-50 h-8 w-8"
            onClick={() => onDelete(row)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const activeFilterCount = [
    roleFilter !== "ALL",
    statusFilter !== "ALL"
  ].filter(Boolean).length;

  const filterContent = (
    <div className="space-y-4 text-left">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700">Peran Pengguna</Label>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full h-9">
            <SelectValue placeholder="Semua Peran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Peran</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="dosen">Dosen</SelectItem>
            <SelectItem value="mahasiswa">Mahasiswa</SelectItem>
            <SelectItem value="superuser">Superuser</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700">Status Akun</Label>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full h-9">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Non Aktif</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // === GENERATE BUTTON ===
  const generateButton = (
    <Button
      variant="outline"
      onClick={onGenerate}
      className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm"
      title="Generate Akun Mahasiswa & Dosen"
    >
      <UserPlus className="h-4 w-4 sm:mr-2" />
      <span className="hidden sm:inline">Generate Akun</span>
    </Button>
  );

  return (
    <Card className="border-none shadow-sm ring-1 ring-gray-200">
      <CardContent className="p-4 sm:p-6">
        <DataTable
          data={currentData}
          columns={columns}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          searchPlaceholder="Cari Nama atau Username..."
          onAdd={onAdd}
          addLabel="Tambah User"
          
          filterContent={filterContent}
          isFilterActive={activeFilterCount > 0}
          activeFilterCount={activeFilterCount}
          onResetFilter={() => {
            setRoleFilter("ALL");
            setStatusFilter("ALL");
            setSearchQuery("");
            setCurrentPage(1);
          }}

          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          startIndex={startIndex}
          endIndex={endIndex}
          totalItems={filteredData.length}
          customActions={generateButton}
        />
      </CardContent>
    </Card>
  );
}