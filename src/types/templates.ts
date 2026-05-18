import type { TextStyleOptions } from "@/components/TextStyleControls";

export interface TemplateConfig {
  id: string;
  name: string;
  nameUrdu: string;
  canvasWidth: number;
  canvasHeight: number;
  textFromLeft: number;
  textFromRight: number;
  textFromTop: number;
  textFromBottom: number;
  maxFontSize?: number; // undefined means auto-fit to text area
  multiLine?: boolean; // supports line breaks (for stacked text like city/country)
  fontFamily?: string; // custom font family (default: Jameel Noori Nastaleeq)
  lineSpacing?: number; // custom line spacing in pixels (default: uses font size)
  letterSpacing?: number; // custom letter spacing in pixels (default: uses font size)
  defaultStyle: Partial<TextStyleOptions>;
}

export const TEMPLATES: Record<string, TemplateConfig> = {
  default: {
    id: "default",
    name: "Default Slide",
    nameUrdu: "ڈیفالٹ سلائڈ",
    canvasWidth: 1920,
    canvasHeight: 1080,
    textFromLeft: 209,
    textFromRight: 483,
    textFromTop: 830,
    textFromBottom: 162,
    maxFontSize: 54,
    defaultStyle: {
      textColor: "white",
      fontWeight: "bold",
      shadowStrength: 25,
      outlineEnabled: false,
    },
  },
  addressBar: {
    id: "addressBar",
    name: "Address Bar (Urdu)",
    nameUrdu: "ایڈریس بار (اردو)",
    canvasWidth: 1920,
    canvasHeight: 1080,
    textFromLeft: 127,
    textFromRight: 1570,
    textFromTop: 69,
    textFromBottom: 955,
    maxFontSize: 40,
    defaultStyle: {
      textColor: "white",
      fontWeight: "bold",
      shadowStrength: 25,
      outlineEnabled: false,
    },
  },
  addressBarEnglish: {
    id: "addressBarEnglish",
    name: "Address Bar (English)",
    nameUrdu: "ایڈریس بار (انگریزی)",
    canvasWidth: 1920,
    canvasHeight: 1080,
    textFromLeft: 127,
    textFromRight: 1570,
    textFromTop: 69,
    textFromBottom: 955,
    maxFontSize: 28,
    multiLine: true,
    fontFamily: "Arial",
    lineSpacing: 1,
    defaultStyle: {
      textColor: "white",
      fontWeight: "bold",
      shadowStrength: 25,
      outlineEnabled: false,
      letterSpacing: 2,
    },
  },
  nameBand: {
    id: "nameBand",
    name: "Name Band",
    nameUrdu: "نام بینڈ",
    canvasWidth: 1920,
    canvasHeight: 1080,
    textFromLeft: 1212,
    textFromRight: 396,
    textFromTop: 771,
    textFromBottom: 258,
    defaultStyle: {
      textColor: "white",
      fontWeight: "bold",
      shadowStrength: 25,
      outlineEnabled: false,
    },
  },
  dateBand: {
    id: "dateBand",
    name: "Date Band",
    nameUrdu: "تاریخ بینڈ",
    canvasWidth: 1920,
    canvasHeight: 1080,
    textFromLeft: 206,
    textFromRight: 1506,
    textFromTop: 740,
    textFromBottom: 258,
    fontFamily: "Arial",
    defaultStyle: {
      textColor: "white",
      fontWeight: "bold",
      shadowStrength: 25,
      outlineEnabled: false,
      letterSpacing: 2,
    },
  },
  reporterName: {
    id: "reporterName",
    name: "Reporter Name",
    nameUrdu: "نمائندہ نام",
    canvasWidth: 1920,
    canvasHeight: 1080,
    textFromLeft: 206,
    textFromRight: 1506,
    textFromTop: 740,
    textFromBottom: 258,
    defaultStyle: {
      textColor: "white",
      fontWeight: "bold",
      shadowStrength: 25,
      outlineEnabled: false,
    },
  },
  subtitleBand: {
    id: "subtitleBand",
    name: "Subtitle Band",
    nameUrdu: "سب ٹائٹل بینڈ",
    canvasWidth: 1920,
    canvasHeight: 1080,
    textFromLeft: 202,
    textFromRight: 733,
    textFromTop: 740,
    textFromBottom: 260,
    maxFontSize: 48,
    defaultStyle: {
      textColor: "white",
      fontWeight: "bold",
      shadowStrength: 25,
      outlineEnabled: false,
    },
  },
  promoBand: {
    id: "promoBand",
    name: "Promo Band",
    nameUrdu: "پرومو بینڈ",
    canvasWidth: 1920,
    canvasHeight: 1080,
    textFromLeft: 240,
    textFromRight: 842,
    textFromTop: 864,
    textFromBottom: 144,
    maxFontSize: 60,
    defaultStyle: {
      textColor: "white",
      fontWeight: "bold",
      shadowStrength: 25,
      outlineEnabled: false,
    },
  },
  paragraphText: {
    id: "paragraphText",
    name: "Paragraph Text",
    nameUrdu: "پیراگراف ٹیکسٹ",
    canvasWidth: 1920,
    canvasHeight: 1080,
    textFromLeft: 150,
    textFromRight: 150,
    textFromTop: 200,
    textFromBottom: 200,
    defaultStyle: {
      textColor: "white",
      fontWeight: "bold",
      shadowStrength: 25,
      outlineEnabled: false,
    },
  },
};

export const getTemplateTextArea = (template: TemplateConfig) => ({
  x: template.textFromLeft,
  y: template.textFromTop,
  width: template.canvasWidth - template.textFromLeft - template.textFromRight,
  height: template.canvasHeight - template.textFromTop - template.textFromBottom,
});
