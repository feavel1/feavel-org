import { defineConfig } from 'jsrepo';

export default defineConfig({
    registries: ['@ieedan/shadcn-svelte-extras'],
    paths: {
        component: 'src/lib/ui',
        ui: 'src/lib/ui',
        lib: 'src/lib',
        hook: 'src/lib/hooks',
        util: 'src/lib/utils',
    },
});
