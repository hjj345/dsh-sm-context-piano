import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";
//#region src/core/config.ts
const SETTINGS_NAMESPACE = "sm-context-piano";
const PIANO_LANGUAGE_IDS = [
	"zh",
	"en",
	"zh-TW"
];
const DEFAULT_SETTINGS = {
	language: "zh",
	enabled: true,
	keyHeight: 2,
	keyGap: 12,
	maxVisible: 20
};
const SETTINGS_LIMITS = {
	keyHeight: {
		min: 1,
		max: 4
	},
	keyGap: {
		min: 6,
		max: 18
	},
	maxVisible: {
		min: 5,
		max: 30
	}
};
const integer = (value, fallback, min, max) => {
	if (typeof value !== "number" || !Number.isInteger(value)) return fallback;
	return Math.max(min, Math.min(max, value));
};
function isPianoLanguage(value) {
	return typeof value === "string" && PIANO_LANGUAGE_IDS.includes(value);
}
function decodeSettings(value) {
	if (typeof value !== "object" || value === null) return void 0;
	const source = value;
	return {
		language: isPianoLanguage(source.language) ? source.language : DEFAULT_SETTINGS.language,
		enabled: typeof source.enabled === "boolean" ? source.enabled : DEFAULT_SETTINGS.enabled,
		keyHeight: integer(source.keyHeight, DEFAULT_SETTINGS.keyHeight, SETTINGS_LIMITS.keyHeight.min, SETTINGS_LIMITS.keyHeight.max),
		keyGap: integer(source.keyGap, DEFAULT_SETTINGS.keyGap, SETTINGS_LIMITS.keyGap.min, SETTINGS_LIMITS.keyGap.max),
		maxVisible: integer(source.maxVisible, DEFAULT_SETTINGS.maxVisible, SETTINGS_LIMITS.maxVisible.min, SETTINGS_LIMITS.maxVisible.max)
	};
}
function validateSettings(value) {
	const decoded = decodeSettings(value);
	if (decoded === void 0 || decoded.language !== value.language || decoded.enabled !== value.enabled || decoded.keyHeight !== value.keyHeight || decoded.keyGap !== value.keyGap || decoded.maxVisible !== value.maxVisible) throw new Error("invalid sm-context-piano settings");
}
//#endregion
//#region src/index.ts
const PianoSettingsSchema = z.object({
	language: z.union([
		z.const("zh"),
		z.const("en"),
		z.const("zh-TW")
	]).default(DEFAULT_SETTINGS.language),
	enabled: z.boolean().default(DEFAULT_SETTINGS.enabled),
	keyHeight: z.number().default(DEFAULT_SETTINGS.keyHeight),
	keyGap: z.number().default(DEFAULT_SETTINGS.keyGap),
	maxVisible: z.number().default(DEFAULT_SETTINGS.maxVisible)
});
function apply(ctx) {
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.settings.register(settingsNamespace(SETTINGS_NAMESPACE), PianoSettingsSchema, {
			applies: "live",
			validate: validateSettings
		});
	});
}
//#endregion
export { apply };
