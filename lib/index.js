import z from "@deepseek-ai/schemastery";
//#region src/core/config.ts
/** Keep this entry id aligned with the former settings namespace for DSH migration. */
const SETTINGS_ENTRY_ID = "sm-context-piano";
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
		max: 40
	}
};
//#endregion
//#region src/index.ts
const Config = z.object({
	language: z.union([
		z.const("zh"),
		z.const("en"),
		z.const("zh-TW")
	]).default(DEFAULT_SETTINGS.language).volatile(),
	enabled: z.boolean().default(DEFAULT_SETTINGS.enabled).volatile(),
	keyHeight: z.natural().min(SETTINGS_LIMITS.keyHeight.min).max(SETTINGS_LIMITS.keyHeight.max).step(1).default(DEFAULT_SETTINGS.keyHeight).volatile(),
	keyGap: z.natural().min(SETTINGS_LIMITS.keyGap.min).max(SETTINGS_LIMITS.keyGap.max).step(1).default(DEFAULT_SETTINGS.keyGap).volatile(),
	maxVisible: z.natural().min(SETTINGS_LIMITS.maxVisible.min).max(SETTINGS_LIMITS.maxVisible.max).step(1).default(DEFAULT_SETTINGS.maxVisible).volatile()
});
function apply(ctx) {
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber), `sm-context-piano:${SETTINGS_ENTRY_ID}: custom settings page`);
	});
}
//#endregion
export { Config, apply };
