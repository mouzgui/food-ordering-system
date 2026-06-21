"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import QRCode from "qrcode";
import { fetchTables, createTable, updateTableActive, deleteTableDb } from "./actions";

interface TableData {
  id: string;
  label: string;
  number: number;
  qr_code_token: string;
  is_active: boolean;
}

function QRCodeCanvas({ slug, tableId, size = 180 }: { slug: string; tableId: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";
  const baseUrl = isLocalhost && process.env.NEXT_PUBLIC_LOCAL_IP_URL 
    ? process.env.NEXT_PUBLIC_LOCAL_IP_URL 
    : (typeof window !== "undefined" ? window.location.origin : "");
  const url = `${baseUrl}/${slug}/${tableId}`;

  const generateQR = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      await QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 2,
        color: {
          dark: "#1a1a2e",
          light: "#ffffff",
        },
      });
    } catch {
      // QR generation failed silently
    }
  }, [url, size]);

  useEffect(() => {
    generateQR();
  }, [generateQR]);

  return <canvas ref={canvasRef} className="rounded-lg" />;
}

export default function TablesPage() {
  const t = useTranslations();
  const [tables, setTables] = useState<TableData[]>([]);
  const [slug, setSlug] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [newTableLabel, setNewTableLabel] = useState("");
  const [newTableNumber, setNewTableNumber] = useState("");
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetchTables();
      if (res.error) {
        toast.error("Failed to load tables");
      } else if (res.tables) {
        setTables(res.tables);
        setSlug(res.slug);
        setRestaurantId(res.restaurantId);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  async function addTable() {
    if (!newTableLabel.trim() || !newTableNumber) return;
    const num = parseInt(newTableNumber);
    if (tables.some((t) => t.number === num)) {
      toast.error("Table number already exists");
      return;
    }
    
    const res = await createTable(restaurantId, newTableLabel, num);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    
    if (res.table) {
      setTables([...tables, res.table]);
      setNewTableLabel("");
      setNewTableNumber("");
      toast.success(`"${newTableLabel}" created with QR code`);
    }
  }

  async function toggleTable(id: string) {
    const table = tables.find(t => t.id === id);
    if (!table) return;
    
    setTables(
      tables.map((t) =>
        t.id === id ? { ...t, is_active: !t.is_active } : t
      )
    );
    
    const res = await updateTableActive(id, !table.is_active);
    if (res.error) {
      toast.error("Failed to update status");
      // revert
      setTables(tables.map((t) => t.id === id ? { ...t, is_active: table.is_active } : t));
    }
  }

  async function deleteTable(id: string) {
    const prev = [...tables];
    setTables(tables.filter((table) => table.id !== id));
    if (selectedTable?.id === id) setSelectedTable(null);
    
    const res = await deleteTableDb(id);
    if (res.error) {
      toast.error("Failed to delete table");
      setTables(prev);
    } else {
      toast.success("Table deleted");
    }
  }

  async function downloadQR(table: TableData) {
    if (!slug) return;
    const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";
    const baseUrl = isLocalhost && process.env.NEXT_PUBLIC_LOCAL_IP_URL 
      ? process.env.NEXT_PUBLIC_LOCAL_IP_URL 
      : window.location.origin;
    const url = `${baseUrl}/${slug}/${table.id}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 3,
        color: { dark: "#1a1a2e", light: "#ffffff" },
      });
      const link = document.createElement("a");
      link.download = `qr-${table.label.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
      toast.success(`QR code downloaded for ${table.label}`);
    } catch {
      toast.error("Failed to download QR code");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("tables.title")}</h1>
          <p className="mt-1 text-muted-foreground">
            {isLoading ? "Loading..." : `${tables.length} tables · ${tables.filter((t) => t.is_active).length} active`}
          </p>
        </div>
        <Dialog>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            {t("tables.addTable")}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("tables.addTable")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={newTableLabel}
                  onChange={(e) => setNewTableLabel(e.target.value)}
                  placeholder="e.g. Table 7, Patio 3, VIP..."
                />
              </div>
              <div className="space-y-2">
                <Label>Number</Label>
                <Input
                  type="number"
                  min="1"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  placeholder="e.g. 7"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                {t("common.cancel")}
              </DialogClose>
              <DialogClose
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                onClick={addTable}
              >
                {t("common.create")}
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Tables Grid */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tables.map((table) => (
            <Card
              key={table.id}
              className={`group cursor-pointer transition-all glass-panel ${
                selectedTable?.id === table.id
                  ? "ring-2 ring-primary shadow-lg"
                  : "hover-lift"
              } ${!table.is_active ? "opacity-60" : ""}`}
              onClick={() => setSelectedTable(table)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{table.label}</CardTitle>
                  <Badge
                    variant={table.is_active ? "default" : "secondary"}
                    className="text-xs"
                  >
                    #{table.number}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex justify-center py-2">
                  {slug && <QRCodeCanvas slug={slug} tableId={table.id} size={120} />}
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2 font-mono truncate">
                  {table.id.split('-')[0]}
                </p>
              </CardContent>
              <CardFooter className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={table.is_active}
                    onCheckedChange={() => toggleTable(table.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-xs text-muted-foreground">
                    {table.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTable(table.id);
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* QR Preview Panel */}
        <div className="hidden lg:block">
          <Card className="sticky top-20 glass-panel">
            <CardHeader>
              <CardTitle className="text-base">
                {selectedTable
                  ? `${selectedTable.label} — QR Preview`
                  : "Select a table"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTable && slug ? (
                <div className="space-y-4">
                  <div className="flex justify-center rounded-xl bg-white p-4">
                    <QRCodeCanvas slug={slug} tableId={selectedTable.id} size={220} />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium">{selectedTable.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("tables.scanToOrder")}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadQR(selectedTable)}
                      className="gap-1.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                      {t("tables.downloadQR")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.print();
                        toast.success("Print dialog opened");
                      }}
                      className="gap-1.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                      {t("tables.printQR")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                  Click a table card to preview its QR code
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
