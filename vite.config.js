import { visualizer } from 'rollup-plugin-visualizer';

module.exports = {
  base: process.env.NODE_ENV === 'production'
    ? './assets'
    : '/',
	build: {
		rollupOptions: {
			plugins: [
				visualizer({
					open: true,
					// template: "network",
					gzipSize: true,
					brotliSize: true
				})
			],
		},
	},
}