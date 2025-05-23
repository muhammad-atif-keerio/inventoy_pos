/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    typescript: {
        // Warning: This allows production builds to successfully complete even if
        // your project has TypeScript errors.
        ignoreBuildErrors: true,
    },
    // Enable production optimizations
    reactStrictMode: true,
    productionBrowserSourceMaps: false, // Disable source maps in production for better performance

    // Ensure trailing slashes on all URLs
    trailingSlash: true,

    // Cache optimization
    onDemandEntries: {
        maxInactiveAge: 60 * 60 * 1000, // 1 hour
        pagesBufferLength: 5,
    },

    // Image optimization
    images: {
        formats: ["image/avif", "image/webp"],
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**",
            },
        ],
    },

    // Outputting static files for better performance
    output: process.env.NODE_ENV === "production" ? "standalone" : undefined,

    // Moved from experimental to root level
    outputFileTracingRoot:
        process.env.NODE_ENV === "production" ? __dirname : undefined,

    // Experimental features
    experimental: {
        // Enable server actions with the updated object format
        serverActions: {
            enabled: true,
        },
    },

    // Add a custom webpack config to optimize the build
    webpack: (config, { isServer }) => {
        // Optimize the build for production
        if (!isServer) {
            config.optimization.splitChunks = {
                chunks: "all",
                cacheGroups: {
                    default: false,
                    vendors: false,
                    commons: {
                        name: "commons",
                        chunks: "all",
                        minChunks: 2,
                    },
                    react: {
                        name: "react",
                        chunks: "all",
                        test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                    },
                },
            };
        }
        return config;
    },
};

module.exports = nextConfig;
