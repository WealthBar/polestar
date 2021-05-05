import Vue, { PluginFunction, VueConstructor } from 'vue';

declare const Vue_plugin: PluginFunction<any>;
export default Vue_plugin;

export const wfStep: VueConstructor<Vue>;
export const wfContainer: VueConstructor<Vue>;
