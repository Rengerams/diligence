FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@11.28.5
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3100 \
    HOSTNAME=0.0.0.0 \
    DILIGENCE_DB_PATH=/app/data/diligence.db
RUN groupadd --system --gid 1001 nextjs \
    && useradd --system --uid 1001 --gid nextjs nextjs \
    && mkdir -p /app/data /app/backups \
    && chown -R nextjs:nextjs /app
COPY --from=build --chown=nextjs:nextjs /app/public ./public
COPY --from=build --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /app/.next/static ./.next/static
# Back-up- en restore-scripts, zodat je ze in de container kunt draaien zonder
# Node.js op de server zelf te installeren.
COPY --from=build --chown=nextjs:nextjs /app/scripts ./scripts
USER nextjs
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3100/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
