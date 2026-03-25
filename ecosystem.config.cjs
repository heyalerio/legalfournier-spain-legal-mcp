module.exports = {
  apps: [
    {
      name: "spain-legal",
      cwd: __dirname,
      script: "dist/index.js",
      args: "remote",
      env: {
        NODE_ENV: "production",
        LF_MCP_HOST: "127.0.0.1",
        LF_MCP_PORT: "3137",
        LF_MCP_PATH: "/mcp/spain-legal",
      },
    },
  ],
};
