"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { toast } from "sonner";
import {
  fetchMenuData,
  createCategory,
  deleteCategory as deleteCategoryAction,
  createMenuItem,
  deleteMenuItem as deleteMenuItemAction,
  toggleItemAvailability,
  updateMenuItem,
  uploadMenuImage,
  generateTemplate,
} from "./actions";

interface Category {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  is_available: boolean;
  image_url: string | null;
  extras?: any;
}

export default function MenuPage() {
  const t = useTranslations();
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [newItem, setNewItem] = useState({ name: "", description: "", price: "", ingredients: "", imageFile: null as File | null });
  const [editItemState, setEditItemState] = useState<{item: MenuItem, form: any} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  async function loadData() {
    setIsLoading(true);
    const res = await fetchMenuData();
    if (res.error) {
      toast.error(res.error);
      setIsLoading(false);
      return;
    }
    if (res.restaurantId) setRestaurantId(res.restaurantId);
    
    const catsWithItems = (res.categories || []).map((c: any) => ({
      ...c,
      items: (res.items || []).filter((i: any) => i.category_id === c.id),
    }));
    setCategories(catsWithItems);
    if (catsWithItems.length > 0 && !activeCategory) setActiveCategory(catsWithItems[0].id);
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const currentCategory = categories.find((c) => c.id === activeCategory);
  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0);

  async function addCategory() {
    if (!newCategoryName.trim() || !restaurantId) return;
    const sortOrder = categories.length + 1;
    
    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const newCat: Category = {
      id: tempId,
      name: newCategoryName,
      description: newCategoryDesc,
      sort_order: sortOrder,
      items: [],
    };
    setCategories([...categories, newCat]);
    setNewCategoryName("");
    setNewCategoryDesc("");
    setActiveCategory(tempId);

    const res = await createCategory(restaurantId, newCat.name, newCat.description, sortOrder);
    if (res.error) {
      toast.error(res.error);
      setCategories(categories.filter((c) => c.id !== tempId)); // Revert
      return;
    }
    
    // Update temp ID with real ID
    if (res.category) {
      setCategories((prev) => prev.map((c) => c.id === tempId ? { ...c, id: res.category!.id } : c));
      setActiveCategory(res.category.id);
    }
    toast.success(`Category "${newCat.name}" created`);
  }

  async function deleteCategory(id: string) {
    const previousCategories = [...categories];
    setCategories(categories.filter((c) => c.id !== id));
    if (activeCategory === id) {
      setActiveCategory(categories.find(c => c.id !== id)?.id || "");
    }

    const res = await deleteCategoryAction(id);
    if (res.error) {
      toast.error(res.error);
      setCategories(previousCategories);
    } else {
      toast.success("Category deleted");
    }
  }

  async function toggleAvailability(categoryId: string, itemId: string, currentVal: boolean) {
    const newVal = !currentVal;
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              items: c.items.map((item) =>
                item.id === itemId ? { ...item, is_available: newVal } : item
              ),
            }
          : c
      )
    );

    const res = await toggleItemAvailability(itemId, newVal);
    if (res.error) {
      toast.error("Failed to update availability");
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId
            ? {
                ...c,
                items: c.items.map((item) =>
                  item.id === itemId ? { ...item, is_available: currentVal } : item
                ),
              }
            : c
        )
      );
    }
  }

  async function addItem() {
    if (!newItem.name.trim() || !newItem.price || !activeCategory || !restaurantId) return;
    
    setIsUploading(true);
    let imageUrl = null;
    if (newItem.imageFile) {
      const formData = new FormData();
      formData.append("file", newItem.imageFile);
      const res = await uploadMenuImage(formData);
      if (res.url) imageUrl = res.url;
    }
    setIsUploading(false);

    const priceNum = parseFloat(newItem.price);
    const extras = {
      ingredients: newItem.ingredients,
    };

    const tempId = `temp-${Date.now()}`;
    const item: MenuItem = {
      id: tempId,
      name: newItem.name,
      description: newItem.description,
      price: priceNum,
      is_available: true,
      image_url: imageUrl,
      extras
    };
    
    setCategories((prev) =>
      prev.map((c) =>
        c.id === activeCategory ? { ...c, items: [...c.items, item] } : c
      )
    );
    const itemName = newItem.name;
    setNewItem({ name: "", description: "", price: "", ingredients: "", imageFile: null });

    const res = await createMenuItem(activeCategory, restaurantId, itemName, item.description, priceNum, imageUrl, extras);
    if (res.error) {
      toast.error(res.error);
      setCategories((prev) =>
        prev.map((c) =>
          c.id === activeCategory ? { ...c, items: c.items.filter((i) => i.id !== tempId) } : c
        )
      );
      return;
    }
    
    if (res.item) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === activeCategory ? { ...c, items: c.items.map(i => i.id === tempId ? { ...i, id: res.item!.id } : i) } : c
        )
      );
    }
    toast.success(`"${itemName}" added to menu`);
  }

  async function deleteItem(categoryId: string, itemId: string) {
    const previousCategories = [...categories];
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? { ...c, items: c.items.filter((i) => i.id !== itemId) }
          : c
      )
    );

    const res = await deleteMenuItemAction(itemId);
    if (res.error) {
      toast.error(res.error);
      setCategories(previousCategories);
    } else {
      toast.success("Item removed");
    }
  }

  async function saveEditedItem() {
    if (!editItemState) return;
    const { item, form } = editItemState;
    
    setIsUploading(true);
    let imageUrl = item.image_url;
    if (form.imageFile) {
      const formData = new FormData();
      formData.append("file", form.imageFile);
      const res = await uploadMenuImage(formData);
      if (res.url) imageUrl = res.url;
    }
    setIsUploading(false);

    const priceNum = parseFloat(form.price);
    const extras = {
      ingredients: form.ingredients,
    };

    const res = await updateMenuItem(item.id, form.name, form.description, priceNum, imageUrl, extras);
    if (res.error) {
      toast.error(res.error);
      return;
    }

    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        items: c.items.map((i) => i.id === item.id ? { ...i, name: form.name, description: form.description, price: priceNum, image_url: imageUrl, extras } : i)
      }))
    );
    setEditItemState(null);
    toast.success("Item updated");
  }

  function openEditDialog(item: MenuItem) {
    setEditItemState({
      item,
      form: {
        name: item.name,
        description: item.description || "",
        price: item.price.toString(),
        ingredients: item.extras?.ingredients || "",
        imageFile: null
      }
    });
  }

  async function handleGenerateTemplate(type: 'pizzeria' | 'cafe' | 'fine_dining') {
    if (!restaurantId) return;
    setIsGenerating(true);
    toast.loading("Generating menu template...");
    
    const res = await generateTemplate(restaurantId, type);
    toast.dismiss();
    
    if (res.error) {
      toast.error("Failed to generate template");
    } else {
      toast.success("Template applied successfully!");
      await loadData();
    }
    setIsGenerating(false);
  }

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center">Loading menu...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("menu.title")}</h1>
          <p className="mt-1 text-muted-foreground">
            {categories.length} categories · {totalItems} items
          </p>
        </div>
        <div className="flex gap-2">
          {categories.length > 0 && (
            <>
              {/* Add Category Dialog */}
              <Dialog>
                <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                  {t("menu.addCategory")}
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("menu.addCategory")}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{t("menu.categoryName")}</Label>
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="e.g. Appetizers"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("menu.description")}</Label>
                      <Textarea
                        value={newCategoryDesc}
                        onChange={(e) => setNewCategoryDesc(e.target.value)}
                        placeholder="A brief description..."
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                      {t("common.cancel")}
                    </DialogClose>
                    <DialogClose
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                      onClick={addCategory}
                    >
                      {t("common.create")}
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Add Item Dialog */}
              <Dialog>
                <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                  {t("menu.addItem")}
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("menu.addItem")}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{t("menu.itemName")}</Label>
                      <Input
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        placeholder="e.g. Margherita Pizza"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("menu.description")}</Label>
                      <Textarea
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        placeholder="A brief description..."
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("menu.price")}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newItem.price}
                        onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Image (Optional)</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNewItem({ ...newItem, imageFile: e.target.files?.[0] || null })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ingredients (Optional)</Label>
                      <Input
                        value={newItem.ingredients}
                        onChange={(e) => setNewItem({ ...newItem, ingredients: e.target.value })}
                        placeholder="e.g. Flour, Water, Tomatoes, Cheese"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                      {t("common.cancel")}
                    </DialogClose>
                    <DialogClose
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                      onClick={addItem}
                      disabled={isUploading}
                    >
                      {isUploading ? "Uploading..." : t("common.create")}
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="glass-panel flex flex-col items-center justify-center p-12 text-center col-span-full mb-6">
            <div className="h-20 w-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h16"/><path d="M4 14h16"/><path d="M4 18h16"/><path d="M4 6h16"/></svg>
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Your Menu is Empty</h2>
            <p className="text-muted-foreground max-w-md mb-8">
              Start building your restaurant's digital menu from scratch, or save time by instantly loading one of our pre-built real-world templates.
            </p>
            <Dialog>
              <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 shadow-lg hover-lift">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                Create Empty Category
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("menu.addCategory")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t("menu.categoryName")}</Label>
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Appetizers"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("menu.description")}</Label>
                    <Textarea
                      value={newCategoryDesc}
                      onChange={(e) => setNewCategoryDesc(e.target.value)}
                      placeholder="A brief description..."
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                    {t("common.cancel")}
                  </DialogClose>
                  <DialogClose
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                    onClick={addCategory}
                  >
                    {t("common.create")}
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Card>

          <Card className="hover-lift border border-orange-500/20 bg-orange-500/5 transition-all">
            <CardHeader>
              <CardTitle className="text-orange-500 flex items-center gap-2">
                🍕 Pizzeria Template
              </CardTitle>
              <CardDescription>
                Perfect for Italian restaurants. Includes Wood-Fired Pizzas, Starters, and Drinks categories with sample items.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full border-orange-500/20 hover:bg-orange-500/10 hover:text-orange-600"
                onClick={() => handleGenerateTemplate('pizzeria')}
                disabled={isGenerating}
              >
                Use Pizzeria Template
              </Button>
            </CardContent>
          </Card>

          <Card className="hover-lift border border-amber-600/20 bg-amber-600/5 transition-all">
            <CardHeader>
              <CardTitle className="text-amber-600 flex items-center gap-2">
                ☕ Cafe / Coffee Shop Template
              </CardTitle>
              <CardDescription>
                Ideal for cafes. Pre-configured with Hot Beverages, Cold Brews, and Pastries categories with sample items.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full border-amber-600/20 hover:bg-amber-600/10 hover:text-amber-700 backdrop-blur-md"
                onClick={() => handleGenerateTemplate('cafe')}
                disabled={isGenerating}
              >
                Use Cafe Template
              </Button>
            </CardContent>
          </Card>

          <Card className="hover-lift border border-purple-500/20 bg-purple-500/5 transition-all backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="relative">
              <CardTitle className="text-purple-500 flex items-center gap-2 text-xl">
                🍷 Fine Dining
              </CardTitle>
              <CardDescription className="text-sm">
                Premium multi-course setup. Includes Hors d'oeuvres, Mains, and Desserts with high-end sample items.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <Button 
                variant="outline" 
                className="w-full border-purple-500/20 hover:bg-purple-500/10 hover:text-purple-600 backdrop-blur-md"
                onClick={() => handleGenerateTemplate('fine_dining')}
                disabled={isGenerating}
              >
                Use Fine Dining Template
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Category sidebar */}
          <Card className="h-fit glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-0.5 px-2 pb-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:translate-x-1 ${
                      activeCategory === cat.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-white/10 dark:hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    <Badge variant="secondary" className="text-xs shrink-0 ms-2 bg-background">
                      {cat.items.length}
                    </Badge>
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>

          {/* Items grid */}
          <div className="space-y-4">
            {currentCategory && (
              <>
                <div className="flex items-center justify-between glass-panel p-4 rounded-xl border border-white/10 bg-gradient-to-r from-primary/5 to-transparent">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">{currentCategory.name}</h2>
                    {currentCategory.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentCategory.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10 rounded-full"
                    onClick={() => deleteCategory(currentCategory.id)}
                    title="Delete Category"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  </Button>
                </div>

                {currentCategory.items.length === 0 ? (
                  <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-white/20 text-muted-foreground glass-panel">
                    <div className="text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-muted-foreground/50"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
                      <p className="text-sm">No items in this category.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {currentCategory.items.map((item) => (
                      <Card
                        key={item.id}
                        className={`group transition-all glass-panel border border-white/10 ${
                          !item.is_available ? "opacity-60 grayscale" : "hover-lift hover:shadow-lg"
                        }`}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            {/* Image placeholder or actual image */}
                            {item.image_url ? (
                              <div className="h-20 w-20 shrink-0 rounded-xl bg-muted overflow-hidden shadow-sm relative">
                                <Image src={item.image_url} alt={item.name} fill sizes="80px" className="object-cover" />
                              </div>
                            ) : (
                              <div className="h-20 w-20 shrink-0 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/40"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                              </div>
                            )}
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold text-base leading-tight">
                                  {item.name}
                                </h3>
                                <span className="text-base font-bold text-primary shrink-0">
                                  ${item.price.toFixed(2)}
                                </span>
                              </div>
                              <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 leading-snug">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          {/* Actions row */}
                          <div className="mt-5 flex items-center justify-between pt-4 border-t border-white/10">
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`avail-${item.id}`}
                                checked={item.is_available}
                                onCheckedChange={() =>
                                  toggleAvailability(currentCategory.id, item.id, item.is_available)
                                }
                              />
                              <Label
                                htmlFor={`avail-${item.id}`}
                                className="text-sm font-medium text-muted-foreground cursor-pointer"
                              >
                                {item.is_available ? "Available" : "Hidden"}
                              </Label>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditDialog(item)}
                                className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                title="Edit Item"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                              </button>
                              <button
                                onClick={() => deleteItem(currentCategory.id, item.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete Item"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Item Dialog */}
      <Dialog open={!!editItemState} onOpenChange={(open) => !open && setEditItemState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          {editItemState && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("menu.itemName")}</Label>
                <Input
                  value={editItemState.form.name}
                  onChange={(e) => setEditItemState({ ...editItemState, form: { ...editItemState.form, name: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("menu.description")}</Label>
                <Textarea
                  value={editItemState.form.description}
                  onChange={(e) => setEditItemState({ ...editItemState, form: { ...editItemState.form, description: e.target.value } })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("menu.price")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editItemState.form.price}
                  onChange={(e) => setEditItemState({ ...editItemState, form: { ...editItemState.form, price: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label>New Image (Optional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditItemState({ ...editItemState, form: { ...editItemState.form, imageFile: e.target.files?.[0] || null } })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ingredients (Optional)</Label>
                <Input
                  value={editItemState.form.ingredients}
                  onChange={(e) => setEditItemState({ ...editItemState, form: { ...editItemState.form, ingredients: e.target.value } })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItemState(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={saveEditedItem}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
