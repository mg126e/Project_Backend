FROM denoland/deno:2.5.5

USER deno
WORKDIR /app

EXPOSE 10000

# Copy source
COPY --chown=deno:deno . .

# Generate concepts.ts and syncs.ts (must be BEFORE cache)
RUN deno task build --allow-read --allow-write

# Pre-cache application (after build)
RUN deno cache src/main.ts

CMD ["deno", "task", "start"]
