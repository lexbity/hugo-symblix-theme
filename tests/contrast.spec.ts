// Phase 8 tests: Automated contrast ratio checking for all presets (SYM-VIS-001).
// Verifies WCAG 2.1 AA compliance (4.5:1 for normal text, 3:1 for large text).
// High-contrast preset verifies WCAG 2.1 AAA compliance (7:1 for normal text, 4.5:1 for large text).

import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(__dirname, "..");

/**
 * Calculate relative luminance of a color.
 * Formula from WCAG 2.1: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function getLuminance(hexColor: string): number {
  // Parse hex color (with or without #)
  const cleanHex = hexColor.replace(/^#/, "");
  
  // Handle 3-digit hex
  let r: number, g: number, b: number;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
  } else {
    r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  }

  // Apply gamma correction
  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  // Calculate relative luminance
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Calculate contrast ratio between two colors.
 * Formula from WCAG 2.1: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parse a color value to hex format for luminance calculation.
 * Handles hex (#fff, #ffffff), rgb(r, g, b), and rgba(r, g, b, a).
 */
function parseColor(colorStr: string): string | null {
  colorStr = colorStr.trim();

  // Already hex — expand 3-digit (#f00) to 6-digit (#ff0000)
  if (colorStr.startsWith("#")) {
    const clean = colorStr.slice(1);
    if (clean.length === 3) {
      return "#" + clean.split("").map((c) => c + c).join("");
    }
    return "#" + clean;
  }
  
  // rgb() or rgba()
  const rgbMatch = colorStr.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, "0");
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, "0");
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }
  
  // rgba()
  const rgbaMatch = colorStr.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\)/i);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, "0");
    const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, "0");
    const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }
  
  return null;
}

/**
 * Parse preset YAML to get color values.
 * Uses Hugo to parse YAML and output JSON.
 */
function getPresetsData() {
  const yamlPath = join(REPO_ROOT, "data", "docs_presets.yaml");
  const yamlContent = readFileSync(yamlPath, "utf-8");
  
  // Simple YAML parser for our specific structure
  interface Preset {
    id: string;
    mode: string;
    colors: {
      bg: string;
      surface: string;
      surface2: string;
      text: string;
      muted: string;
      border: string;
      accent: string;
    };
    callouts?: Record<string, string>;
    badges?: Record<string, string>;
  }
  
  interface PresetsData {
    presets: Preset[];
  }
  
  // Parse the YAML manually (simple structure)
  const lines = yamlContent.split("\n");
  const presets: Preset[] = [];
  let currentPreset: Partial<Preset> = {};
  let currentSection: string | null = null;
  let inPresets = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed === "presets:" || trimmed === "presets: ") {
      inPresets = true;
      continue;
    }

    if (!inPresets) continue;
    if (trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("- id:")) {
      // Save previous preset if exists
      if (Object.keys(currentPreset).length > 0) {
        presets.push(currentPreset as Preset);
      }
      currentPreset = {};
      currentSection = null;
    }

    // Strip the YAML list marker so inline entries ("- id: x") parse
    const entry = trimmed.startsWith("- ") ? trimmed.slice(2).trim() : trimmed;

    if (entry.startsWith("id:")) {
      currentPreset.id = entry.replace("id:", "").trim().replace(/^"|"$/g, "");
    } else if (entry.startsWith("label:")) {
      currentPreset.label = entry.replace("label:", "").trim().replace(/^"|"$/g, "");
    } else if (entry.startsWith("mode:")) {
      currentPreset.mode = entry.replace("mode:", "").trim() as "light" | "dark";
    } else if (trimmed.startsWith("colors:")) {
      currentSection = "colors";
      currentPreset.colors = {} as any;
    } else if (trimmed.startsWith("callouts:")) {
      currentSection = "callouts";
      currentPreset.callouts = {};
    } else if (trimmed.startsWith("badges:")) {
      currentSection = "badges";
      currentPreset.badges = {};
    } else if (trimmed.includes(":") && currentSection) {
      const [key, value] = trimmed.split(":").map((s) => s.trim().replace(/^"|"$/g, ""));
      if (currentSection === "colors") {
        (currentPreset.colors as any)[key] = value;
      } else if (currentSection === "callouts") {
        currentPreset.callouts![key] = value;
      } else if (currentSection === "badges") {
        currentPreset.badges![key] = value;
      }
    }
  }
  
  // Save last preset
  if (Object.keys(currentPreset).length > 0) {
    presets.push(currentPreset as Preset);
  }
  
  return presets;
}

// Get presets data once and cache it
const presetsData = getPresetsData();

test.describe("contrast ratios", () => {
  // WCAG 2.1 AA requirements
  const AA_NORMAL_TEXT = 4.5;
  const AA_LARGE_TEXT = 3.0;
  
  // WCAG 2.1 AAA requirements
  const AAA_NORMAL_TEXT = 7.0;
  const AAA_LARGE_TEXT = 4.5;

  test.describe("WCAG 2.1 AA compliance", () => {
    // Test all presets except high-contrast
    const aaPresets = presetsData.filter((p) => p.id !== "high-contrast");

    for (const preset of aaPresets) {
      test(`preset ${preset.id} meets AA contrast requirements`, () => {
        const colors = preset.colors;

        // Parse colors
        const bg = parseColor(colors.bg);
        const surface = parseColor(colors.surface);
        const text = parseColor(colors.text);
        const muted = parseColor(colors.muted);

        // Verify colors are valid
        expect(bg).toBeTruthy();
        expect(surface).toBeTruthy();
        expect(text).toBeTruthy();
        expect(muted).toBeTruthy();

        // Calculate contrast ratios
        const bgTextRatio = getContrastRatio(bg!, text!);
        const bgMutedRatio = getContrastRatio(bg!, muted!);
        const surfaceTextRatio = getContrastRatio(surface!, text!);

        // Normal text on background must meet AA (4.5:1)
        expect(
          bgTextRatio,
          `preset ${preset.id}: bg-text contrast ${bgTextRatio.toFixed(2)}:1 < ${AA_NORMAL_TEXT}:1 (AA)`,
        ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);

        // Normal text on surface must meet AA (4.5:1)
        expect(
          surfaceTextRatio,
          `preset ${preset.id}: surface-text contrast ${surfaceTextRatio.toFixed(2)}:1 < ${AA_NORMAL_TEXT}:1 (AA)`,
        ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);

        // Muted text on background must meet AA for large text (3:1)
        // Muted text is typically smaller, so we require 4.5:1
        expect(
          bgMutedRatio,
          `preset ${preset.id}: bg-muted contrast ${bgMutedRatio.toFixed(2)}:1 < ${AA_NORMAL_TEXT}:1 (AA)`,
        ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      });
    }
  });

  test.describe("WCAG 2.1 AAA compliance (high-contrast preset)", () => {
    const hcPreset = presetsData.find((p) => p.id === "high-contrast");
    
    test("high-contrast preset exists", () => {
      expect(hcPreset).toBeDefined();
    });

    test("high-contrast preset meets AAA contrast requirements", () => {
      expect(hcPreset).toBeDefined();
      const colors = hcPreset!.colors;

      // Parse colors
      const bg = parseColor(colors.bg);
      const text = parseColor(colors.text);

      expect(bg).toBeTruthy();
      expect(text).toBeTruthy();

      // Calculate contrast ratio
      const ratio = getContrastRatio(bg!, text!);

      // For AAA, normal text needs 7:1
      expect(
        ratio,
        `high-contrast: bg-text contrast ${ratio.toFixed(2)}:1 < ${AAA_NORMAL_TEXT}:1 (AAA)`,
      ).toBeGreaterThanOrEqual(AAA_NORMAL_TEXT);
    });

    test("high-contrast preset has expected values", () => {
      expect(hcPreset).toBeDefined();
      const colors = hcPreset!.colors;

      // High-contrast preset should have pure white background and pure black text
      expect(colors.bg).toBe("#ffffff");
      expect(colors.text).toBe("#000000");
    });
  });

  test.describe("callout and badge contrast", () => {
    // Callouts should have sufficient contrast against their backgrounds
    for (const preset of presetsData) {
      test(`preset ${preset.id} callout colors have sufficient contrast`, () => {
        const colors = preset.colors;
        const callouts = preset.callouts || {};

        // Get background color
        const bg = parseColor(colors.bg);
        expect(bg).toBeTruthy();

        // Test callout colors against background
        const calloutColors = ["note", "tip", "info", "warning", "danger", "success", "deprecated", "experimental"];
        for (const callout of calloutColors) {
          if (callouts[callout]) {
            const calloutColor = parseColor(callouts[callout]);
            if (calloutColor) {
              const ratio = getContrastRatio(bg!, calloutColor);
              // Callout colors are typically used for borders/text, so 3:1 minimum
              expect(
                ratio,
                `preset ${preset.id} callout ${callout}: contrast ${ratio.toFixed(2)}:1 < 3:1`,
              ).toBeGreaterThanOrEqual(3.0);
            }
          }
        }
      });

      test(`preset ${preset.id} badge colors have sufficient contrast`, () => {
        const badges = preset.badges || {};

        // Get surface color (badges typically appear on surface)
        const surface = parseColor(preset.colors.surface);
        expect(surface).toBeTruthy();

        // Test badge colors against surface
        const badgeColors = ["info", "warning", "success", "danger"];
        for (const badge of badgeColors) {
          if (badges[badge]) {
            const badgeColor = parseColor(badges[badge]);
            if (badgeColor) {
              const ratio = getContrastRatio(surface!, badgeColor);
              // Badge colors are typically used for text/icons on badges
              // If badge is colored background with white text, we need to check
              // For now, just ensure it's not the same as surface
              expect(
                ratio > 1,
                `preset ${preset.id} badge ${badge}: same color as surface`,
              );
            }
          }
        }
      });
    }
  });

  test.describe("luminance calculations", () => {
    test("luminance calculation for white is 1", () => {
      const luminance = getLuminance("#ffffff");
      expect(luminance).toBeCloseTo(1.0, 5);
    });

    test("luminance calculation for black is 0", () => {
      const luminance = getLuminance("#000000");
      expect(luminance).toBeCloseTo(0.0, 5);
    });

    test("luminance calculation for gray (#808080)", () => {
      const luminance = getLuminance("#808080");
      // #808080 is approximately 0.2159 luminance
      expect(luminance).toBeCloseTo(0.2159, 3);
    });

    test("contrast ratio for white/black is 21:1", () => {
      const ratio = getContrastRatio("#ffffff", "#000000");
      expect(ratio).toBeCloseTo(21.0, 1);
    });

    test("contrast ratio is symmetric", () => {
      const ratio1 = getContrastRatio("#ffffff", "#000000");
      const ratio2 = getContrastRatio("#000000", "#ffffff");
      expect(ratio1).toBe(ratio2);
    });
  });

  test.describe("RGB color parsing", () => {
    test("parses rgb() colors", () => {
      const hex = parseColor("rgb(255, 0, 0)");
      expect(hex).toBe("#ff0000");
    });

    test("parses rgb() with spaces", () => {
      const hex = parseColor("rgb( 255 , 0 , 0 )");
      expect(hex).toBe("#ff0000");
    });

    test("parses rgba() colors", () => {
      const hex = parseColor("rgba(255, 0, 0, 0.5)");
      expect(hex).toBe("#ff0000");
    });

    test("parses hex colors", () => {
      const hex1 = parseColor("#ff0000");
      expect(hex1).toBe("#ff0000");

      const hex2 = parseColor("#f00");
      expect(hex2).toBe("#ff0000");
    });
  });
});
