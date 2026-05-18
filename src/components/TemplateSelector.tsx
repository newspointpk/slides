import { TEMPLATES } from "@/types/templates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TemplateSelectorProps {
  selectedTemplate: string;
  onSelect: (templateId: string) => void;
}

const TemplateSelector = ({ selectedTemplate, onSelect }: TemplateSelectorProps) => {
  const templates = Object.values(TEMPLATES);
  const currentTemplate = TEMPLATES[selectedTemplate];

  return (
    <div className="w-full max-w-md">
      <Select value={selectedTemplate} onValueChange={onSelect}>
        <SelectTrigger className="w-full bg-card border-border">
          <SelectValue>
            <div className="flex items-center gap-2">
              <span
                dir="rtl"
                style={{ fontFamily: "'Jameel Noori Nastaleeq', serif" }}
              >
                {currentTemplate?.nameUrdu}
              </span>
              <span className="text-xs text-muted-foreground">
                ({currentTemplate?.name})
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-card border-border z-50">
          {templates.map((template) => (
            <SelectItem
              key={template.id}
              value={template.id}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span
                  dir="rtl"
                  style={{ fontFamily: "'Jameel Noori Nastaleeq', serif" }}
                >
                  {template.nameUrdu}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({template.name})
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TemplateSelector;
