"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { mockGames } from "@/lib/mock-data";

export function NewLfgForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    // TODO: hook up Supabase server action to insert into lfg_posts
    await new Promise((r) => setTimeout(r, 600));
    toast.success("LFG დაიდო (demo). შემდეგ ეტაპზე ბაზაში ჩაიწერება.");
    setLoading(false);
    router.push("/lfg");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="game">თამაში *</Label>
        <Select name="game" required>
          <SelectTrigger id="game">
            <SelectValue placeholder="აარჩიე თამაში" />
          </SelectTrigger>
          <SelectContent>
            {mockGames.map((g) => (
              <SelectItem key={g.slug} value={g.slug}>
                {g.emoji} {g.nameKa}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">სათაური *</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={140}
          placeholder="მაგ. Squad 3+1 → Erangel ranked"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">აღწერა</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          placeholder="დაწერე რა ტიპის მოთამაშეებს ეძებ, რა საათებში თამაშობ, რა მოლოდინი გაქვს."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="rank">რანკი</Label>
          <Input id="rank" name="rank" placeholder="მაგ. Crown II+" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="region">რეგიონი</Label>
          <Select name="region">
            <SelectTrigger id="region">
              <SelectValue placeholder="აარჩიე" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GE">GE</SelectItem>
              <SelectItem value="EU">EU</SelectItem>
              <SelectItem value="RU">RU</SelectItem>
              <SelectItem value="MENA">MENA</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slots">ადგილების რაოდენობა</Label>
          <Input
            id="slots"
            name="slots"
            type="number"
            min={1}
            max={10}
            defaultValue={4}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="voice"
          name="voice"
          className="h-4 w-4 rounded border-border bg-background accent-primary"
        />
        <Label htmlFor="voice" className="font-normal">
          🎙 Voice chat აუცილებელია
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          გაუქმება
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          დაპოსტვა
        </Button>
      </div>
    </form>
  );
}
