.PHONY: dev deploy-staging deploy-prod dry-run query-top query-top-all

WRANGLER := npx wrangler

dev:
	$(WRANGLER) dev

# Deploy the preview/staging Worker (bound to test.enix.one, ORIGIN_URL var).
deploy-staging:
	$(WRANGLER) deploy --env staging

# Deploy the production Worker (bound to github-code-review-notifier.enix.one, ORIGIN_URL var).
deploy-prod:
	$(WRANGLER) deploy

# Heaviest repos over the last 30 days (from the persistent D1 counter table).
query-top:
	$(WRANGLER) d1 execute github-webhook-filter --remote --command \
	"SELECT repo, SUM(count) AS total FROM hits WHERE day >= date('now','-30 days') GROUP BY repo ORDER BY total DESC LIMIT 20;"

# Per-repo breakdown by action over the last 30 days.
query-top-all:
	$(WRANGLER) d1 execute github-webhook-filter --remote --command \
	"SELECT repo, action, SUM(count) AS total FROM hits WHERE day >= date('now','-30 days') GROUP BY repo, action ORDER BY total DESC LIMIT 40;"

# Validate the bundle and config without deploying.
dry-run:
	$(WRANGLER) deploy --dry-run --outdir dist/
