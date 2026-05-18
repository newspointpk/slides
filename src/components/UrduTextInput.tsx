interface UrduTextInputProps {
  value: string;
  onChange: (value: string) => void;
  multiLine?: boolean;
  useEnglishFont?: boolean;
}

const UrduTextInput = ({ value, onChange, multiLine = false, useEnglishFont = false }: UrduTextInputProps) => {
  const baseClasses = "w-full rounded-lg border border-border bg-card px-5 py-4 text-2xl text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20";
  
  const urduStyle = { fontFamily: "'Jameel Noori Nastaleeq', serif" };
  const englishStyle = { fontFamily: "'Arial', sans-serif", fontWeight: "bold" as const };
  const fontStyle = useEnglishFont ? englishStyle : urduStyle;
  const textDirection = useEnglishFont ? "ltr" : "rtl";
  const textAlign = useEnglishFont ? "text-left" : "text-right";
  const placeholder = useEnglishFont 
    ? (multiLine ? "Enter address here (press Enter for new line)" : "Enter text here")
    : (multiLine ? "یہاں ایڈریس لکھیں (نئی لائن کے لیے Enter دبائیں)" : "یہاں اردو سلائیڈ لکھیں");

  if (multiLine) {
    return (
      <div className="w-full max-w-2xl">
        <div className="relative">
          <textarea
            id="urdu-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            dir={textDirection}
            rows={2}
            className={`${baseClasses} ${textAlign} resize-none ${useEnglishFont ? "font-sans" : "font-nastaleeq"}`}
            style={fontStyle}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="relative">
        <input
          id="urdu-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          dir={textDirection}
          className={`${baseClasses} ${textAlign} ${useEnglishFont ? "font-sans" : "font-nastaleeq"}`}
          style={fontStyle}
        />
      </div>
    </div>
  );
};

export default UrduTextInput;
