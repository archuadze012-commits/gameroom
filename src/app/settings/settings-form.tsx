"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { toast } from "sonner";

export function SettingsForm() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: server action — update profiles row
    await new Promise((r) => setTimeout(r, 500));
    toast.success("დამახსოვრდა (demo).");
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="username">მომხმარებლის სახელი</Label>
          <Input id="username" name="username" defaultValue="GeoSniper" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="displayName">საჩვენებელი სახელი</Label>
          <Input id="displayName" name="displayName" defaultValue="Geo Sniper" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bio">ბიო</Label>
        <Textarea id="bio" name="bio" rows={3} placeholder="რასაც გვინდა შევიტყობდეთ შენზე..." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="region">რეგიონი</Label>
          <Select name="region" defaultValue="GE">
            <SelectTrigger id="region">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GE">საქართველო (GE)</SelectItem>
              <SelectItem value="EU">ევროპა (EU)</SelectItem>
              <SelectItem value="RU">რუსეთი (RU)</SelectItem>
              <SelectItem value="MENA">MENA</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hours">ხელმისაწვდომი საათები</Label>
          <Input id="hours" name="hours" placeholder="მაგ. 18:00 — 23:00" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="voice"
          name="voice"
          defaultChecked
          className="h-4 w-4 rounded border-border bg-background accent-primary"
        />
        <Label htmlFor="voice" className="font-normal">
          🎙 voice chat-ით კომფორტულად ვამთამაშებ
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          შენახვა
        </Button>
      </div>
    </form>
  );
}
