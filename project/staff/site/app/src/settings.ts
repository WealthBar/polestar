
export type settingsType = {
  projectName: string;
};

export const settings = {
  projectName: 'ws',
};

export const vSettings = {
  install(vue: any, options: any) {
    vue.mixin({
      computed: {
        $settings() {
          return settings;
        },
      },
    });
  },
};

