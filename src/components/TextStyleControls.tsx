import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export interface TextStyleOptions {
  textColor: "white" | "black";
  fontWeight: "bold" | "extrabold";
  shadowStrength: number; // fixed at 25 for all templates
  outlineEnabled: boolean;
  outlineWidth: number; // 1-5
  letterSpacing: number; // 0-20 (pixels)
}

interface TextStyleControlsProps {
  options: TextStyleOptions;
  onChange: (options: TextStyleOptions) => void;
}

const TextStyleControls = ({ options, onChange }: TextStyleControlsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full max-w-md">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent">
          <span className="text-sm font-medium text-foreground">Text Style</span>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="space-y-4">
            {/* Text Color Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="text-color" className="text-sm text-muted-foreground">
                Text Color
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Black</span>
                <Switch
                  id="text-color"
                  checked={options.textColor === "white"}
                  onCheckedChange={(checked) =>
                    onChange({ ...options, textColor: checked ? "white" : "black" })
                  }
                />
                <span className="text-xs text-muted-foreground">White</span>
              </div>
            </div>

            {/* Font Weight Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="font-weight" className="text-sm text-muted-foreground">
                Font Weight
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Bold</span>
                <Switch
                  id="font-weight"
                  checked={options.fontWeight === "extrabold"}
                  onCheckedChange={(checked) =>
                    onChange({ ...options, fontWeight: checked ? "extrabold" : "bold" })
                  }
                />
                <span className="text-xs text-muted-foreground">Extra Bold</span>
              </div>
            </div>

            {/* Letter/Character Spacing Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="letter-spacing" className="text-sm text-muted-foreground">
                  Character Spacing
                </Label>
                <span className="text-xs text-muted-foreground">{options.letterSpacing}px</span>
              </div>
              <Slider
                id="letter-spacing"
                min={0}
                max={20}
                step={1}
                value={[options.letterSpacing]}
                onValueChange={([value]) => onChange({ ...options, letterSpacing: value })}
              />
            </div>

            {/* Outline Toggle & Width */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="outline-enabled" className="text-sm text-muted-foreground">
                  Text Outline
                </Label>
                <Switch
                  id="outline-enabled"
                  checked={options.outlineEnabled}
                  onCheckedChange={(checked) => onChange({ ...options, outlineEnabled: checked })}
                />
              </div>

              {options.outlineEnabled && (
                <div className="space-y-2 pl-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="outline-width" className="text-xs text-muted-foreground">
                      Outline Width
                    </Label>
                    <span className="text-xs text-muted-foreground">{options.outlineWidth}px</span>
                  </div>
                  <Slider
                    id="outline-width"
                    min={1}
                    max={5}
                    step={1}
                    value={[options.outlineWidth]}
                    onValueChange={([value]) => onChange({ ...options, outlineWidth: value })}
                  />
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default TextStyleControls;
